// Inlay hints provider for ND-100 Assembly
import * as vscode from 'vscode';
import { instructionData } from '../generated/generatedData';

/**
 * Registers the inlay hints provider for ND-100 Assembly
 */
export function registerInlayHintsProvider(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.languages.registerInlayHintsProvider('ndasm', {
            provideInlayHints(document: vscode.TextDocument, range: vscode.Range) {
                const hints: vscode.InlayHint[] = [];

                // Check if inlay hints are enabled in settings
                const config = vscode.workspace.getConfiguration('ndasm');
                const enableHints = config.get('enableInlayHints', true);
                const enableOpcodeHints = enableHints && config.get('enableOpcodeInlayHints', true);
                const enableParameterHints = enableHints && config.get('enableParameterInlayHints', true);

                if (!enableHints || (!enableOpcodeHints && !enableParameterHints)) {
                    return hints;
                }

                // Process each line in the range
                for (let i = range.start.line; i <= range.end.line; i++) {
                    const line = document.lineAt(i);
                    const text = line.text;

                    // Skip comments and empty lines
                    if (text.trim() === '' || text.trim().startsWith(';')) {
                        continue;
                    }

                    // Match instruction pattern
                    const match = text.match(/\b([A-Za-z]+)\b/);
                    if (match) {
                        const instruction = match[1].toUpperCase();
                        const instData = instructionData[instruction];

                        if (instData) {
                            // Add machine code opcode hint at the end of the line
                            if (enableOpcodeHints) {
                                const position = new vscode.Position(i, line.text.length);
                                let hintText = `# 0x${instData.Opcode}`;

                                // Add affected flags if available
                                if (instData.FlagsAffected && instData.FlagsAffected.length > 0) {
                                    hintText += ` [${instData.FlagsAffected.join(',')}]`;
                                }

                                // Use Type for the machine code hint since it represents the underlying type/implementation of the instruction
                                const hint = new vscode.InlayHint(position, hintText, vscode.InlayHintKind.Type);
                                hint.paddingLeft = true;
                                hints.push(hint);
                            }

                            // Add parameter hints for operands
                            if (enableParameterHints && instData.Operands && instData.Operands.length > 0) {
                                // Extract operands from the text (after the instruction)
                                const operandsText = text.substring(text.indexOf(instruction) + instruction.length);
                                const operands = operandsText.split(/,\s*/).map(o => o.trim()).filter(o => o.length > 0);

                                operands.forEach((operand, index) => {
                                    if (index < instData.Operands.length) {
                                        const opDef = instData.Operands[index];

                                        // Skip if the operand is named "opcode" - we don't want to show that
                                        if (opDef.Name !== "opcode") {
                                            // Find position after the operand
                                            const operandStart = text.indexOf(operand, text.indexOf(instruction));
                                            if (operandStart >= 0) {
                                                const position = new vscode.Position(i, operandStart + operand.length);
                                                let label = opDef.Name;

                                                // Add type if available
                                                if (opDef.Type) {
                                                    label += `:${opDef.Type}`;
                                                }

                                                // Use Parameter for operand hints since they represent function/instruction parameters
                                                const hint = new vscode.InlayHint(position, ` # ${label}`, vscode.InlayHintKind.Parameter);
                                                hint.paddingLeft = true;
                                                hints.push(hint);
                                            }
                                        }
                                    }
                                });
                            }
                        }
                    }
                }

                return hints;
            }
        })
    );
}
