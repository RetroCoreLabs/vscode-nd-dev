import * as vscode from 'vscode';

export function registerCompletionProvider(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider('ndasm', {
            // Implementation will be added later
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                return [];
            }
        })
    );
} 