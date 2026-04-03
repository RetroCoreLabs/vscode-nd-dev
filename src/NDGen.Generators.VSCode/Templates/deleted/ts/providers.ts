// Consolidated providers file for ND-100 Assembly extension
// Contains all language-related providers (hover, completion, formatting, etc.)
import * as vscode from 'vscode';
import { InstructionData, RegisterData } from './interfaces';
import { instructionData, registerData } from './generatedData';

// ==== HOVER PROVIDER ====
export function registerHoverProvider(context: vscode.ExtensionContext) {
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
                        instData.Operands.forEach(op => {
                            markdown.appendMarkdown(`- **${op.Name}** (${op.Type})`);
                            if (op.Description) {
                                markdown.appendMarkdown(`: ${op.Description}`);
                            }
                            markdown.appendMarkdown('\n');
                            
                            if (op.Type === "enum" && op.EnumOptions) {
                                markdown.appendMarkdown('  **Options:**\n');
                                op.EnumOptions.forEach(opt => {
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
                        regData.Bits.forEach(bit => {
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

// ==== COMPLETION PROVIDER ====
export function registerCompletionProvider(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider('ndasm', {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const line = document.lineAt(position.line).text;
                const lineUntilPosition = line.substring(0, position.character);
                
                const config = vscode.workspace.getConfiguration('ndasm');
                const lowercaseMode = config.get('lowercaseMode', false);
                
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

// ==== SIGNATURE HELP PROVIDER ====
export function registerSignatureHelpProvider(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerSignatureHelpProvider('ndasm', {
            provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position) {
                const line = document.lineAt(position.line).text;
                const lineUntilPosition = line.substring(0, position.character);
                
                const instructionMatch = lineUntilPosition.match(/\b([A-Za-z]+)\s*$/);
                if (instructionMatch) {
                    const instruction = instructionMatch[1].toUpperCase();
                    const instData = instructionData[instruction];
                    
                    if (instData && instData.Operands && instData.Operands.length > 0) {
                        const signatureHelp = new vscode.SignatureHelp();
                        signatureHelp.activeSignature = 0;
                        signatureHelp.activeParameter = 0;
                        
                        const signature = new vscode.SignatureInformation(instData.Name);
                        signature.documentation = new vscode.MarkdownString(instData.Description);
                        
                        const parameters: vscode.ParameterInformation[] = [];
                        instData.Operands.forEach((op: any) => {
                            const param = new vscode.ParameterInformation(op.Name);
                            param.documentation = new vscode.MarkdownString(op.Description ?? '');
                            parameters.push(param);
                        });
                        signature.parameters = parameters;
                        signatureHelp.signatures = [signature];
                        
                        return signatureHelp;
                    }
                }
                return null;
            }
        }, ',')
    );
}

// ==== INLAY HINTS PROVIDER ====
export function registerInlayHintsProvider(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerInlayHintsProvider('ndasm', {
            provideInlayHints(document: vscode.TextDocument, range: vscode.Range) {
                const hints: vscode.InlayHint[] = [];
                
                for (let i = range.start.line; i <= range.end.line; i++) {
                    const line = document.lineAt(i);
                    const text = line.text;
                    
                    if (text.trim() === '' || text.trim().startsWith(';') || 
                        text.trim().startsWith('%') || text.trim().startsWith('#')) continue;
                    
                    const instructionMatch = text.match(/\b([A-Za-z]+)\b/);
                    if (!instructionMatch || instructionMatch.index === undefined) continue;
                    
                    const instructionName = instructionMatch[1];
                    const instruction = Object.values(instructionData)
                        .find(i => i.Name.toLowerCase() === instructionName.toLowerCase());
                    if (!instruction) continue;
                    
                    // Add operand hints...
                }
                
                return hints;
            }
        })
    );
}

// ==== FORMATTING PROVIDER ====
export function registerDocumentFormattingProvider(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider('ndasm', {
            provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
                const edits: vscode.TextEdit[] = [];
                const config = vscode.workspace.getConfiguration('ndasm');
                const caseMode = config.get<string>('caseConversion', 'lowercase');
                if (caseMode === 'none') return edits;
                const isLowercase = caseMode === 'lowercase';
                
                try {
                    for (let i = 0; i < document.lineCount; i++) {
                        const line = document.lineAt(i);
                        const text = line.text.trim();
                        
                        // Skip empty lines and comments
                        if (!text || text.startsWith(';')) continue;
                        
                        // Extract instruction
                        const instructionMatch = text.match(/^\s*([A-Za-z]+)\b/);
                        if (!instructionMatch) continue;
                        
                        const instruction = instructionMatch[1];
                        const upperInstruction = instruction.toUpperCase();
                        
                        if (instructionData[upperInstruction]) {
                            const instructionRange = new vscode.Range(
                                new vscode.Position(i, text.indexOf(instruction)),
                                new vscode.Position(i, text.indexOf(instruction) + instruction.length)
                            );
                            edits.push(vscode.TextEdit.replace(instructionRange, 
                                isLowercase ? instruction.toLowerCase() : instruction.toUpperCase()));
                        }
                    }
                } catch (error) {
                    console.error('Error in case conversion:', error);
                    vscode.window.showErrorMessage('Error during case conversion');
                }
                
                return edits;
            }
        })
    );
}

// Helper function for case conversion commands
export function convertCase(toUppercase: boolean) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const document = editor.document;
    const edits: vscode.TextEdit[] = [];
    
    for (let i = 0; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const text = line.text;
        
        if (text.trim() === '' || text.trim().startsWith(';') || 
            text.trim().startsWith('%') || text.trim().startsWith('#')) continue;
        
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
                    currentText = currentText.substring(0, index) + newWord + 
                                 currentText.substring(index + word.length);
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