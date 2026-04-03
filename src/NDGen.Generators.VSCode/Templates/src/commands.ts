// Command registration for ND-100 Assembly
import * as vscode from 'vscode';
import { convertCase } from './utilities';

/**
 * Registers all commands for the extension
 */
export function registerCommands(context: vscode.ExtensionContext): void {
    // Register case conversion commands
    context.subscriptions.push(
        vscode.commands.registerCommand('ndasm.convertToUppercase', () => {
            convertCase(true);
        }),
        vscode.commands.registerCommand('ndasm.convertToLowercase', () => {
            convertCase(false);
        })
    );
} 