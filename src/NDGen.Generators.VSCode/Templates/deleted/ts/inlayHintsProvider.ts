import * as vscode from 'vscode';

export function registerInlayHintsProvider(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerInlayHintsProvider('ndasm', {
            // Implementation will be added later
            provideInlayHints(document: vscode.TextDocument, range: vscode.Range) {
                return [];
            }
        })
    );
} 