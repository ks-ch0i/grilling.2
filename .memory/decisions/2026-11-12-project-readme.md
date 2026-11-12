# Decisions: Project README

- Date: 2026-11-12
- Status: Confirmed

## D01. Primary audience
- **Chosen**: Developers onboarding to the project.
- **Rationale**: The README should help a developer understand the game and get a local development environment running.

## D02. File name and language
- **Chosen**: Create the root `README.md` in Korean.
- **Rationale**: `README.md` matches the existing documentation filename convention and is recognized by common repository hosts. Korean matches the game UI and most project documentation.

## D03. Documentation scope
- **Chosen**: Write a detailed developer guide covering the game, implemented gameplay and controls, requirements, setup, run/build/test commands, system structure, asset regeneration, and related documentation links.
- **Rationale**: The user selected a detailed guide that extends the project onboarding outline with system architecture, asset regeneration, and verification procedures.

## D04. Verification instructions
- **Chosen**: Include `npm test`, `npm run build`, and a short manual browser smoke checklist.
- **Rationale**: The repository defines automated test and build scripts but no browser E2E script; a browser checklist documents the user-facing path that automation does not cover.

## D05. Source-backed project facts
- **Chosen**: Document Node.js `>=22.12.0`, Phaser 4, Vite, the existing npm scripts, the forest and mine stages, browser-local save/settings, the development-only round selector, and the current source directory responsibilities.
- **Rationale**: These details are present in `package.json`, `src/`, and `docs/` and can be stated without inventing deployment or service behavior.

## D06. Existing documentation and media
- **Chosen**: Link to `docs/asset-provenance.md` and `docs/round-selector.md`; do not add a screenshot or live demo link.
- **Rationale**: Detailed asset credits and development selector instructions already exist. The repository has no published demo URL, and the available verification screenshots predate the latest asset changes.

## Out-of-scope findings
- No root `LICENSE` file was found. The README must not claim a project-wide license; choosing or adding one is a separate decision.
