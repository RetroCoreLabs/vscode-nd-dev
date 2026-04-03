// Signature help provider for ND-100 Assembly
import * as vscode from 'vscode';
import { instructionData } from '../generated/generatedData';

/**
 * Registers the signature help provider for ND-100 Assembly
 */
export function registerSignatureHelpProvider(context: vscode.ExtensionContext): void {
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