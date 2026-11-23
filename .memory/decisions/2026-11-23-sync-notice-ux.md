# Decisions: Save and Sync Notice UX

- Date: 2026-11-23
- Status: Confirmed

## D01. Notice placement
- **Chosen**: Move all storage and sync status/error notices from the upper-right warning box to a bottom-center notification.
- **Rationale**: The upper-right box appears during ordinary saves, including after death, and distracts during play.
- **Scope**: Audio playback warnings remain separate and are not changed by this decision.

## D02. Routine status duration
- **Chosen**: Show routine states such as saving/syncing and successful completion in the rounded bottom-center toast for about 2.5 seconds, then fade it out.
- **Rationale**: These states need brief feedback but should not remain over gameplay.

## D03. Error behavior
- **Chosen**: Show storage/sync errors in the same bottom-center notification style with a retry button. Keep the error visible until storage/sync recovers.
- **Rationale**: Preserve a recovery action and avoid hiding a failed save while removing the top-right obstruction.

## D04. Existing recovery actions
- **Chosen**: Storage and connection errors use **다시 시도**. An expired login uses **다시 로그인**. An account-access denial explains the problem and offers **로그아웃**.
- **Rationale**: A retry cannot resolve an expired session or a denied account; each error needs an action that can address its cause.

## Existing code findings
- Death handling immediately persists the save. The account store reports `sync-pending`, and the current top-right `storage-warning` displays every non-null store status, including this routine state.
- The app already has a global bottom-center status toast subscribed to the same store updates. This creates duplicate feedback; implementation should consolidate the two notice paths.
- Local storage retry and account sync retry are different store operations. The toast needs callbacks for sign-in and sign-out to support the selected authentication actions.
- Audio playback warnings are a separate notice and remain unchanged.
