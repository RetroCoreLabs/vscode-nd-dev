import * as vscode from 'vscode';

export function registerSignatureHelpProvider(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerSignatureHelpProvider('ndasm', {
            // Implementation will be added later
            provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position) {
                return null;
            }
        })
    );
} 