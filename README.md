# nd100-vscode

Standalone generator: **VS Code extension sources** (syntax, providers, generated data) from [nd100-definitions](https://github.com/HackerCorpLabs/nd100-definitions).

Includes a copy of `NDGen.Generators.Common` (shared base generator) in this repo.

## Setup

```bash
git clone https://github.com/YOUR_ORG/nd100-vscode.git
cd nd100-vscode
git submodule update --init --recursive
```

## Build & run

```bash
dotnet build ND100.VSCode.sln -c Release
dotnet run --project src/ND100.VSCode.Tool -c Release --no-build
```

Output: `output/vscode/`. Then `cd output/vscode && npm install && npm run package` to build a `.vsix` if your workflow uses npm.

Templates live under `src/NDGen.Generators.VSCode/Templates/`.
