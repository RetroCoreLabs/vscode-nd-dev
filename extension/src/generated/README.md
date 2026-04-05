# `src/generated`

| File | Source |
|------|--------|
| `interfaces.ts` | **Hand-maintained** — types used by `generatedData.ts` |
| `generatedData.ts` | **Generated** by NDGen (`dotnet run --project src/NDGen.Console -- vscode`) from `nd100-definitions` |
| `ndasm.tmLanguage.json` | **Generated** (same command) |

Do not edit the generated files; change YAML specs and regenerate, or adjust `VSCodeExtensionGenerator` in `src/NDGen.Generators.VSCode/`.
