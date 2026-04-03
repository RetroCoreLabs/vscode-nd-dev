import * as vscode from 'vscode';

export class NdasmDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
    
    // Provide initial configurations for "Add Configuration" button in launch.json
    provideDebugConfigurations(
        folder: vscode.WorkspaceFolder | undefined,
        token?: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DebugConfiguration[]> {
        // First check if we're in an ndasm file before providing configurations
        const editor = vscode.window.activeTextEditor;
        if (!editor || !this.isNdasmFile(editor.document.fileName)) {
            return [];
        }
        
        return [
            {
                name: "Debug ND-100 Assembly",
                type: "ND-100 Assembly",
                request: "launch",
                program: "${fileDirname}/${fileBasenameNoExtension}.out",
                mapFile: "${fileDirname}/${fileBasenameNoExtension}.map",
                sourceFile: "${file}",
                autoLaunch: true,
                port: 4711
            }
        ];
    }

    // Resolve/finalize configuration before launch
    resolveDebugConfiguration(
        folder: vscode.WorkspaceFolder | undefined,
        config: vscode.DebugConfiguration,
        token?: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.DebugConfiguration> {
        // If we have no active file or it's not an Assembly file, don't allow debugging
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No file is open to debug.');
            return undefined; // abort launch
        }
        
        const activeFileName = editor.document.fileName.toLowerCase();
        const isActiveFileNdasm = activeFileName.endsWith('.asm') || activeFileName.endsWith('.s');
        
        if (!isActiveFileNdasm) {
            vscode.window.showInformationMessage('The ND-100 Assembly debugger can only be used with .asm or .s files.');
            return undefined; // abort launch
        }
        
        // If launch.json is missing or empty
        if (!config.type && !config.request && !config.name) {
            config.type = "ND-100 Assembly";
            config.name = "Debug ND-100 Assembly File";
            config.request = "launch";
            config.program = "${fileDirname}/${fileBasenameNoExtension}.out";
            config.mapFile = "${fileDirname}/${fileBasenameNoExtension}.map";
            config.sourceFile = "${file}";
        }

        // We've already verified the active file is an assembly file,
        // so if sourceFile contains variables, it should be fine.
        // Variables will be resolved by VS Code after this method returns.

        if (!config.program) {
            vscode.window.showErrorMessage("No program specified for ND-100 Assembly debug session.");
            return undefined;  // Abort launch
        }

        console.log("FINAL CONFIG:", JSON.stringify(config, null, 2));
        return config;
    }

    // Helper to determine if a file is an ND-100 Assembly file
    private isNdasmFile(filename: string): boolean {
        if (!filename) return false;
        
        // Check if filename is a variable placeholder
        if (filename.includes("$")) {
            // If it's a variable, check the active editor instead
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const activeFile = editor.document.fileName.toLowerCase();
                return activeFile.endsWith(".asm") || activeFile.endsWith(".s");
            }
            return false; // Can't determine
        }
        
        // Normal filename check
        filename = filename.toLowerCase();
        return filename.endsWith(".asm") || filename.endsWith(".s");
    }
} 