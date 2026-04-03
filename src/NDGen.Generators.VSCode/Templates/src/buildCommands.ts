// Build command handlers for ND-100 compile/assemble/link/build/clean
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as childProcess from 'child_process';

function getActiveFile(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No file is open.');
        return undefined;
    }
    return editor.document.fileName;
}

function checkToolExists(tool: string): boolean {
    try {
        // If tool is an absolute path, check if it exists directly
        if (tool.startsWith('/') || tool.startsWith('./')) {
            const fs = require('fs');
            return fs.existsSync(tool);
        }
        childProcess.execSync(`command -v ${tool}`, { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

function executeTask(action: string, file?: string): void {
    const definition: vscode.TaskDefinition = {
        type: 'nd100',
        action: action,
    };
    if (file) {
        definition.file = file;
    }

    // Use the task provider to resolve and execute
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder open.');
        return;
    }

    const config = vscode.workspace.getConfiguration('nd100');

    let toolName: string;
    switch (action) {
        case 'compile':
            toolName = config.get<string>('toolchain.compiler', 'nd100-nd-bsd-pcc');
            break;
        case 'assemble':
            toolName = config.get<string>('toolchain.assembler', 'nd100-as');
            break;
        case 'link':
            toolName = config.get<string>('toolchain.linker', 'nd100-ld');
            break;
        case 'build':
            toolName = config.get<string>('toolchain.compiler', 'nd100-nd-bsd-pcc');
            break;
        default:
            toolName = '';
    }

    if (toolName && !checkToolExists(toolName)) {
        vscode.window.showWarningMessage(
            `Tool '${toolName}' not found in PATH. The task may fail. Configure tool paths in ND-100: Toolchain Settings.`
        );
    }

    // Fetch and execute through VS Code task system
    vscode.commands.executeCommand('workbench.action.tasks.runTask', `nd100: ${action}`);
}

export function registerBuildCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('nd100.compile', () => {
            const file = getActiveFile();
            if (!file) { return; }
            if (!file.endsWith('.c')) {
                vscode.window.showErrorMessage('ND-100: Compile requires a .c file.');
                return;
            }
            executeTask('compile', file);
        }),

        vscode.commands.registerCommand('nd100.assemble', () => {
            const file = getActiveFile();
            if (!file) { return; }
            const lower = file.toLowerCase();
            if (!lower.endsWith('.s') && !lower.endsWith('.asm')) {
                vscode.window.showErrorMessage('ND-100: Assemble requires a .s or .asm file.');
                return;
            }
            executeTask('assemble', file);
        }),

        vscode.commands.registerCommand('nd100.link', () => {
            const file = getActiveFile();
            if (!file) { return; }
            executeTask('link', file);
        }),

        vscode.commands.registerCommand('nd100.build', () => {
            const file = getActiveFile();
            if (!file) { return; }

            const lower = file.toLowerCase();
            if (lower.endsWith('.c')) {
                // Full pipeline: compile -> assemble -> link
                executeTask('build', file);
            } else if (lower.endsWith('.s') || lower.endsWith('.asm')) {
                // Assembly only: assemble -> link
                executeTask('assemble', file);
            } else {
                // Check for Makefile
                const dir = path.dirname(file);
                if (fs.existsSync(path.join(dir, 'Makefile'))) {
                    executeTask('make');
                } else {
                    vscode.window.showErrorMessage('ND-100: Build requires a .c, .s, or .asm file, or a Makefile.');
                }
            }
        }),

        vscode.commands.registerCommand('nd100.clean', () => {
            const file = getActiveFile();
            if (!file) {
                return;
            }
            const dir = path.dirname(file);
            if (fs.existsSync(path.join(dir, 'Makefile'))) {
                executeTask('make', undefined);
                // Also run make clean via task
                vscode.commands.executeCommand('workbench.action.tasks.runTask', 'nd100: make clean');
            } else {
                executeTask('clean');
            }
        })
    );
}
