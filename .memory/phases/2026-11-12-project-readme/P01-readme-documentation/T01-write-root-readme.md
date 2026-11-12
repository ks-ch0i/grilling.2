# Task: T01 Write Root README

## Status: done

## Goal
Create a Korean root `README.md` that gives developers a correct, usable introduction to Pixel Action, local setup, architecture, asset generation, and verification without adding product code or claiming unsupported deployment or licensing details.

## Decision Summary
- Audience is developers; include a game overview, controls, setup, architecture, asset regeneration, automated checks, and a short browser checklist.
- Use source-backed facts, link existing asset-provenance and development-selector guides, and omit screenshots, a live demo link, and any project-wide license claim.

## Implementation

### I01. Write the developer README

- Related Files:
  - `README.md` :: complete root project guide — new
  - `package.json` :: project name, Node engine, dependencies, and npm scripts; read-only
  - `index.html` :: browser entry and game mount element; read-only
  - `src/main.js` :: Phaser application bootstrap; read-only
  - `src/game/config.js` :: canvas size, scaling, and scene registration; read-only
  - `src/game/scenes/TitleScene.js` :: title menu, stage selection, continue, records, and development selector entry; read-only
  - `src/game/scenes/StageScene.js` :: game input, simulation tick, pause, and stage-clear transitions; read-only
  - `src/game/scenes/SettingsScene.js` :: music/SFX volume, screen-shake, fullscreen, and in-game control text; read-only
  - `src/game/input/InputController.js` :: keyboard, mouse, attack, and aim mapping; read-only
  - `src/game/content/stages.js`, `src/game/content/forestStage.js`, `src/game/content/mineStage.js` :: available stage definitions; read-only
  - `src/game/storage/saveStore.js` :: browser save shape, local persistence, records, and stage unlock; read-only
  - `src/game/dev/roundSelector.js` :: development practice rounds and production guard; read-only
  - `src/game/assets/manifest.js` :: runtime asset declarations; read-only
  - `scripts/pack-art.mjs` :: source-image to runtime-PNG generation; read-only
  - `scripts/generate-mine-music.mjs` :: generated mine music; read-only
  - `docs/asset-provenance.md` :: detailed asset and music credits; read-only
  - `docs/round-selector.md` :: development practice-selector usage; read-only

#### Details
- **Signatures & Types**:
  - This task creates Markdown documentation only. It adds no JavaScript/TypeScript symbols, APIs, or data types.
- **Data & Schema Fields**:
  - Project metadata from `package.json`: name `pixel-action`; Node engine `>=22.12.0`; runtime dependency Phaser `4.2.1`; development dependencies Vite `8.3.1` and Sharp `0.35.5`.
  - npm scripts, copied exactly from `package.json`:
    - `npm run dev` → `vite --host 127.0.0.1`
    - `npm run build` → `vite build`
    - `npm test` → `node --test test/*.test.js`
- **Execution Flow / Logic**:
  1. Create `README.md` in Korean. Start with Pixel Action as a browser-based pixel-art action game and explain the Forest and Mine stages. State that clearing Forest unlocks Mine and that the Mine boss sequence proceeds from the mining machine to the giant worm.
  2. Document controls exactly as shown by `SettingsScene` and implemented in `InputController`: `A`/`D` move, `Space` jump, left mouse button attack and point to aim, `Shift` roll, `E` dive attack, and `Esc` pause/resume. Mention music volume, SFX volume, screen-shake, and fullscreen settings.
  3. Explain that the game stores run progress, stage unlocks, records, and settings in browser local storage. Do not imply a server, account, cloud sync, or cross-browser save exists.
  4. Give the setup sequence `npm ci` then `npm run dev`; instruct the developer to open the local URL printed by Vite. State Node.js `>=22.12.0` as the requirement. Do not promise a deployed public URL.
  5. Include a directory guide with these responsibilities: `src/main.js` bootstraps Phaser; `src/game/scenes/` owns title/stage/settings/result screens; `sim/` owns game-state rules; `render/` owns Phaser presentation; `content/` contains stage definitions; `assets/` declares runtime assets; `input/`, `audio/`, and `storage/` implement their named services; `dev/` contains the development round selector; `public/assets/source/` stores source art; `public/assets/` contains runtime assets; `scripts/` regenerates images/music; `test/` contains Node tests; `docs/` contains supporting guides.
  6. Document asset regeneration after `npm ci`: run `node scripts/pack-art.mjs` to regenerate runtime PNGs from `public/assets/source/`, and `node scripts/generate-mine-music.mjs` to regenerate `public/assets/audio/music/mine-exploration.wav` and `public/assets/audio/music/mine-boss.wav`. Make clear these scripts write generated files under `public/assets/`.
  7. Document `npm test` and `npm run build` as project verification commands. Say the test script uses Node's test runner and that the repository has no browser E2E command; do not claim a test count or claim these commands were run as part of writing the README.
  8. Add a short browser checklist: start the dev server and load the title; start Forest and exercise movement, jump, mouse attack, roll, dive, pause/resume, and settings; use the development-only round selector to inspect Forest boss and Mine boss scenes, including the machine-to-worm transition; optionally follow normal Forest completion to confirm Mine unlock and local record/continue behavior. Note that practice-round records are not saved and that `VITE_DEV_ROUND_SELECTOR=false` hides the development selector; link its detailed guide rather than duplicating it.
  9. Link to `docs/asset-provenance.md` for the full image/audio history and required music attribution. Include a short correct credit for “Magic Forest” by Kevin MacLeod under CC BY 4.0, with the detailed document as the source of the license link and attribution wording.
  10. Do not embed old verification screenshots, create a live demo link, add a `LICENSE` file, or state a project-wide license. No root `LICENSE` or published demo URL exists in this checkout.
- **Error & Exception Handling**:
  - Do not modify source files to make the documentation fit. If a source-backed fact differs from this blueprint, follow the current source and revise the README wording, not game behavior.
  - Keep asset and selector guidance as links to the existing documents so detailed instructions do not become inconsistent copies.
- **State Transition & Return**:
  - The task produces one new root file, `README.md`; application state and tracked runtime assets remain untouched.

### I02. Audit content and local links

- Related Files:
  - `README.md` :: final content and local links; modify
  - `package.json` :: command/engine cross-check; read-only
  - `docs/asset-provenance.md` :: link target and credit details; read-only
  - `docs/round-selector.md` :: link target and selector details; read-only

#### Details
- Compare every command and version in the README with `package.json`.
- Confirm the listed controls, stage progression, save behavior, development-only selector, and asset script outputs against the source paths in I01.
- Resolve both relative documentation links from the repository root and ensure the README contains no screenshot, demo URL, or project-wide license assertion.
- Keep the browser checklist concise and clearly separate automated Node tests from manual browser inspection.

## Acceptance Criteria
- [ ] A root `README.md` exists in Korean and is written for developers onboarding to Pixel Action.
- [ ] It includes the game/stage summary, exact controls, browser-local save/settings behavior, Node requirement, setup, command list, architecture map, and both asset-generation commands.
- [ ] It includes `npm test`, `npm run build`, and a short manual browser checklist without claiming browser E2E automation exists.
- [ ] Links to `docs/asset-provenance.md` and `docs/round-selector.md` resolve.
- [ ] It makes no unsupported claim about a public demo or project-wide license and does not use stale screenshots.
- [ ] No product source, runtime asset, test, or license file is changed or added.

## Validation
- `Get-Content package.json` and compare the documented Node engine and npm scripts — every documented value matches the checked-in package metadata.
- `Test-Path -LiteralPath docs/asset-provenance.md; Test-Path -LiteralPath docs/round-selector.md` — both link targets return `True`.
- Manually review the README against the I01 source paths and the rendered Markdown structure — all claims are source-backed, headings and code fences are balanced, and links are repository-relative.
- Do not run `npm test` or `npm run build` solely for this documentation-only change; those commands are documented for project developers and no application code changes are planned.

## Commit Message
```text
docs(readme): add Korean developer guide

Plan: 2026-11-12-project-readme
Phase: P01-readme-documentation
Task: T01-write-root-readme

- Explain local setup, gameplay, architecture, and asset regeneration
- Document automated checks and a short browser smoke checklist
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in Git history
