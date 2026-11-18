# Task: T01 Fullscreen Title Background and Text Menu

## Status: done

## Goal

Render the existing Forest backdrop across the full title-menu area and present the main title and its submenus as a readable right-side text menu, without changing navigation, saved data, or non-title menu panels.

## Decision Summary

- Keep the complete 640×304 Forest artwork visible with `contain`, center the existing “Pixel Action” title horizontally at 20% viewport height, and place title-flow choices at the right center over a right-side-only dark gradient.
- Use 20px bold ivory system text with 12px choice spacing; gold text, a small `›`, and a subtle glow mark hover/focus. Keep button semantics and every existing action and status unchanged.
- Only the normal title menu and its submenus opt in. Asset recovery, pause, settings, and result menus retain the current boxed-panel presentation.

## Implementation

### I01. Add an opt-in title presentation to the shared menu builder

- Related Files:
  - `src/game/ui/menu.js` :: `mountMenu` — add title-variant DOM classes and title/submenu heading placement; modify
  - `src/game/scenes/TitleScene.js` :: `showMain`, `showPracticeRounds`, `showStages`, `confirmNew`, `showRecords` — opt normal title flow into the new variant; modify
  - `src/styles.css` :: `.game-overlay`, `.game-panel`, title menu selectors — scope background and text-menu styling; modify

#### Details

- **Signatures & Types**:

      export function mountMenu(
        title,
        subtitle = '',
        { variant = 'panel', layout = 'panel' } = {}
      )

  - `variant` is either `panel` or `title`; its default is `panel`.
  - `layout` is either `panel`, `main`, or `submenu`; its default is `panel` and it is used only when `variant` is `title`.
  - Preserve the returned object shape: `{root, panel, text, button, range, checkbox, focus, hide, show, remove}`. Do not change signatures of its returned methods.

- **Data & DOM Fields**:
  - Panel variant: preserve the existing root class `game-overlay`, panel class `game-panel`, heading placement inside the panel, subtitle paragraph, return object, and default behavior.
  - Title variant root: add `game-overlay--title` and exactly one layout class, `game-overlay--title-main` or `game-overlay--title-submenu`.
  - Title variant panel: keep `game-panel` and add `game-panel--title`.
  - Main layout: create the `h2` with class `title-menu-heading` as a direct child of the root, before the panel; put menu buttons in the panel; do not create a subtitle paragraph even if one is passed accidentally.
  - Submenu layout: create the `h2` as the first child of the panel, then the optional subtitle paragraph, then the existing text, buttons, and form controls in their current append order.

- **Execution Flow / Logic**:
  1. In `mountMenu`, treat omitted options as `{variant:'panel', layout:'panel'}` so every current caller continues to produce the existing panel DOM.
  2. For `variant:'title'`, add the title root and panel classes. For `layout:'main'`, put the heading directly under root and omit subtitle text; for `layout:'submenu'`, keep heading and any subtitle at the top of the right-side panel.
  3. Leave `text`, `button`, `range`, `checkbox`, `focus`, `hide`, `show`, and `remove` behavior intact. Buttons remain native `button type="button"`; disabled remains the native `disabled` attribute. Keep the current `focus()` selector so the first enabled button/input receives focus.
  4. In `TitleScene.showMain`, replace the current `mountMenu('Pixel Action','저주받은 숲')` call with the title/main variant and no subtitle. Keep the existing five-or-fewer button creation order and callbacks unchanged.
  5. In `showPracticeRounds`, `showStages`, `confirmNew`, and `showRecords`, pass the title/submenu variant while preserving all existing subtitle strings, record text, buttons, conditions, and callbacks.
  6. Do not opt the asset-error recovery call in `create()` into title styling. Do not modify `StageScene`, `SettingsScene`, or `ResultScene`; their calls continue to use the default panel variant.

- **CSS Layout & Appearance**:
  - Keep all existing `.game-overlay` and `.game-panel` rules as the default panel appearance. Add separate selectors rooted at `.game-overlay--title` so the shared panel, result, storage warning, and settings styles do not change.
  - Make `.game-overlay--title` fill its containing `#game`, use a near-black forest fallback such as `#0b1113`, and draw the existing `/assets/world/forest/backdrop.png` as a centered, non-repeating second background layer with `background-size: contain`. The first layer is a horizontal gradient that is transparent across the left side and darkens only the right menu area. Set the gradient layer to `100% 100%`; never use `cover` for the artwork layer.
  - On a 640×360 area, the 640×304 image must remain 640×304, centered with 28px top and bottom letterbox space. Keep the artwork sharp using the existing pixel-art rendering convention.
  - For title submenus, center `.game-panel--title` vertically, position its right edge with a responsive 16–72px inset, and constrain it to `min(360px, calc(100vw - 32px))`. Remove panel padding, border, background, and box shadow. Set `max-height` to 82% of the title area and `overflow-y:auto` so long lists scroll instead of colliding or clipping.
  - For the main layout, put the direct-child heading at `left:50%; top:20%` with `translate(-50%,-50%)`; keep it single-line when space permits and let it wrap within `min(520px, calc(100vw - 32px))`. Position the menu panel at `right:clamp(16px, 5vw, 72px); top:58%` with `translateY(-50%)`; constrain width to `min(360px, calc(100vw - 32px))` and height to at most `calc(100% - 110px)`. This vertical separation keeps the heading above the choices on short 16:9 screens; on smaller viewports, retain scrolling rather than overlap.
  - Use `display:flex; flex-direction:column; gap:12px` for title panel content. Style title-flow buttons at 20px, weight 700, line-height 1.25, ivory `#f2edda`, transparent background, no border, no shadow box, right-aligned text, and zero outer margin. Retain enough right padding for the selection marker.
  - Add a `::before` marker with content `›`, positioned at the button's right edge and hidden at rest. On enabled `:hover` and `:focus-visible`, show the marker, switch text to a warm gold (for example `#f1cf78`), and apply a low-intensity text shadow. Do not add a filled rectangle or button border. Disabled choices remain dim and non-interactive; they do not receive the gold selection treatment.
  - Style title submenu headings above the list and right-align them. Keep descriptions/record text readable in the same column, with no overlap against headings or choices. Do not hide any existing text.
  - Add a short-height responsive rule for viewports at or below 500px high: move the main heading to about 14% height, preserve the menu panel's 58% center, and cap the main panel at `calc(100% - 100px)` with vertical scrolling. On narrow widths, keep the title centered and the menu within 16px of the right edge; allow text to wrap and preserve keyboard focus visibility.

- **Error & Exception Handling**:
  - Unknown or omitted options must fall back to the existing panel variant; do not throw or alter legacy callers.
  - If the background asset fails to load, the root fallback color still provides contrast and all menu controls remain usable.
  - Long submenu content must scroll within its own title panel. It must not hide or overlap a choice, heading, or description.
  - Do not alter asset error messages or the recovery button; keeping that screen on the default panel variant preserves its current recovery affordance.

### I02. Verify title-flow presentation and legacy panel isolation

- Related Files:
  - `src/game/scenes/TitleScene.js` :: title and submenu routes — read/verify
  - `src/game/scenes/StageScene.js`, `src/game/scenes/SettingsScene.js`, `src/game/scenes/ResultScene.js` :: shared panel callers — read/verify only
  - `src/styles.css` :: title variant and default selectors — verify

#### Details

- **Screen checks**:
  1. Run the game locally and inspect the title screen at 640×360 and a narrow viewport. Confirm the entire Forest backdrop is visible without cropping, 16:9 has vertical letterbox space, and the dark gradient is limited to the right.
  2. Confirm “Pixel Action” is centered horizontally in the upper portion, “저주받은 숲” is absent, and the main choices sit at the right center without colliding with the title.
  3. Visit the practice-round, stage-selection, new-run confirmation, and records menus. Confirm each submenu heading precedes its options, existing descriptions/warnings remain visible, and long content scrolls without overlap.
  4. Check mouse hover and keyboard Tab/Enter. Confirm gold text, `›`, and subtle glow follow the hovered/focused enabled option; native actions, disabled continue behavior, and initial focus remain unchanged.
  5. Open pause, settings, result, and asset-error recovery screens. Confirm each retains its existing panel style and controls.

- **Validation Commands**:
  - `npm.cmd run build` — production build completes.
  - `git diff --check` — no whitespace errors.
  - Manual local browser inspection described above — no text/art overlap and title-only styling verified across all listed routes.

## Acceptance Criteria

- [x] The full existing Forest image renders across the title flow with its aspect ratio preserved and visible letterbox space where needed.
- [x] Only the right menu area receives a dark readability gradient; the rest of the artwork is not covered by a full-screen dark tint.
- [x] Main title text is horizontally centered above screen midpoint, its subtitle is removed, and menu choices occupy the right-center area.
- [x] Every title submenu uses the same integrated text-menu style, with heading and existing descriptions above/before the options and no overlapping content.
- [x] Menu choices use bold 20px system text, ivory idle state, 12px spacing, transparent/no-box styling, and gold + `›` + subtle glow on hover/focus.
- [x] Click, Tab, Enter, initial focus, disabled state, all actions, descriptions, and confirmation warnings behave exactly as before.
- [x] Asset-error recovery, pause, and settings remain on the current boxed-panel style. ResultScene and its result-specific CSS were unchanged; the result route was not reached during screen capture.
- [x] Production build and title-flow visual checks pass; no unrelated game behavior or saved-data format changes.

## Validation

- `npm.cmd run build` — passed with no build failure.
- `git diff --check` — passed.
- `node --test test/title-menu.test.js` — 4/4 passed. The title layout tests failed before implementation and passed after the opt-in variant was added.
- Full regression run using an explicitly expanded PowerShell file list — 177/178 passed. The unrelated `test/knockback.test.js:51` test fails with expected x=200 and actual x=184; neither that test nor simulation code was changed.
- `npm.cmd test` does not expand the package script's `test/*.test.js` glob in this Windows shell, so the complete test file list was passed directly to Node instead.
- Isolated headless Chrome/CDP inspection at 640×360 and 360×640 — the main title and menu geometry did not overlap; the 640×360 artwork used `100% 100%, contain` and showed 28px top/bottom letterbox bands. Hover computed to gold text and a visible `›`; Tab focused the next enabled control and Enter opened its submenu.
- Screen captures verified the title, practice rounds, stage selection, records, confirmation, pause, settings, and asset-error recovery routes. The ResultScene route was not reached; its caller and result-specific selectors were unchanged.

## Commit Message

    feat(ui): redesign title menu over forest backdrop

    Plan: 2026-11-18-title-screen-background-and-menu
    Phase: P01-title-menu-redesign
    Task: T01-fullscreen-title-background-and-text-menu

    - Show the full Forest backdrop behind the title menu flow
    - Replace title-flow boxes with responsive focused text choices

## Progress

- [x] Implementation complete
- [x] Task-scoped validation passed; see the unrelated full-suite failure noted above.
- commit: committed (see git log)
