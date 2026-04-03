// Completion provider for ND-100 Assembly
import * as vscode from 'vscode';
import { instructionData } from '../generated/generatedData';

/**
 * Registers the completion provider for ND-100 Assembly
 */
export function registerCompletionProvider(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider('ndasm', {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const line = document.lineAt(position.line).text;
                const lineUntilPosition = line.substring(0, position.character);
                
                const config = vscode.workspace.getConfiguration('nd100');
                const lowercaseMode = config.get('editor.lowercaseMode', false);
                
                // Helper function to generate smart comments
                function generateSmartComment(inst: any): string {
                    // Extract the core description without boilerplate
                    let baseDesc = inst.Description
                        .replace('This instruction', '')
                        .replace('instruction', '')
                        .trim();
                    
                    // If no operands, return the base description
                    if (!inst.Operands || inst.Operands.length === 0) {
                        return baseDesc;
                    }
                    
                    // Get operand names for use in the comment
                    const opNames = inst.Operands.map((op: any) => op.Name);
                    
                    // Special handling for common patterns
                    if (inst.Category === 'Arithmetic' || inst.Category === 'Logical') {
                        if (opNames.length >= 2) {
                            return `${opNames[0]} = ${opNames[0]} ${inst.Name.toLowerCase()} ${opNames[1]}`;
                        }
                    }
                    
                    return baseDesc;
                }
                
                // If we're at the start of a line, show all instructions
                if (lineUntilPosition.trim() === '') {
                    return Object.values(instructionData).map((inst: any) => {
                        const displayName = lowercaseMode ? inst.Name.toLowerCase() : inst.Name;
                        const item = new vscode.CompletionItem(displayName, vscode.CompletionItemKind.Keyword);
                        item.detail = inst.Category;
                        item.documentation = new vscode.MarkdownString(inst.Description);
                        
                        const snippet = new vscode.SnippetString();
                        snippet.appendText(displayName + ' ');
                        
                        if (inst.Operands && inst.Operands.length > 0) {
                            inst.Operands.forEach((op: any, index: number) => {
                                snippet.appendPlaceholder(op.Name);
                                if (index < inst.Operands.length - 1) {
                                    snippet.appendText(', ');
                                }
                            });
                            
                            // Generate smart comment
                            snippet.appendText(' # ');
                            snippet.appendPlaceholder(generateSmartComment(inst));
                        }
                        item.insertText = snippet;
                        return item;
                    });
                }
                
                return undefined;
            }
        })
    );
} 