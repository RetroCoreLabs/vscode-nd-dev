@echo off
setlocal EnableExtensions EnableDelayedExpansion
REM Build the VS Code extension: submodule if needed, .NET codegen, then TypeScript compile.
REM Run from anywhere; uses repo root = directory containing this script.
REM Usage:
REM   build.bat
REM   build.bat --vsix    REM also package .vsix via npx vsce

set "REPO=%~dp0"
if "%REPO:~-1%"=="\" set "REPO=%REPO:~0,-1%"
cd /d "%REPO%"

set "PACKAGE_VSIX=0"
if /i "%~1"=="--vsix" set "PACKAGE_VSIX=1"

echo === vscode-nd100-dev build (repo: %REPO%) ===

if not exist "%REPO%\nd100-definitions\specs\cpu.yaml" (
  echo Initializing nd100-definitions submodule...
  git -C "%REPO%" submodule update --init --recursive
  if errorlevel 1 exit /b 1
)

where dotnet >nul 2>nul
if errorlevel 1 (
  echo Error: dotnet not found in PATH.
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo Error: npm not found in PATH.
  exit /b 1
)

echo === dotnet build ===
dotnet build "%REPO%\ND100.VSCode.sln" -c Release
if errorlevel 1 exit /b 1

echo === codegen (extension\src\generated) ===
dotnet run --project "%REPO%\src\ND100.VSCode.Tool\ND100.VSCode.Tool.csproj" -c Release --no-build
if errorlevel 1 exit /b 1

set "EXT=%REPO%\extension"
echo === npm (extension) ===
cd /d "%EXT%"
if exist package-lock.json (
  call npm ci
) else (
  call npm install
)
if errorlevel 1 exit /b 1

echo === TypeScript compile -^> extension\out ===
call npm run compile
if errorlevel 1 exit /b 1

if "%PACKAGE_VSIX%"=="1" (
  echo === vsce package ===
  call npx --yes @vscode/vsce package
  if errorlevel 1 exit /b 1
  echo VSIX should be under: %EXT%
)

echo === Done ===
exit /b 0
