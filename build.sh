#!/usr/bin/env bash
# Build the VS Code extension: init submodule if needed, .NET codegen, then TypeScript compile.
# Repo root = directory containing this script.
# Usage:
#   ./build.sh           # codegen + npm compile
#   ./build.sh --vsix    # also run vsce package (needs network for npx the first time)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR"
cd "$REPO_ROOT"

PACKAGE_VSIX=0
for a in "$@"; do
  if [[ "$a" == "--vsix" ]]; then PACKAGE_VSIX=1; fi
done

echo "=== vscode-nd100-dev build (repo: $REPO_ROOT) ==="

if [[ ! -f "$REPO_ROOT/nd100-definitions/specs/cpu.yaml" ]]; then
  echo "Initializing nd100-definitions submodule..."
  git -C "$REPO_ROOT" submodule update --init --recursive
fi

if ! command -v dotnet &>/dev/null; then
  echo "Error: dotnet not found in PATH."
  exit 1
fi
if ! command -v npm &>/dev/null; then
  echo "Error: npm not found in PATH."
  exit 1
fi

echo "=== dotnet build ==="
dotnet build "$REPO_ROOT/ND100.VSCode.sln" -c Release

echo "=== codegen (extension/src/generated) ==="
dotnet run --project "$REPO_ROOT/src/ND100.VSCode.Tool/ND100.VSCode.Tool.csproj" -c Release --no-build

EXT="$REPO_ROOT/extension"
echo "=== npm (extension) ==="
cd "$EXT"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

echo "=== TypeScript compile -> extension/out ==="
npm run compile

if [[ "$PACKAGE_VSIX" -eq 1 ]]; then
  echo "=== vsce package ==="
  npx --yes @vscode/vsce package
  echo "VSIX should be under: $EXT"
fi

echo "=== Done ==="
