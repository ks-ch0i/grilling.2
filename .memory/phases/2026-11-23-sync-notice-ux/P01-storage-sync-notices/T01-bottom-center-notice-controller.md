# Task: T01 Consolidate Save and Sync Notices

## Status: done

## Goal

Show save and sync activity through one bottom-center toast, while keeping storage/sync failures visible and giving each failure its appropriate recovery action. Death-triggered saves must no longer create a duplicate upper-right box.

## Decision Summary

- Routine states fade after about 2.5 seconds. Errors remain until the store reports recovery.
- Storage/network errors retry; expired authentication offers sign-in; forbidden access explains the denial and offers sign-out.
- Keep the separate audio warning unchanged and avoid visual overlap with the toast.

## Implementation

### I01. Consolidate store notice rendering and actions

- Related Files:
  - `src/game/ui/menu.js` :: `mountAccountSyncToast`, `showAccountToast`, `syncLabels`, `mountStorageNotice` — own the app-wide store subscription, notice rendering, retry/auth actions, timers, and cleanup; modify/remove.
  - `src/game/scenes/TitleScene.js` :: `create()` — remove the per-title-scene storage notice mount; modify.
  - `src/main.js` :: `startGame(store)`, `signOutAccount(store)` — pass the existing sign-in and account sign-out flows into the toast; modify.
  - `src/styles.css` :: `.storage-warning`, `.account-sync-toast`, `.audio-warning` layout rules — remove obsolete top-right styles and add routine/error/actionable toast styling; modify.
  - `src/game/storage/appStore.js` :: `createAppStore`, `createAccountAppStore` — reference warning values and synchronous/asynchronous retry semantics; read-only.
  - `src/game/auth/swaAuth.js` :: `signIn()`, `signOut()` — reference existing Entra redirects; read-only.
  - `src/game/scenes/easySession.js` :: `handleEasyDeath(scene)` — verify the immediate save remains in place; read-only.
  - `src/game/storage/runCoordinator.js` — verify hard-mode record persistence remains in place; read-only.
  - `src/game/audio/AudioManager.js` — reference the independent `.audio-warning` creation/removal lifecycle; read-only.

#### Signatures & Types

```typescript
type SaveWarning =
  | 'invalid'
  | 'unsupported-version'
  | 'unavailable'
  | 'conflict'
  | 'storage-unavailable'
  | 'sync-pending'
  | 'sync-unavailable'
  | 'unauthorized'
  | 'forbidden'
  | null;

type SaveStore = {
  hasAuthenticatedAccount?: () => boolean;
  getAccount?: () => { userId: string; displayName: string } | null;
  subscribe: (listener: (warning: SaveWarning) => void) => () => void;
  retry: () =>
    | { ok: boolean; reason?: SaveWarning }
    | Promise<{ ok: boolean; reason?: SaveWarning }>;
};

type AccountNoticeActions = {
  onReauthenticate?: () => void | Promise<void>;
  onSignOut?: () => void | Promise<void>;
};

function mountAccountSyncToast(
  store: SaveStore,
  actions?: AccountNoticeActions
): () => void;
```

#### State and Copy Mapping

- Initial `null`: render no toast.
- `sync-pending`: show `동기화 중` as a polite, transient toast.
- Authenticated warning transition to `null`: show `동기화 완료` transiently.
- Unauthenticated/local store successful persist transition to `null`: show `기기에 저장됨` transiently. Ignore the initial subscription callback when its value is `null`.
- Persistent storage/network errors use the matching copy and a `저장 다시 시도` button:
  - `invalid`: `저장 데이터가 손상되어 덮어쓰지 않았습니다. 현재 진행은 저장되지 않습니다.`
  - `unsupported-version`: `지원하지 않는 저장 버전입니다. 기존 데이터를 보존하며 현재 진행은 저장되지 않습니다.`
  - `unavailable`: `저장 공간을 사용할 수 없습니다. 현재 진행은 메모리에만 있습니다.`
  - `conflict`: `기존 저장이 발견되어 덮어쓰지 않았습니다. 저장 상태를 확인해 주세요.`
  - `storage-unavailable`: `이 기기의 저장 공간을 사용할 수 없습니다. 기록이 안전하게 보관되지 않을 수 있습니다.`
  - `sync-unavailable`: `서버에 연결할 수 없습니다. 기록은 이 기기에 보관되며 연결이 복구되면 전송합니다.`
- `unauthorized`: show `로그인 세션을 다시 확인해야 합니다. 계정 저장 동기화가 멈췄습니다.` and a `다시 로그인` button calling `actions.onReauthenticate`.
- `forbidden`: show `이 계정은 저장 데이터에 접근할 수 없습니다. 기록을 서버에 전송하지 않았습니다.` and a `로그아웃` button calling `actions.onSignOut`.
- Unknown non-null warning: show `저장에 실패했습니다.` and a `저장 다시 시도` button.
- When an error clears to `null`, replace it with the appropriate transient success label. Do not hide an error on a timer.

#### Execution Flow / Logic

1. `mountAccountSyncToast` creates one toast in `#game` and installs the only app-wide save/sync subscription. Keep the current call site in `startGame`; do not add another subscription in a scene.
2. Preserve the initial callback behavior: ignore initial `null`, show initial `sync-pending` transiently, and show any initial error persistently.
3. Render routine statuses as `role="status"` with polite live announcements. Restart the 2.5-second hide timer when a new routine status arrives. Fade out, then hide after the existing transition duration.
4. Render errors as `role="alert"` with assertive live announcements. Keep the notice visible and update its message/action when the warning changes. Do not add auto-dismiss or a close button.
5. Do not let a transient `sync-pending` update erase an unresolved persistent error. Keep the error displayed until the store emits `null` or a different non-routine error; then display the new state. Clear the error action only when the error clears or is replaced.
6. Retry handler disables its button and marks the toast busy, then awaits `Promise.resolve(store.retry())` because local-store retry is synchronous while account-store retry returns a promise. Re-enable the button if the call throws or resolves without clearing the warning. Let store subscription updates decide whether to retain the error or show success.
7. `unauthorized` invokes only `actions.onReauthenticate`; `forbidden` invokes only `actions.onSignOut`. Do not call `store.retry()` for either authentication state. Disable the selected action while it runs; restore it if the callback rejects or throws before navigation/teardown.
8. In `src/main.js`, call the toast mount with `onReauthenticate: signIn` and `onSignOut: () => signOutAccount(store)`. Preserve the existing game destruction, app-store cleanup, SWA redirect, and toast cleanup performed by those functions.
9. Delete `mountStorageNotice` and its message map from `menu.js`; remove its import and invocation from `TitleScene.create()`. Remove `.storage-warning` styling and all selector references that exist only to support it. Keep `AudioManager.js` and `.audio-warning` copy/behavior unchanged.
10. Reuse `.account-sync-toast` and its current relocation between `#game` and `.title-art-bounds`. Add distinct routine/error classes and append error message and button as separate DOM nodes. Error buttons must be keyboard reachable, expose a visible focus style, and remain clickable inside `.title-art-bounds` despite that container's `pointer-events:none`; set pointer events on the toast/action appropriately.
11. Keep the toast horizontally centered and safe-area aware. When `.audio-warning` is visible, compare the toast and audio-warning bounds and lift the toast only as much as needed to create at least an 8px gap. Recalculate when either notice changes size/visibility or the viewport resizes; clean up any observer/listener on toast unmount. Do not move or restyle the audio warning.
12. Cleanup unsubscribes from the store, disconnects observers, removes resize listeners, clears both hide/fade timers, removes the toast, and resets active-toast state so a restarted game cannot receive stale updates.

### I02. Preserve death-save behavior while removing the duplicate notice path

- Related Files:
  - `src/game/scenes/easySession.js` :: `handleEasyDeath(scene)` — verify the death save still calls `store.persist({ immediate: true })`; read-only.
  - `src/game/storage/runCoordinator.js` — verify hard-mode death/record persistence still runs; read-only.
  - `src/game/scenes/TitleScene.js` :: `create()` — remove only the duplicate notice mount; modify.

#### Details

- Do not delay, suppress, or remove any save or death-count operation. Change only how save/sync states are presented.
- Easy-mode death may produce `sync-pending`; this must display only the bottom-center transient toast, never the old upper-right box.
- Hard-mode death/record saves use the same app-wide toast controller.
- Verify local save errors and cloud sync errors use the persistent bottom-center notice and remain actionable.

## Acceptance Criteria

- [x] Death-triggered saves use the app-wide notice path; the duplicate upper-right storage notice is removed.
- [x] Routine pending/success/local-save feedback uses the transient toast; local-save feedback was observed in-browser and the 2.5-second fade timer was reviewed in source.
- [x] A storage failure stays visible with an enabled retry action; a retry against the still-failing storage kept the error visible.
- [x] Expired-login and forbidden states map to reauthentication and sign-out actions; verified by source review because the local session has no authenticated account.
- [x] Error buttons are keyboard-focusable with visible focus styling; routine/error live-region roles were reviewed in source.
- [x] The audio warning remains separate and the toast clears it at wide and narrow viewport sizes.
- [x] Save persistence and death-save call sites remain unchanged; reviewed in the existing store/coordinator paths.

## Validation

- `npm.cmd run build` — production bundle compiles.
- No automated tests are added or run for this task.
- Browser review used a disposable Edge InPrivate session so existing Netflix/YouTube tabs were left untouched.
- Wide viewport (1920×1080): verified the storage-error toast and retry action at bottom center, with the audio warning at lower-right and no overlap.
- Narrow viewport (516×1039): verified local-save feedback, a persistent storage-error toast, retry behavior, and the error/audio-warning layout together. The toast moved above the audio warning and remained readable.
- The storage failure was induced only in the InPrivate page by making `Storage.prototype.setItem` throw; the app emitted its real `unavailable` warning. Clicking retry while storage remained unavailable kept the notice visible.
- Entra `unauthorized`/`forbidden` states were not exercised in a signed-in browser session. Their message/action mapping and `main.js` callback wiring were reviewed in source; no account credentials or production session were used.
- No automated tests were added or run, as directed. `npm.cmd run build` passed; the existing Phaser chunk-size advisory remains.

## Commit Message

```text
fix(ui): consolidate save and sync notices

Plan: 2026-11-23-sync-notice-ux
Phase: P01-storage-sync-notices
Task: T01-bottom-center-notice-controller

- Remove duplicate upper-right storage notice
- Keep errors actionable in the bottom-center toast
```

## Progress

- [x] Implementation complete
- [x] Validation complete
- Build: `npm.cmd run build` passed. Existing Phaser bundle-size warning remains.
- Browser review: complete for local save, storage failure/retry, and audio-warning layout at wide and narrow sizes. Authentication warning states were source-reviewed because local development has no authenticated account.
- Commit: implementation and plan are in `5445a5f`; browser-review completion is recorded in the follow-up memory commit.
