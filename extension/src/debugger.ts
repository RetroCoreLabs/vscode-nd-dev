// Consolidated debugger functionality for ND-100 Development extension
import * as vscode from 'vscode';
import * as childProcess from 'child_process';

// Helper to determine if a file is supported for debugging
function isSupportedFile(filename: string): boolean {
    if (!filename) { return false; }

    // Check if filename is a variable placeholder
    if (filename.includes("$")) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const activeFile = editor.document.fileName.toLowerCase();
            return activeFile.endsWith(".asm") || activeFile.endsWith(".s")
                || activeFile.endsWith(".c") || activeFile.endsWith(".h");
        }
        return false;
    }

    const lower = filename.toLowerCase();
    return lower.endsWith(".asm") || lower.endsWith(".s")
        || lower.endsWith(".c") || lower.endsWith(".h");
}

function isCFile(filename: string): boolean {
    if (!filename) { return false; }
    const lower = filename.toLowerCase();
    return lower.endsWith(".c") || lower.endsWith(".h");
}

// Debug Configuration Provider
export class NdasmDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

    // Provide initial configurations for "Add Configuration" button in launch.json
    provideDebugConfigurations(
        folder: vscode.WorkspaceFolder | undefined,
        token?: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DebugConfiguration[]> {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !isSupportedFile(editor.document.fileName)) {
            return [];
        }

        const activeFile = editor.document.fileName.toLowerCase();
        if (isCFile(activeFile)) {
            // C files use .srcmap (includes function names, parameters, locals)
            return [
                {
                    name: "Debug ND-100 C Program",
                    type: "ND-100 Assembly",
                    request: "launch",
                    program: "${fileDirname}/${fileBasenameNoExtension}.out",
                    mapFile: "${fileDirname}/${fileBasenameNoExtension}.srcmap",
                    sourceFile: "${file}",
                    sourcePaths: ["${workspaceFolder}"],
                    autoLaunch: true,
                    port: 4711,
                    stopOnEntry: true,
                    preLaunchTask: "nd100: build"
                }
            ];
        }

        // Assembly files use .map (line-to-address only)
        return [
            {
                name: "Debug ND-100 Assembly",
                type: "ND-100 Assembly",
                request: "launch",
                program: "${fileDirname}/${fileBasenameNoExtension}.out",
                mapFile: "${fileDirname}/${fileBasenameNoExtension}.map",
                sourceFile: "${file}",
                autoLaunch: true,
                port: 4711,
                stopOnEntry: true
            }
        ];
    }

    // Resolve/finalize configuration before launch
    resolveDebugConfiguration(
        folder: vscode.WorkspaceFolder | undefined,
        config: vscode.DebugConfiguration,
        token?: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DebugConfiguration> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No file is open to debug.');
            return undefined;
        }

        const activeFileName = editor.document.fileName.toLowerCase();
        if (!isSupportedFile(activeFileName)) {
            vscode.window.showInformationMessage('The ND-100 debugger works with .c, .asm, or .s files.');
            return undefined;
        }

        // If launch.json is missing or empty, provide smart defaults
        if (!config.type && !config.request && !config.name) {
            config.type = "ND-100 Assembly";
            config.name = "Debug ND-100 File";
            config.request = "launch";
            config.program = "${fileDirname}/${fileBasenameNoExtension}.out";
            config.sourceFile = "${file}";
            config.autoLaunch = true;

            if (isCFile(activeFileName)) {
                // C files use .srcmap (function names, params, locals)
                config.mapFile = "${fileDirname}/${fileBasenameNoExtension}.srcmap";
                config.preLaunchTask = "nd100: build";
                config.stopOnEntry = false;
            } else {
                // Assembly files use .map (line-to-address)
                config.mapFile = "${fileDirname}/${fileBasenameNoExtension}.map";
                config.stopOnEntry = true;
            }
        }

        if (!config.program) {
            vscode.window.showErrorMessage("No program specified for ND-100 debug session.");
            return undefined;
        }

        // Auto-populate sourcePaths for multi-file debugging
        if (!config.sourcePaths || config.sourcePaths.length === 0) {
            const sourcePaths: string[] = [];

            // Always include workspace folder
            if (folder) {
                sourcePaths.push(folder.uri.fsPath);
            }

            // Include active file's directory
            if (editor) {
                const path = require('path');
                const fileDir = path.dirname(editor.document.fileName);
                if (sourcePaths.indexOf(fileDir) === -1) {
                    sourcePaths.push(fileDir);
                }
            }

            // If linking against libc, add libc source directories
            const toolConfig = vscode.workspace.getConfiguration('nd100');
            const libcPath = toolConfig.get<string>('toolchain.libcPath', '');
            const linkLibc = toolConfig.get<boolean>('toolchain.linkLibc', true);

            if (libcPath && linkLibc) {
                const path = require('path');
                sourcePaths.push(libcPath);
                sourcePaths.push(path.join(libcPath, 'src'));
                sourcePaths.push(path.join(libcPath, 'build', 'crt'));
            }

            // Add include paths as potential source locations
            const includePaths = toolConfig.get<string[]>('toolchain.includePaths', []);
            for (let i = 0; i < includePaths.length; i++) {
                if (sourcePaths.indexOf(includePaths[i]) === -1) {
                    sourcePaths.push(includePaths[i]);
                }
            }

            if (sourcePaths.length > 0) {
                config.sourcePaths = sourcePaths;
            }
        }

        console.log("FINAL CONFIG:", JSON.stringify(config, null, 2));
        return config;
    }
}

// Debug Adapter Factory
export class NdasmDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
    private launchedProcesses: Map<string, any> = new Map();

    createDebugAdapterDescriptor(
        session: vscode.DebugSession,
        executable: vscode.DebugAdapterExecutable | undefined
    ): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {

        console.log(`NDASM Debug Adapter: Full session configuration:`);
        console.log(JSON.stringify(session.configuration, null, 2));

        // Check if we're debugging a supported file
        if (session.configuration.sourceFile) {
            const sourceFile = session.configuration.sourceFile.toLowerCase();
            if (!isSupportedFile(sourceFile) && !sourceFile.includes('$')) {
                vscode.window.showErrorMessage(
                    "ND100 Debugger: Can only debug .c, .asm, or .s files. Attempted to debug: " + session.configuration.sourceFile
                );
                return undefined;
            }
        }

        if (session.configuration.request !== 'launch') {
            vscode.window.showErrorMessage(
                "ND100 Debugger: Only 'launch' request is supported. Your request: " + session.configuration.request
            );
            return undefined;
        }

        const config = vscode.workspace.getConfiguration('nd100');
        const defaultPort = config.get<number>('toolchain.dapPort', 4711);
        const port = session.configuration.port ?? defaultPort;
        const autoLaunch = session.configuration.autoLaunch ?? false;

        const debuggerPath = config.get<string>('toolchain.debugger', 'nd100x');

        // nd100x in DAP mode just listens for connections.
        // VS Code sends the launch request with program/sourceFile/mapFile over DAP.
        const args = ['-d', '-p', String(port)];

        console.log(`ND-100 Debug Adapter: Configuration:`);
        console.log(`Path: ${debuggerPath}`);
        console.log(`Args: ${args.join(' ')}`);
        console.log(`Port: ${port}`);
        console.log(`AutoLaunch: ${autoLaunch}`);

        if (autoLaunch) {
            const cmdLine = `${debuggerPath} ${args.join(' ')}`;
            console.log(`ND-100 Debug Adapter: Launching: ${cmdLine}`);
            vscode.window.showInformationMessage(`ND-100: Launching ${cmdLine}`);

            return new Promise<vscode.DebugAdapterDescriptor>((resolve) => {
                try {
                    const proc = childProcess.spawn(debuggerPath, args, {
                        stdio: ['ignore', 'pipe', 'pipe']
                    });

                    this.launchedProcesses.set(session.id, proc);
                    let resolved = false;

                    // Watch stdout for the "listening" message
                    if (proc.stdout) {
                        proc.stdout.on('data', (data: Buffer) => {
                            const text = data.toString();
                            console.log(`nd100x: ${text}`);
                            if (!resolved && text.includes('listening')) {
                                resolved = true;
                                resolve(new vscode.DebugAdapterServer(port));
                            }
                        });
                    }

                    if (proc.stderr) {
                        proc.stderr.on('data', (data: Buffer) => {
                            console.log(`nd100x stderr: ${data.toString()}`);
                        });
                    }

                    proc.on('error', (err: Error) => {
                        const msg = `Failed to launch nd100x: ${err.message}. Check nd100.toolchain.debugger setting.`;
                        console.error(msg);
                        vscode.window.showErrorMessage(msg);
                        this.launchedProcesses.delete(session.id);
                        if (!resolved) {
                            resolved = true;
                            resolve(new vscode.DebugAdapterServer(port));
                        }
                    });

                    proc.on('exit', (code: number | null, signal: string | null) => {
                        console.log(`nd100x exited: code=${code} signal=${signal}`);
                        if (code !== 0 && code !== null) {
                            vscode.window.showWarningMessage(`nd100x exited with code ${code}`);
                        }
                        this.launchedProcesses.delete(session.id);
                        if (!resolved) {
                            resolved = true;
                            resolve(new vscode.DebugAdapterServer(port));
                        }
                    });

                    // Fallback timeout in case the listening message never comes
                    setTimeout(() => {
                        if (!resolved) {
                            console.log('nd100x: timeout waiting for listening message, connecting anyway');
                            resolved = true;
                            resolve(new vscode.DebugAdapterServer(port));
                        }
                    }, 10000);

                } catch (err: any) {
                    const msg = `Failed to spawn nd100x: ${err.message}`;
                    console.error(msg);
                    vscode.window.showErrorMessage(msg);
                    resolve(new vscode.DebugAdapterServer(port));
                }
            });
        } else {
            console.log(`NDASM Debug Adapter: AutoLaunch is disabled. Expecting external process.`);
        }

        return new vscode.DebugAdapterServer(port);
    }
}

// Register all debug-related functionality
export function registerDebugFeatures(context: vscode.ExtensionContext) {
    const configProvider = new NdasmDebugConfigurationProvider();
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider(
            'ND-100 Assembly',
            configProvider,
            vscode.DebugConfigurationProviderTriggerKind.Dynamic
        )
    );

    context.subscriptions.push(
        vscode.debug.registerDebugAdapterTrackerFactory('ND-100 Assembly', {
            createDebugAdapterTracker(session) {
                return {
                    onWillReceiveMessage: m => {
                        console.log(`-> TO ADAPTER: ${JSON.stringify(m)}`);
                    },
                    onDidSendMessage: m => {
                        console.log(`<- FROM ADAPTER: ${JSON.stringify(m)}`);
                    }
                };
            }
        })
    );

    const factory = new NdasmDebugAdapterDescriptorFactory();
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterDescriptorFactory('ND-100 Assembly', factory)
    );

    context.subscriptions.push(
        vscode.debug.onDidStartDebugSession(session => {
            console.log(`Debug session started: ${session.type}`);
        }),
        vscode.debug.onDidTerminateDebugSession(session => {
            console.log(`Debug session terminated: ${session.type}`);
        }),
        vscode.debug.onDidChangeBreakpoints(event => {
            console.log(`Breakpoints changed:`, event);
        })
    );
}
