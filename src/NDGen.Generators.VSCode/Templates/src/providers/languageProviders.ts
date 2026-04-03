// Consolidated language providers registration
import * as vscode from 'vscode';
import { registerHoverProvider } from './hoverProvider';
import { registerCompletionProvider } from './completionProvider';
import { registerSignatureHelpProvider } from './signatureHelpProvider';
import { registerInlayHintsProvider } from './inlayHintsProvider';
import { registerDocumentFormattingProvider } from './formattingProvider';

/**
 * Registers all language-related features
 */
export function registerLanguageFeatures(context: vscode.ExtensionContext): void {
    // Register language providers
    registerHoverProvider(context);
    registerCompletionProvider(context);
    registerSignatureHelpProvider(context);
    registerInlayHintsProvider(context);
    registerDocumentFormattingProvider(context);
} 