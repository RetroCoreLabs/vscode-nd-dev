// Main entry point for the ND-100 Development extension
import * as vscode from 'vscode';
import { registerLanguageFeatures } from './providers/languageProviders';
import { registerDebugFeatures } from './debugger';
import { registerCommands } from './commands';
import { registerTaskProvider } from './taskProvider';
import { registerBuildCommands } from './buildCommands';
import { registerSettingsPanel } from './settingsPanel';

/**
 * Activates the extension - this is called when the extension is loaded
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('ND-100 Development Extension is now active');

    // Register language providers (hover, completion, signature help, etc.)
    registerLanguageFeatures(context);

    // Register debug functionality
    registerDebugFeatures(context);

    // Register commands (case conversion etc.)
    registerCommands(context);

    // Register task provider for build tasks
    registerTaskProvider(context);

    // Register build commands (compile, assemble, link, build, clean)
    registerBuildCommands(context);

    // Register settings panel
    registerSettingsPanel(context);
}

/**
 * Deactivates the extension - called when the extension is unloaded
 */
export function deactivate() {
    console.log('ND-100 Development Extension is now deactivated');
}
