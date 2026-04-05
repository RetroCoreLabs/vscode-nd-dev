// Formatting provider for ND-100 Assembly
import * as vscode from 'vscode';
import { instructionData, registerData } from '../generated/generatedData';

/**
 * Registers the document formatting provider for ND-100 Assembly
 */
export function registerDocumentFormattingProvider(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('ndasm', {
            provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
                const edits: vscode.TextEdit[] = [];
                const config = vscode.workspace.getConfiguration('ndasm');
                const formatCase = config.get('formatCase', 'none'); // none, upper, lower
                
                // Skip formatting if no case format is set
                if (formatCase === 'none') {
                    return edits;
                }
                
                for (let i = 0; i < document.lineCount; i++) {
                    const line = document.lineAt(i);
                    const text = line.text;
                    
                    // Skip comments and empty lines
                    if (text.trim() === '' || text.trim().startsWith(';')) {
                        continue;
                    }
                    
                    // Match instructions and registers
                    const words = text.match(/\b[A-Za-z]+\b/g);
                    if (!words) continue;
                    
                    for (const word of words) {
                        const upperWord = word.toUpperCase();
                        
                        // Check if this is an instruction or register
                        if (instructionData[upperWord] || registerData[upperWord]) {
                            const index = text.indexOf(word);
                            
                            if (index !== -1) {
                                const range = new vscode.Range(
                                    new vscode.Position(i, index),
                                    new vscode.Position(i, index + word.length)
                                );
                                
                                const newWord = formatCase === 'upper' ? word.toUpperCase() : word.toLowerCase();
                                edits.push(vscode.TextEdit.replace(range, newWord));
                            }
                        }
                    }
                }
                
                return edits;
            }
        })
    );
} 