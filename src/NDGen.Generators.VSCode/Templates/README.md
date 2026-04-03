# ND-100 Development

Full development environment for the Norsk Data ND-100 minicomputer: C cross-compilation with PCC, assembly language support, source-level debugging, and integrated build pipeline.

## Quick Start

1. Install the ND-100 toolchain: `nd100-pcc`, `nd100-as`, `nd100-ld`, `nd100x`
2. Set `nd100.toolchain.libcPath` to your nd100-libc repository root
3. Open a `.c` or `.s` file, press **F5** -- builds, launches the emulator, and starts debugging

## Features

### C Cross-Compilation

- PCC compiler with `-g` debug info (STABS format)
- Automatic compile, assemble, link pipeline
- nd100-libc linking: crt0 startup, csav/cret calling convention, libc.a
- Problem matchers for compiler, assembler, and linker errors surfaced in the Problems panel

### Assembly Language Support

- Syntax highlighting for instructions, registers, addressing modes, and multiple comment styles
- Hover information with instruction descriptions, bit layouts, and flag effects
- Code completion with operand descriptions and register types
- Signature help showing valid operands and examples
- Inlay hints displaying machine code opcodes, affected flags, and parameter names
- Case conversion commands (uppercase/lowercase)

### Source-Level Debugging

- **Press F5** -- no launch.json needed, the extension generates the debug configuration automatically
- C debugging: breakpoints, step in/out/over, locals panel, call stack
- Assembly debugging: instruction-level stepping, register inspection
- Auto-launches nd100x emulator and connects via DAP
- Multi-file source resolution for stepping into libc and runtime sources

### Build Commands

Open the command palette (`Ctrl+Shift+P`) and type "ND-100":

| Command | Description |
|---------|-------------|
| **ND-100: Build (Compile + Assemble + Link)** | Full build pipeline for the active file |
| **ND-100: Compile C File** | Run PCC on the active .c file |
| **ND-100: Assemble File** | Assemble the active .s file |
| **ND-100: Link Program** | Link object files into an .out binary |
| **ND-100: Clean Build Artifacts** | Remove generated .o, .s, .out, .map, .srcmap files |
| **ND-100: Toolchain Settings** | Open the toolchain settings panel |

Makefile support is also available -- if a `Makefile` is present, the build system can invoke `make` targets.

## Toolchain Setup

### Required Tools

| Tool | Binary | Purpose |
|------|--------|---------|
| PCC cross-compiler | `nd100-nd-bsd-pcc` | Compiles C to ND-100 assembly |
| Assembler | `nd100-as` | Assembles .s files to object files |
| Linker | `nd100-ld` | Links object files into .out executables |
| Emulator/debugger | `nd100x` | Runs and debugs ND-100 programs via DAP |
| C runtime library | `nd100-libc` | Provides crt0.o, csav/cret, and libc.a |

All tools should be installed and available on your `PATH`, or configure full paths in settings.

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `nd100.toolchain.compiler` | `nd100-nd-bsd-pcc` | Path to PCC cross-compiler driver |
| `nd100.toolchain.assembler` | `nd100-as` | Path to ND-100 assembler |
| `nd100.toolchain.linker` | `nd100-ld` | Path to ND-100 linker |
| `nd100.toolchain.debugger` | `nd100x` | Path to nd100x emulator/debugger |
| `nd100.toolchain.libcPath` | *(empty)* | Root of nd100-libc repository. Required for C compilation |
| `nd100.toolchain.linkLibc` | `true` | Link C programs against nd100-libc automatically |
| `nd100.toolchain.compilerFlags` | `-xuchar` | Additional PCC compiler flags |
| `nd100.toolchain.linkerFlags` | *(empty)* | Additional linker flags |
| `nd100.toolchain.dapPort` | `4711` | TCP port for DAP communication with nd100x |
| `nd100.toolchain.crt0Path` | *(empty)* | Override path to crt0.o (uses nd100-libc default if empty) |
| `nd100.toolchain.includePaths` | `[]` | Additional include directories for PCC (`-I` flags) |
| `nd100.toolchain.libraryPaths` | `[]` | Library search directories for linker (`-L` flags) |

### Global vs Workspace Settings

Toolchain paths are typically the same across all projects. Set them in **User Settings** (global) so they apply everywhere:

1. Run **ND-100: Toolchain Settings** from the command palette, or
2. Open VS Code settings (`Ctrl+,`) and search for `nd100.toolchain`

Project-specific overrides (e.g., extra include paths) go in `.vscode/settings.json`.

## Debugging Guide

### C Programs

1. Open a `.c` file
2. Press **F5**
3. The extension automatically: compiles with PCC, assembles, links against libc, launches nd100x, connects the debugger
4. Set breakpoints, step through code, inspect locals in the Variables panel

When stepping, the debugger can resolve source files from nd100-libc and the runtime -- it searches the directories configured in `nd100.toolchain.libcPath` and `nd100.toolchain.includePaths`.

### Assembly Programs

1. Open a `.s` or `.asm` file
2. Press **F5**
3. The extension assembles the file, launches nd100x, and stops at the entry point
4. Use instruction-level stepping and inspect registers

### Advanced: Custom launch.json

A `launch.json` is only needed for non-standard configurations. Example:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug with custom sources",
            "type": "ND-100 Assembly",
            "request": "launch",
            "program": "${fileDirname}/${fileBasenameNoExtension}.out",
            "mapFile": "${fileDirname}/${fileBasenameNoExtension}.srcmap",
            "sourceFile": "${file}",
            "sourcePaths": [
                "${workspaceFolder}",
                "/path/to/nd100-libc/src"
            ],
            "autoLaunch": true,
            "stopOnEntry": false,
            "port": 4711
        }
    ]
}
```

| Attribute | Description |
|-----------|-------------|
| `program` | Path to the linked .out binary |
| `mapFile` | Path to .map (assembly) or .srcmap (C) debug info. Auto-detected from source file type |
| `sourceFile` | The source file being debugged |
| `sourcePaths` | Directories to search when resolving source files from debug info |
| `autoLaunch` | Start nd100x automatically. Disable if running the emulator externally |
| `stopOnEntry` | Pause at program entry point. Default is true for assembly, false for C |
| `port` | TCP port for DAP connection (default 4711) |

## Inlay Hints

The extension shows inline annotations on assembly code:

### Machine Code Opcodes and Flags

At the end of each instruction line:
- Machine code opcode in hex (e.g., `# 0x172400`)
- Affected CPU flags in brackets (e.g., `[C,O]`)

### Parameter Information

After each operand:
- Parameter name (e.g., `# number`)
- Parameter type (e.g., `# number:numeric`)

### Configuration

Control inlay hints through VS Code settings or the settings panel:

- `ndasm.enableInlayHints` -- master switch for all inlay hints
- `ndasm.enableOpcodeInlayHints` -- opcode and flag display
- `ndasm.enableParameterInlayHints` -- parameter name and type display

### Custom Styling

```json
{
  "workbench.colorCustomizations": {
    "editorInlayHint.typeForeground": "#569CD6",
    "editorInlayHint.typeBackground": "#00000000",
    "editorInlayHint.parameterForeground": "#4EC9B0",
    "editorInlayHint.parameterBackground": "#00000000"
  }
}
```

### Example

```asm
LDA 1000,B    # 0x060000 [C,O,Q]
              ^
              displacement:numeric # addressing_mode
```

## Case Conversion

### Lowercase Mode

Enable `nd100.editor.lowercaseMode` in settings. New instructions are suggested in lowercase, and formatting converts existing code.

### Manual Conversion

From the command palette:
- **ND-100: Convert All Instructions to Uppercase**
- **ND-100: Convert All Instructions to Lowercase**

Converts valid instructions and registers only. Comments, labels, and other text are preserved.

## Requirements

- Visual Studio Code 1.85.0 or higher

## Release Notes

### 0.0.4

- C cross-compilation support with PCC build pipeline
- Source-level C debugging with breakpoints, stepping, and locals
- Automatic debug configuration -- press F5, no launch.json needed
- Auto-launch nd100x emulator for debug sessions
- Build commands: compile, assemble, link, full build, clean
- Makefile integration
- Problem matchers for PCC, assembler, and linker errors
- nd100-libc integration (crt0, csav/cret, libc.a)
- Multi-file source resolution during debugging
- Toolchain settings panel with tool status checking
- Inlay hints for machine code opcodes, flags, and parameter info

### 0.0.3

- Integrated debugging via DAP protocol
- Breakpoints, stepping, register inspection
- Connect to nd100x debugger

### 0.0.2

- Case conversion features (uppercase/lowercase commands, auto-convert mode)
- Improved code completion and hover information

### 0.0.1

- Initial release: syntax highlighting, hover info, code completion, signature help, parameter hints
