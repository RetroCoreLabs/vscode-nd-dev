// Task provider for ND-100 build tasks (compile, assemble, link, build, make, clean)
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface Nd100TaskDefinition extends vscode.TaskDefinition {
    action: 'compile' | 'assemble' | 'link' | 'build' | 'make' | 'clean';
    file?: string;
    output?: string;
    makeTarget?: string;
}

function getToolchainConfig() {
    const config = vscode.workspace.getConfiguration('nd100');
    return {
        compiler: config.get<string>('toolchain.compiler', 'nd100-nd-bsd-pcc'),
        assembler: config.get<string>('toolchain.assembler', 'nd100-as'),
        linker: config.get<string>('toolchain.linker', 'nd100-ld'),
        debugger: config.get<string>('toolchain.debugger', 'nd100x'),
        includePaths: config.get<string[]>('toolchain.includePaths', []),
        libraryPaths: config.get<string[]>('toolchain.libraryPaths', []),
        assemblerFlags: config.get<string>('toolchain.assemblerFlags', '-m'),
        compilerFlags: config.get<string>('toolchain.compilerFlags', '-xuchar'),
        linkerFlags: config.get<string>('toolchain.linkerFlags', ''),
        crt0Path: config.get<string>('toolchain.crt0Path', ''),
        libcPath: config.get<string>('toolchain.libcPath', ''),
        linkLibc: config.get<boolean>('toolchain.linkLibc', true),
    };
}

function buildIncludeFlags(includePaths: string[]): string {
    let flags = '';
    for (let i = 0; i < includePaths.length; i++) {
        flags += ` -I ${includePaths[i]}`;
    }
    return flags;
}

function buildLibraryFlags(libraryPaths: string[]): string {
    let flags = '';
    for (let i = 0; i < libraryPaths.length; i++) {
        flags += ` -L ${libraryPaths[i]}`;
    }
    return flags;
}

function buildLibcLinkArgs(tc: ReturnType<typeof getToolchainConfig>): string {
    if (!tc.linkLibc || !tc.libcPath) {
        return '';
    }
    const buildDir = path.join(tc.libcPath, 'build', 'crt');
    const libDir = path.join(tc.libcPath, 'lib');
    const runtimeObjs = ['crt0.o', 'csav.o', 'cret.o', '__lsh.o', '__rsh.o', '__ursh.o', 'cptr_add.o', 'cptr_sub.o'];
    let args = '';
    for (let i = 0; i < runtimeObjs.length; i++) {
        args += ` ${path.join(buildDir, runtimeObjs[i])}`;
    }
    args += ` -L ${libDir} -lc`;
    return args;
}

function buildCompileCommand(tc: ReturnType<typeof getToolchainConfig>, file: string, outputAsm: string): string {
    const includes = buildIncludeFlags(tc.includePaths);
    const flags = tc.compilerFlags ? ` ${tc.compilerFlags}` : '';
    // -g emits STABS debug info (line numbers, locals, params, functions)
    return `${tc.compiler} -S -g${flags}${includes} -o ${outputAsm} ${file}`;
}

function buildAssembleCommand(tc: ReturnType<typeof getToolchainConfig>, file: string, outputObj: string): string {
    // No -ag: PCC -g provides proper C-level STABS, assembler auto-STABS would conflict
    const flags = tc.assemblerFlags ? ` ${tc.assemblerFlags}` : '';
    return `${tc.assembler} -u${flags} -o ${outputObj} ${file}`;
}

function buildLinkCommand(tc: ReturnType<typeof getToolchainConfig>, objFile: string, outputExe: string): string {
    const libPaths = buildLibraryFlags(tc.libraryPaths);
    const libcArgs = buildLibcLinkArgs(tc);
    const crt0 = tc.crt0Path ? `${tc.crt0Path} ` : '';
    const flags = tc.linkerFlags ? ` ${tc.linkerFlags}` : '';
    // -m generates .map + .srcmap for debugging
    return `${tc.linker} -m -o ${outputExe} ${crt0}${objFile}${libcArgs}${libPaths}${flags}`;
}

class Nd100TaskProvider implements vscode.TaskProvider {
    static readonly type = 'nd100';

    provideTasks(token?: vscode.CancellationToken): vscode.ProviderResult<vscode.Task[]> {
        const tasks: vscode.Task[] = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return tasks;
        }

        const folder = workspaceFolders[0];
        const workspaceRoot = folder.uri.fsPath;

        // Always provide the standard build pipeline tasks
        const actions: Array<'compile' | 'assemble' | 'link' | 'build' | 'clean'> = ['compile', 'assemble', 'link', 'build', 'clean'];
        for (let i = 0; i < actions.length; i++) {
            const def: Nd100TaskDefinition = { type: Nd100TaskProvider.type, action: actions[i] };
            const t = this.createTaskFromDefinition(def);
            if (t) {
                tasks.push(t);
            }
        }

        // Check for Makefile - provide make tasks
        const makefilePath = path.join(workspaceRoot, 'Makefile');
        if (fs.existsSync(makefilePath)) {
            tasks.push(this.createMakeTask(folder, 'make', undefined));
            tasks.push(this.createMakeTask(folder, 'make clean', 'clean'));
            tasks.push(this.createMakeTask(folder, 'make test', 'test'));
        }

        return tasks;
    }

    resolveTask(task: vscode.Task, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.Task> {
        const definition = task.definition as Nd100TaskDefinition;
        if (!definition.action) {
            return undefined;
        }

        const resolved = this.createTaskFromDefinition(definition);
        return resolved;
    }

    private createMakeTask(folder: vscode.WorkspaceFolder, label: string, target: string | undefined): vscode.Task {
        const definition: Nd100TaskDefinition = {
            type: Nd100TaskProvider.type,
            action: 'make',
            makeTarget: target,
        };

        const cmd = target ? `make ${target}` : 'make';
        const execution = new vscode.ShellExecution(cmd);
        const task = new vscode.Task(
            definition,
            folder,
            label,
            'nd100',
            execution,
            ['$nd100-pcc', '$nd100-as', '$nd100-ld']
        );
        return task;
    }

    private createTaskFromDefinition(definition: Nd100TaskDefinition): vscode.Task | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return undefined;
        }
        const folder = workspaceFolders[0];
        const tc = getToolchainConfig();

        const file = definition.file || '${file}';
        const baseName = definition.output || '${fileBasenameNoExtension}';
        const dirName = '${fileDirname}';

        let execution: vscode.ShellExecution;
        let problemMatchers: string[];
        let label: string;

        switch (definition.action) {
            case 'compile': {
                const cmd = buildCompileCommand(tc, file, `${dirName}/${baseName}.s`);
                execution = new vscode.ShellExecution(cmd);
                problemMatchers = ['$nd100-pcc'];
                label = 'compile';
                break;
            }
            case 'assemble': {
                const cmd = buildAssembleCommand(tc, file, `${dirName}/${baseName}.o`);
                execution = new vscode.ShellExecution(cmd);
                problemMatchers = ['$nd100-as'];
                label = 'assemble';
                break;
            }
            case 'link': {
                const cmd = buildLinkCommand(tc, `${dirName}/${baseName}.o`, `${dirName}/${baseName}.out`);
                execution = new vscode.ShellExecution(cmd);
                problemMatchers = ['$nd100-ld'];
                label = 'link';
                break;
            }
            case 'build': {
                // Full pipeline: compile -> assemble -> link
                const compileCmd = buildCompileCommand(tc, file, `${dirName}/${baseName}.s`);
                const asmCmd = buildAssembleCommand(tc, `${dirName}/${baseName}.s`, `${dirName}/${baseName}.o`);
                const linkCmd = buildLinkCommand(tc, `${dirName}/${baseName}.o`, `${dirName}/${baseName}.out`);
                const fullCmd = `${compileCmd} && ${asmCmd} && ${linkCmd}`;
                execution = new vscode.ShellExecution(fullCmd);
                problemMatchers = ['$nd100-pcc', '$nd100-as', '$nd100-ld'];
                label = 'build';
                break;
            }
            case 'make': {
                const target = definition.makeTarget;
                const cmd = target ? `make ${target}` : 'make';
                execution = new vscode.ShellExecution(cmd);
                problemMatchers = ['$nd100-pcc', '$nd100-as', '$nd100-ld'];
                label = target ? `make ${target}` : 'make';
                break;
            }
            case 'clean': {
                execution = new vscode.ShellExecution('rm -f *.o *.out *.map *.srcmap');
                problemMatchers = [];
                label = 'clean';
                break;
            }
            default:
                return undefined;
        }

        const task = new vscode.Task(
            definition,
            folder,
            label,
            'nd100',
            execution,
            problemMatchers
        );
        return task;
    }
}

export function registerTaskProvider(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.tasks.registerTaskProvider(Nd100TaskProvider.type, new Nd100TaskProvider())
    );
}
