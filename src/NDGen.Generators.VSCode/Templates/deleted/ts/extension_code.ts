// Main extension file for ND-100 Assembly Language Support
import * as vscode from 'vscode';
import { instructionData, registerData } from './generatedData';
import { NdasmDebugConfigurationProvider } from './debugConfigurationProvider';
import { NdasmDebugAdapterDescriptorFactory } from './debugAdapterFactory';
import { registerHoverProvider } from './hoverProvider';
import { registerCompletionProvider } from './completionProvider';
import { registerSignatureHelpProvider } from './signatureHelpProvider';
import { registerInlayHintsProvider } from './inlayHintsProvider';
import { registerDocumentFormattingProvider } from './formattingProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('ND-100 Assembly Language Extension is now active');
    
    // Register language providers
    registerHoverProvider(context, instructionData, registerData);
    registerCompletionProvider(context);
    registerSignatureHelpProvider(context);
    registerInlayHintsProvider(context);
    registerDocumentFormattingProvider(context);
    
    // Register debug functionality
    const configProvider = new NdasmDebugConfigurationProvider();
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider(
            'ND-100 Assembly',
            configProvider,
            vscode.DebugConfigurationProviderTriggerKind.Dynamic
        )
    );
    
    // Register a debug adapter tracker for logging
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterTrackerFactory('ND-100 Assembly', {
            createDebugAdapterTracker(session) {
                return {
                    onWillReceiveMessage: m => {
                        console.log(`→ TO ADAPTER: ${JSON.stringify(m)}`);
                    },
                    onDidSendMessage: m => {
                        console.log(`← FROM ADAPTER: ${JSON.stringify(m)}`);
                    }
                };
            }
        })
    );
    
    // Register the debug adapter factory
    const factory = new NdasmDebugAdapterDescriptorFactory();
    context.subscriptions.push(
        vscode.debug.registerDebugAdapterDescriptorFactory('ND-100 Assembly', factory)
    );
    
    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('ndasm.convertToUppercase', () => {
            convertCase(true);
        }),
        vscode.commands.registerCommand('ndasm.convertToLowercase', () => {
            convertCase(false);
        })
    );
    
    // Listen for debug session events
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

export function deactivate() {
    // Clean up any resources here
    console.log('ND-100 Assembly Language Extension is now deactivated');
}

// Helper function for case conversion commands
function convertCase(toUppercase: boolean) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const document = editor.document;
    const edits: vscode.TextEdit[] = [];
    
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const text = line.text;
        
        if (text.trim() === '' || text.trim().startsWith(';') || text.trim().startsWith('%') || text.trim().startsWith('#')) continue;
        
        const words = text.match(/\b[A-Za-z]+\b/g);
        if (!words) continue;
        
        let currentText = text;
        
        for (const word of words) {
            const upperWord = word.toUpperCase();
            
            if (instructionData[upperWord] || registerData[upperWord]) {
                const index = currentText.indexOf(word);
                
                if (index !== -1) {
                    const range = new vscode.Range(
                        new vscode.Position(i, index),
                        new vscode.Position(i, index + word.length)
                    );
                    const newWord = toUppercase ? word.toUpperCase() : word.toLowerCase();
                    edits.push(vscode.TextEdit.replace(range, newWord));
                    currentText = currentText.substring(0, index) + newWord + currentText.substring(index + word.length);
                }
            }
        }
    }
    
    if (edits.length > 0) {
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(document.uri, edits);
        vscode.workspace.applyEdit(workspaceEdit);
    }
}
