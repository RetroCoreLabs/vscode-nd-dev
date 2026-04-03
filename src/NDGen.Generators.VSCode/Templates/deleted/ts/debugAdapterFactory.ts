import * as vscode from 'vscode';

export class NdasmDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
    private launchedProcesses: Map<string, any> = new Map(); // To track processes by session id

    createDebugAdapterDescriptor(
        session: vscode.DebugSession,
        executable: vscode.DebugAdapterExecutable | undefined
    ): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {

        console.log(`NDASM Debug Adapter: Full session configuration:`);
        console.log(JSON.stringify(session.configuration, null, 2));

        // Check if we're debugging an assembly file
        if (session.configuration.sourceFile) {
            const sourceFile = session.configuration.sourceFile.toLowerCase();
            const isNdasmFile = sourceFile.endsWith('.asm') || sourceFile.endsWith('.s');
            
            if (!isNdasmFile && !sourceFile.includes('$')) {
                vscode.window.showErrorMessage(
                    "ND100 Debugger: Can only debug .asm or .s files. Attempted to debug: " + session.configuration.sourceFile
                );
                return undefined;  // Abort if not ndasm file
            }
        }

        if (session.configuration.request !== 'launch') {
            vscode.window.showErrorMessage(
                "ND100 Debugger: Only 'launch' request is supported. Your request: " + session.configuration.request
            );
            return undefined;  // Abort if not launch
        }

        const port = session.configuration.port ?? 4711;
        const autoLaunch = session.configuration.autoLaunch ?? false;

        const debuggerPath = vscode.workspace
            .getConfiguration('nd100')
            .get<string>('debuggerPath') ?? 'nd100x';

        const args = ['-d', `-p=${port}`];

        console.log(`NDASM Debug Adapter: Configuration:`);
        console.log(`Path: ${debuggerPath}`);
        console.log(`Args: ${args.join(' ')}`);
        console.log(`Port: ${port}`);
        console.log(`AutoLaunch: ${autoLaunch}`);

        if (autoLaunch) {
            console.log(`NDASM Debug Adapter: Auto-launching debugger process...`);
            const childProcess = require('child_process');
            const proc = childProcess.spawn(debuggerPath, args, { stdio: 'inherit' });

            // Track the process so we can clean up if needed
            this.launchedProcesses.set(session.id, proc);

            proc.on('exit', (code: number | null, signal: string | null) => {
                console.log(`NDASM Debug Adapter exited with code: ${code} and signal: ${signal}`);
                this.launchedProcesses.delete(session.id);
            });
        } else {
            console.log(`NDASM Debug Adapter: AutoLaunch is disabled. Expecting external process.`);
        }       

        // Return the DebugAdapterServer so VS Code connects via TCP
        return new vscode.DebugAdapterServer(port);
    }
} 