// Hover provider for ND-100 Assembly
import * as vscode from 'vscode';
import { instructionData, registerData } from '../generated/generatedData';
import { InstructionOperand, EnumOption, Bit } from '../generated/interfaces';

/**
 * Registers the hover provider for ND-100 Assembly
 */
export function registerHoverProvider(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('ndasm', {
            provideHover(document: vscode.TextDocument, position: vscode.Position) {
                const range = document.getWordRangeAtPosition(position);
                if (!range) return null;

                const word = document.getText(range);
                const instruction = word.toUpperCase();
                const instData = instructionData[instruction];

                if (instData) {
                    let markdown = new vscode.MarkdownString();
                    markdown.appendMarkdown(`# ${instData.Name}\n\n`);
                    markdown.appendMarkdown(`${instData.Description}\n\n`);
                    
                    // Display detailed description if available
                    if (instData.DetailedDescription) {
                        markdown.appendMarkdown(`${instData.DetailedDescription}\n\n`);
                    }
                    
                    markdown.appendMarkdown(`**Category:** ${instData.Category}\n\n`);
                    
                    if (instData.Visualization) {
                        markdown.appendMarkdown('**Bit Layout:**\n\n');
                        markdown.appendMarkdown('```\n' + instData.Visualization + '\n```\n\n');
                    }
                    
                    if (instData.Operands && instData.Operands.length > 0) {
                        markdown.appendMarkdown('**Operands:**\n\n');
                        instData.Operands.forEach((op: InstructionOperand) => {
                            markdown.appendMarkdown(`- **${op.Name}** (${op.Type})`);
                            if (op.Description) {
                                markdown.appendMarkdown(`: ${op.Description}`);
                            }
                            markdown.appendMarkdown('\n');
                            
                            if (op.Type === "enum" && op.EnumOptions) {
                                markdown.appendMarkdown('  **Options:**\n');
                                op.EnumOptions.forEach((opt: EnumOption) => {
                                    markdown.appendMarkdown(`  - **${opt.Name}** (${opt.Value})`);
                                    if (opt.Description) {
                                        markdown.appendMarkdown(`: ${opt.Description}`);
                                    }
                                    markdown.appendMarkdown('\n');
                                });
                            }
                        });
                    }
                    return new vscode.Hover(markdown);
                }
                
                // Check for register hover
                const regData = registerData[instruction];
                if (regData) {
                    let markdown = new vscode.MarkdownString();
                    markdown.appendMarkdown(`# ${regData.Name}\n\n`);
                    markdown.appendMarkdown(`${regData.Description}\n\n`);
                    if (regData.Type) {
                        markdown.appendMarkdown(`**Type:** ${regData.Type}\n\n`);
                    }
                    markdown.appendMarkdown(`**Size:** ${regData.Size} bits\n\n`);
                    
                    if (regData.Bits && regData.Bits.length > 0) {
                        markdown.appendMarkdown('**Bit Fields:**\n\n');
                        regData.Bits.forEach((bit: Bit) => {
                            markdown.appendMarkdown(`- **${bit.Name}** (${bit.Position}:${bit.Size}): ${bit.Description}\n`);
                        });
                    }
                    return new vscode.Hover(markdown);
                }
                
                return null;
            }
        })
    );
} 