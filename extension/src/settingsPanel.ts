// Custom webview settings panel for ND-100 toolchain configuration
import * as vscode from 'vscode';
import * as childProcess from 'child_process';

export class ND100SettingsPanel {
    public static readonly viewType = 'nd100.settingsPanel';
    private static currentPanel: ND100SettingsPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];

    public static createOrShow(context: vscode.ExtensionContext): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ND100SettingsPanel.currentPanel) {
            ND100SettingsPanel.currentPanel.panel.reveal(column);
            return;
        }

        const version = String((context.extension.packageJSON as { version?: string }).version ?? '');

        const panel = vscode.window.createWebviewPanel(
            ND100SettingsPanel.viewType,
            'ND-100 Toolchain Settings',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        ND100SettingsPanel.currentPanel = new ND100SettingsPanel(panel, version);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        private readonly extensionVersion: string
    ) {
        this.panel = panel;
        this.panel.webview.html = this.getHtml();

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        this.panel.webview.onDidReceiveMessage(
            (message) => this.handleMessage(message),
            null,
            this.disposables
        );
    }

    private dispose(): void {
        ND100SettingsPanel.currentPanel = undefined;
        this.panel.dispose();
        for (let i = 0; i < this.disposables.length; i++) {
            this.disposables[i].dispose();
        }
        this.disposables = [];
    }

    private async handleMessage(message: any): Promise<void> {
        switch (message.type) {
            case 'setting': {
                const fullKey = `nd100.${message.key}`;
                const config = vscode.workspace.getConfiguration();
                // Write to workspace scope if it has an override, otherwise global
                const inspection = config.inspect(fullKey);
                const target = (inspection?.workspaceValue !== undefined)
                    ? vscode.ConfigurationTarget.Workspace
                    : vscode.ConfigurationTarget.Global;
                await config.update(fullKey, message.value, target);
                break;
            }
            case 'browse': {
                const options: vscode.OpenDialogOptions = {
                    canSelectFiles: true,
                    canSelectFolders: message.folder === true,
                    canSelectMany: false,
                    title: `Select ${message.label || 'file'}`,
                };
                const result = await vscode.window.showOpenDialog(options);
                if (result && result.length > 0) {
                    this.panel.webview.postMessage({
                        type: 'browseResult',
                        key: message.key,
                        value: result[0].fsPath,
                    });
                }
                break;
            }
            case 'checkTools': {
                const status = this.checkToolStatus();
                this.panel.webview.postMessage({ type: 'toolStatus', status });
                break;
            }
        }
    }

    private checkToolStatus(): { [key: string]: { found: boolean; path: string; version: string } } {
        const config = vscode.workspace.getConfiguration('nd100');
        const fs = require('fs');
        const tools: { [key: string]: string } = {
            compiler: config.get<string>('toolchain.compiler', 'nd100-nd-bsd-pcc'),
            assembler: config.get<string>('toolchain.assembler', 'nd100-as'),
            linker: config.get<string>('toolchain.linker', 'nd100-ld'),
            debugger: config.get<string>('toolchain.debugger', 'nd100x'),
        };

        const result: { [key: string]: { found: boolean; path: string; version: string } } = {};
        const toolNames = Object.keys(tools);
        for (let i = 0; i < toolNames.length; i++) {
            const name = toolNames[i];
            const tool = tools[name];
            let found = false;
            let resolvedPath = '';
            let version = '';

            // If tool is an absolute path, check filesystem directly
            if (tool.startsWith('/') || tool.startsWith('./')) {
                found = fs.existsSync(tool);
                resolvedPath = found ? tool : '';
            } else {
                try {
                    resolvedPath = childProcess.execSync(`command -v ${tool}`, { stdio: 'pipe' }).toString().trim();
                    found = true;
                } catch {
                    found = false;
                }
            }

            if (found) {
                try {
                    version = childProcess.execSync(`${tool} --version 2>&1 || true`, { stdio: 'pipe', timeout: 3000 }).toString().trim().split('\n')[0];
                } catch {
                    version = '(version unknown)';
                }
            }
            result[name] = { found, path: resolvedPath, version };
        }
        return result;
    }

    private getHtml(): string {
        const config = vscode.workspace.getConfiguration('nd100');

        const compiler = this.escapeHtml(config.get<string>('toolchain.compiler', 'nd100-nd-bsd-pcc'));
        const assembler = this.escapeHtml(config.get<string>('toolchain.assembler', 'nd100-as'));
        const linker = this.escapeHtml(config.get<string>('toolchain.linker', 'nd100-ld'));
        const debugger_ = this.escapeHtml(config.get<string>('toolchain.debugger', 'nd100x'));
        const libcPath = this.escapeHtml(config.get<string>('toolchain.libcPath', ''));
        const assemblerFlags = this.escapeHtml(config.get<string>('toolchain.assemblerFlags', '-m'));
        const compilerFlags = this.escapeHtml(config.get<string>('toolchain.compilerFlags', '-xuchar'));
        const linkerFlags = this.escapeHtml(config.get<string>('toolchain.linkerFlags', ''));
        const crt0Path = this.escapeHtml(config.get<string>('toolchain.crt0Path', ''));
        const dapPort = config.get<number>('toolchain.dapPort', 4711);
        const linkLibc = config.get<boolean>('toolchain.linkLibc', true);
        const lowercaseMode = config.get<boolean>('editor.lowercaseMode', false);

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ND-100 Toolchain Settings</title>
<style>
    body {
        font-family: var(--vscode-font-family);
        color: var(--vscode-foreground);
        background-color: var(--vscode-editor-background);
        padding: 20px;
        max-width: 700px;
        margin: 0 auto;
    }
    h1 { font-size: 1.4em; margin-bottom: 0.5em; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 8px; }
    .ext-version { font-size: 0.85em; color: var(--vscode-descriptionForeground); margin: 0 0 16px 0; }
    h2 { font-size: 1.1em; margin-top: 1.5em; margin-bottom: 0.5em; color: var(--vscode-descriptionForeground); }
    .field { margin-bottom: 12px; }
    .field label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 0.9em; }
    .field .desc { font-size: 0.8em; color: var(--vscode-descriptionForeground); margin-bottom: 4px; }
    .field-row { display: flex; gap: 6px; }
    .field-row input[type="text"] { flex: 1; }
    input[type="text"] {
        width: 100%;
        box-sizing: border-box;
        padding: 4px 8px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        font-family: var(--vscode-editor-font-family);
        font-size: 0.9em;
    }
    input[type="checkbox"] { margin-right: 6px; }
    button {
        padding: 4px 12px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        cursor: pointer;
        font-size: 0.85em;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    .status-section { margin-top: 20px; }
    .tool-status { display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 0.9em; }
    .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
    .dot.green { background: #2e7d32; }
    .dot.red { background: #c62828; }
    .tool-path { color: var(--vscode-descriptionForeground); font-size: 0.8em; }
    .checkbox-row { display: flex; align-items: center; margin-bottom: 8px; }
</style>
</head>
<body>
    <h1>ND-100 Toolchain Settings</h1>
    <p class="ext-version">ND-100 Development extension version <strong>${this.escapeHtml(this.extensionVersion)}</strong> — from package manifest (matches the published .vsix / Extensions view).</p>

    <h2>Toolchain Paths</h2>
    <div class="desc" style="margin-bottom: 12px;">These tools must be installed and on your PATH, or provide full paths below. Run "Check Tools" at the bottom to verify.</div>
    <div class="field">
        <label>Compiler</label>
        <div class="desc">PCC cross-compiler driver (nd100-nd-bsd-pcc). Compiles C to ND-100 assembly</div>
        <div class="field-row">
            <input type="text" id="compiler" value="${compiler}" />
            <button onclick="browse('toolchain.compiler', 'Compiler')">Browse...</button>
        </div>
    </div>
    <div class="field">
        <label>Assembler</label>
        <div class="desc">ND-100 assembler (nd100-as). Assembles .s files to object files</div>
        <div class="field-row">
            <input type="text" id="assembler" value="${assembler}" />
            <button onclick="browse('toolchain.assembler', 'Assembler')">Browse...</button>
        </div>
    </div>
    <div class="field">
        <label>Linker</label>
        <div class="desc">ND-100 linker (nd100-ld). Links object files into .out executables</div>
        <div class="field-row">
            <input type="text" id="linker" value="${linker}" />
            <button onclick="browse('toolchain.linker', 'Linker')">Browse...</button>
        </div>
    </div>
    <div class="field">
        <label>Debugger</label>
        <div class="desc">nd100x emulator/debugger. Launched automatically when you press F5</div>
        <div class="field-row">
            <input type="text" id="debugger" value="${debugger_}" />
            <button onclick="browse('toolchain.debugger', 'Debugger')">Browse...</button>
        </div>
    </div>
    <div class="field">
        <label>nd100-libc Path</label>
        <div class="desc">Root of nd100-libc repository. Required for C compilation - provides crt0.o startup, csav/cret runtime, and libc.a</div>
        <div class="field-row">
            <input type="text" id="libcPath" value="${libcPath}" />
            <button onclick="browsePath('toolchain.libcPath', 'nd100-libc directory', true)">Browse...</button>
        </div>
    </div>

    <h2>Compiler Options</h2>
    <div class="field">
        <label>Compiler Flags</label>
        <div class="desc">Additional PCC compiler flags. Default -xuchar treats char as unsigned (ND-100 convention)</div>
        <input type="text" id="compilerFlags" value="${compilerFlags}" />
    </div>
    <div class="checkbox-row">
        <input type="checkbox" id="lowercaseMode" ${lowercaseMode ? 'checked' : ''} />
        <label for="lowercaseMode">Lowercase mode (convert instructions to lowercase)</label>
    </div>

    <h2>Assembler Options</h2>
    <div class="field">
        <label>Assembler Flags</label>
        <div class="desc">Additional assembler flags (default -m generates symbol map)</div>
        <input type="text" id="assemblerFlags" value="${assemblerFlags}" />
    </div>

    <h2>Linker Options</h2>
    <div class="desc" style="margin-bottom: 12px;">nd100-libc provides the C runtime: startup code (crt0), function prologue/epilogue (csav/cret), and the standard library. Set the path above and enable linking below for C programs.</div>
    <div class="field">
        <label>Linker Flags</label>
        <div class="desc">Additional flags passed to nd100-ld during linking</div>
        <input type="text" id="linkerFlags" value="${linkerFlags}" />
    </div>
    <div class="field">
        <label>crt0 Path Override</label>
        <div class="desc">Path to crt0.o (leave empty to use nd100-libc default)</div>
        <div class="field-row">
            <input type="text" id="crt0Path" value="${crt0Path}" />
            <button onclick="browse('toolchain.crt0Path', 'crt0.o')">Browse...</button>
        </div>
    </div>
    <div class="checkbox-row">
        <input type="checkbox" id="linkLibc" ${linkLibc ? 'checked' : ''} />
        <label for="linkLibc">Link against nd100-libc (startup code, calling convention helpers, standard library)</label>
    </div>

    <h2>Debugger Options</h2>
    <div class="desc" style="margin-bottom: 12px;">nd100x is launched automatically when you press F5. It communicates with VS Code over the Debug Adapter Protocol (DAP).</div>
    <div class="field">
        <label>DAP Port</label>
        <div class="desc">TCP port for DAP communication between VS Code and nd100x. Change if 4711 conflicts with another service</div>
        <input type="text" id="dapPort" value="${dapPort}" />
    </div>

    <div class="status-section">
        <h2>Tool Status</h2>
        <div id="toolStatusContainer">
            <p style="color: var(--vscode-descriptionForeground)">Click "Check Tools" to verify tool availability.</p>
        </div>
        <button onclick="checkTools()" style="margin-top: 8px;">Check Tools</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // Map input IDs to setting keys
        const settingMap = {
            'compiler': 'toolchain.compiler',
            'assembler': 'toolchain.assembler',
            'linker': 'toolchain.linker',
            'debugger': 'toolchain.debugger',
            'libcPath': 'toolchain.libcPath',
            'assemblerFlags': 'toolchain.assemblerFlags',
            'compilerFlags': 'toolchain.compilerFlags',
            'linkerFlags': 'toolchain.linkerFlags',
            'crt0Path': 'toolchain.crt0Path',
            'dapPort': 'toolchain.dapPort',
            'lowercaseMode': 'editor.lowercaseMode',
            'linkLibc': 'toolchain.linkLibc',
        };

        // Attach change listeners to all inputs
        const keys = Object.keys(settingMap);
        for (let i = 0; i < keys.length; i++) {
            const id = keys[i];
            const el = document.getElementById(id);
            if (!el) continue;
            if (el.type === 'checkbox') {
                el.addEventListener('change', function() {
                    vscode.postMessage({ type: 'setting', key: settingMap[id], value: el.checked });
                });
            } else {
                el.addEventListener('change', function() {
                    var val = el.value;
                    if (id === 'dapPort') {
                        val = parseInt(val, 10);
                        if (isNaN(val)) return;
                    }
                    vscode.postMessage({ type: 'setting', key: settingMap[id], value: val });
                });
            }
        }

        function browse(key, label) {
            vscode.postMessage({ type: 'browse', key: key, label: label, folder: false });
        }

        function browsePath(key, label, folder) {
            vscode.postMessage({ type: 'browse', key: key, label: label, folder: folder });
        }

        function checkTools() {
            vscode.postMessage({ type: 'checkTools' });
        }

        // Handle messages from extension host
        window.addEventListener('message', function(event) {
            const message = event.data;
            if (message.type === 'browseResult') {
                // Find the input by setting key
                const inputKeys = Object.keys(settingMap);
                for (let i = 0; i < inputKeys.length; i++) {
                    if (settingMap[inputKeys[i]] === message.key) {
                        const el = document.getElementById(inputKeys[i]);
                        if (el) {
                            el.value = message.value;
                            vscode.postMessage({ type: 'setting', key: message.key, value: message.value });
                        }
                        break;
                    }
                }
            } else if (message.type === 'toolStatus') {
                const container = document.getElementById('toolStatusContainer');
                let html = '';
                const toolNames = Object.keys(message.status);
                for (let i = 0; i < toolNames.length; i++) {
                    const name = toolNames[i];
                    const info = message.status[name];
                    const dotClass = info.found ? 'green' : 'red';
                    const label = name.charAt(0).toUpperCase() + name.slice(1);
                    html += '<div class="tool-status">';
                    html += '<span class="dot ' + dotClass + '"></span>';
                    html += '<strong>' + label + '</strong>';
                    if (info.found) {
                        html += '<span class="tool-path">' + info.path + '</span>';
                    } else {
                        html += '<span class="tool-path">Not found</span>';
                    }
                    html += '</div>';
                }
                container.innerHTML = html;
            }
        });
    </script>
</body>
</html>`;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

export function registerSettingsPanel(context: vscode.ExtensionContext): void {
    const version = String((context.extension.packageJSON as { version?: string }).version ?? '');

    context.subscriptions.push(
        vscode.commands.registerCommand('nd100.openSettings', () => {
            ND100SettingsPanel.createOrShow(context);
        })
    );

    // Status bar item with gear icon
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    statusBarItem.text = '$(gear) ND-100';
    statusBarItem.tooltip =
        version.length > 0
            ? `ND-100 Toolchain Settings (extension v${version})`
            : 'ND-100 Toolchain Settings';
    statusBarItem.command = 'nd100.openSettings';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
}
