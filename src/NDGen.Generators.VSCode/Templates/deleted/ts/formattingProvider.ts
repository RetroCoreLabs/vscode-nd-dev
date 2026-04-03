import * as vscode from 'vscode';

export function registerDocumentFormattingProvider(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('ndasm', {
            // Implementation will be added later
            provideDocumentFormattingEdits(document: vscode.TextDocument) {
                return [];
            }
        })
    );
} 