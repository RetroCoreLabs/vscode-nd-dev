// Utility functions for ND-100 Assembly
import * as vscode from 'vscode';
import { instructionData, registerData } from './generated/generatedData';

/**
 * Converts instruction and register keywords to uppercase or lowercase
 * @param toUppercase If true, converts to uppercase; if false, converts to lowercase
 */
export function convertCase(toUppercase: boolean): void {
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