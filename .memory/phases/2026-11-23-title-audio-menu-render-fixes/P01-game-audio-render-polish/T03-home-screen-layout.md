# Task: T03 Remove Home Title and Reposition Status

## Status: done

## Goal

Match the supplied home-screen references: remove the visible “Pixel Action” heading, show account controls at lower-left without a container box, show save/sync feedback in a transient bottom-center toast, and place audio errors at lower-right.

## Decision Summary
- Keep the forest background, home menu buttons, and all submenu headings. Hide only the home heading.
- Keep account name at lower-left and place logout directly below Settings in the right-side menu; show sync feedback in a transient toast; move `.audio-warning` to lower-right.

## Implementation

### I01. Make the home heading optional and attach account status to the title overlay
- Related Files:
  - `src/game/ui/menu.js` :: `mountMenu(title, subtitle, options)`, `mountAccountStatus(menu, store, options)`; modify.
  - `src/game/scenes/TitleScene.js` :: `showMain()`; modify.

#### Signatures & Types
```js
mountMenu(title, subtitle = '', options = {
  variant?: 'panel' | 'title',
  layout?: 'panel' | 'main' | 'submenu',
  showMainHeading?: boolean,
  accessibleLabel?: string
}) // returns the existing menu handle

mountAccountStatus(menu, store, options = {
  showAccount?: boolean,
  showSignOut?: boolean,
  placement?: 'panel' | 'root',
  showLocalDevStatus?: boolean
}) // returns HTMLElement | null
```

#### Details
- Add a `showMainHeading` option to `mountMenu()`, default `true` to preserve existing panel/submenu behavior. For false on the main title layout, omit the visible `<h2>` and give the root a useful accessible name such as `메인 메뉴`.
- In `TitleScene.showMain()`, request the main title layout with `showMainHeading:false`. Preserve the forest background, button labels/order, record popup, mode selection, and submenu headings.
- Add an account-status placement option to `mountAccountStatus()`, defaulting to the current panel parent. For the home screen only, append the whole status row to the title overlay root.
- Preserve the authenticated account name and sign-out action. Use a clearly labeled local-only status in Vite development without presenting it as an authenticated account.
- Keep the home account name text-only, with no enclosing background, border, shadow, or padding. Place the sign-out control after the Settings menu action and style it like the other menu buttons. Do not move account controls in result/record dialogs.
- Subscribe to save/sync state across the app and show a rounded bottom-center toast for about 2.5 seconds, then fade it out. Use a device-save message in local development and sync messages for authenticated accounts.
- Anchor account controls and title-screen notifications to a 40:19 bounds element matching the contained forest artwork; preserve notices when menus are replaced or hidden.

### I02. Apply safe-area layout and move audio error notice
- Related Files:
  - `src/styles.css` :: title overlay/main/panel/heading rules, `.account-status`, sign-out button rule, `.audio-warning`, and responsive rules; modify.

#### Details
- Anchor the home status row to lower-left with safe-area-aware insets. Limit its width to `min(520px, calc(50vw - 20px))` so the opposite corner stays clear. Keep it compact horizontally on desktop; allow wrapping on narrow viewports so all status and logout controls stay readable/clickable.
- Move `.audio-warning` from bottom-left to bottom-right with safe-area-aware insets and `max-width: min(360px, calc(50vw - 20px))`. The half-viewport width limits leave a horizontal gap between the two notices even at narrow widths. Preserve warning z-index, styling, `role=status`, error copy, and recovery behavior.
- Style the title-home sign-out button as a right-side menu action; do not alter sign-out button styling in other dialogs.
- Remove obsolete visible-heading position rules and short-height override if the main heading is no longer rendered. Keep `.game-panel--title` at its current right-side placement so the menu does not shift when the heading disappears.
- Preserve title background image, shading, and pixel rendering. Do not change the browser document title or other heading text.

## Acceptance Criteria
- [x] Home has no visible “Pixel Action” heading; forest background and menu remain in their current positions.
- [x] Account identity is text-only at lower-left; logout is directly below Settings and matches the other right-side menu actions.
- [x] Save/sync changes appear in a rounded bottom-center toast and fade after about 2.5 seconds.
- [x] Audio warnings are lower-right and the toast stays clear of them at desktop or narrow widths.
- [x] Submenu headings and non-home account status retain their current layout and behavior.

## Validation
- `npm run build` — production bundle compiles.
- Manual browser review — signed-in home at wide/narrow sizes, sync-state update, logout, audio-warning display, keyboard reachability, and title submenus.

## Commit Message
```text
feat(ui): simplify the home screen layout

Plan: 2026-11-23-title-audio-menu-render-fixes
Phase: P01-game-audio-render-polish
Task: T03-home-screen-layout

- Remove the visible home heading and anchor account status lower-left
- Move audio errors lower-right to keep both corners clear
```

## Progress
- [x] Implementation complete
- [x] Validation complete
- Build: `npm.cmd run build` passed; `git diff --check` passed.
- Production deployment: GitHub Actions run `45172348923` succeeded for `ccf0d18`.
- Browser review: after refreshing the signed-in company profile at the production URL, the 518×1039 view showed no home heading; the account name remained text-only at lower-left; Start, Records, Settings, and Logout all stayed inside the forest artwork, with Logout directly below Settings. The production Records and Settings screens were also opened; the wide home layout had been checked earlier.
- The stale `top: 58%` heading-era position and short-height overrides were removed so the menu uses its centered artwork layout. Local wide/narrow previews and the deployed narrow view now keep the menu inside the artwork.
- Settings volume was temporarily changed from 50% to 55% and restored to 50%; settings are device-local. No gameplay progress or cloud record was changed.
- Save/sync toast and lower-right audio-warning behavior were checked in the deployed source and existing T01 browser review. The Logout button was not activated, preserving the signed-in company session; its placement, native button semantics, focus styling, and callback path were inspected.
- Completed in `ccf0d18`; deployment and post-deployment narrow-layout check are complete.
