# Task: T02 ArrowDown and Space Platform Drop-Through

## Status: done

## Goal
Allow the player to drop through the floating platform currently supporting them by holding ArrowDown and pressing Space, while preserving normal jumping off the floor and compatibility with saved rectangular platforms.

## Upstream Completion Record
- Completed in `d7f657b3b73ec91de347251d3327326a271d82b5` on the latest `origin/main`; the upstream plan `.memory/plans/2026-11-22-platform-drop-through.md` records P01/T01 as complete.
- The upstream input queues `dropPressed` when Space is pressed while `KeyS` or `ArrowDown` is already held. This satisfies the requested ArrowDown+Space chord and preserves the existing S shortcut.
- `stepPlayer()` uses `dropPlatforms` indices to ignore only floating supports while the player clears them, starts the fall at `PLATFORM_DROP_SPEED=80`, and keeps other platforms and the floor collidable. The saved indices allow a drop to continue after restore without a save-version bump.
- Upstream validation is recorded as focused input/player/stage/save tests, full `npm test`, `npm run build`, and a manual browser check. This is upstream evidence; those commands were not run in this local planning update.

> The implementation proposal below is historical and superseded by the upstream implementation record above. Do not execute it as a new task.

## Decision Summary
- Only the platform directly supporting a grounded player may be ignored. Current profiled one-way surfaces and legacy rectangular platforms are supported; floor, arena walls, and other platforms remain collidable.
- The temporary ignored legacy rectangle is snapshot-safe. Old saved players missing its field are migrated to `null` during restoration.

## Historical Implementation Proposal (Superseded)

### I01. Capture the down-held input and detect a valid drop request

- Related Files:
  - `src/game/input/InputController.js` :: `InputController` constructor, `sample`, `reset` — capture ArrowDown without queuing it; modify
  - `test/input.test.js` :: key-held, default, reset, and `preventDefault` assertions; modify
  - `src/game/sim/player.js` :: `createPlayer`, `stepPlayer` — consume the chord and select a supporting platform; modify
  - `src/game/sim/platforms.js` :: `crossedPlatformSurface` — allow one selected profile segment to be skipped during drop; modify
  - `src/game/sim/stage.js` :: `stepStage` — pass saved rectangular platforms separately; modify

#### Details
- **Signatures & Types**:
  ```typescript
  // InputController.sample(scene) adds:
  type SampledInput = {
    move: number; jumpPressed: boolean; jumpHeld: boolean; downHeld: boolean;
    attackPressed: boolean; rollPressed: boolean; divePressed: boolean;
    aimX: number; aimY: number;
  };

  export function stepPlayer(
    state: Player, input: SampledInput, terrain: Rect[], pitDeathY?: number,
    platformProfiles?: ProfiledPlatform[], platformRects?: Rect[]
  ): { player: Player; events: PlayerEvent[]; pushCompleted?: number };

  export function crossedPlatformSurface(
    actor: Rect, platforms: ProfiledPlatform[], previousFeet: number,
    nextFeet: number, ignoredSurface?: { x: number; y: number }
  ): { platform: ProfiledPlatform; sectionIndex: number; y: number } | null;
  ```
- **Data & Schema Fields**:
  - Add `downHeld: boolean` to the sampled input object. It is derived from held key `ArrowDown`; it is not queued like `jumpPressed`.
  - Add `dropThroughPlatform: null | { x: number; y: number; w: number; h: number }` to `createPlayer`. It is non-null only while passing through a legacy rectangular platform.
  - Add `platformRects?: Rect[]` as the final optional `stepPlayer` parameter. Existing callers remain compatible because it defaults to `[]`.
- **Execution Flow / Logic**:
  1. In `InputController`, add `ArrowDown` to the prevented gameplay keys and return `downHeld: this.held.has('ArrowDown')`. Existing UI-target filtering and reset behavior continue to apply.
  2. On `input.downHeld && input.jumpPressed && p.grounded`, find the support under the player's horizontal body: a profile surface at the player's center and feet, or a legacy rectangle whose top equals the player's feet and whose horizontal range overlaps the player.
  3. If a profile surface supports the player, store its 16-pixel section start and `y` as the ignored surface, set `grounded=false`, suppress the jump, and start normal gravity after moving the feet one pixel below the surface. Pass this one surface to `crossedPlatformSurface` to prevent re-landing on the same crossing.
  4. If a rectangular platform supports the player, store that exact rectangle in `dropThroughPlatform`, set `grounded=false`, suppress the jump, and start normal gravity. During X/Y movement, filter only that exact rectangle from solid collisions until `player.y >= platform.y + platform.h`; then clear the field. Do not filter the floor, walls, or any other platform.
  5. If no floating platform supports the player, process Space as the normal jump. Movement, attack, roll, and dive inputs keep their current behavior.
  6. In `stepStage`, derive `platformRects` from `run.terrainLayout.platforms.filter(platform => !isProfiledPlatform(platform))` and pass both platform collections to `stepPlayer`; the floor and stage walls remain only in `terrain`.
- **Error & Exception Handling**:
  - Missing `downHeld` in older direct simulation input fixtures behaves as false. A drop request without a valid support is a normal jump, not a no-op.
  - In `restoreStageRun`, before strict player-key validation, set a missing `dropThroughPlatform` field to `null` for legacy snapshots. If present and non-null, require exactly `x,y,w,h`, finite positive dimensions, and an exact match to a saved rectangular platform in `terrainLayout`; otherwise reject the snapshot with the existing invalid-snapshot error.
- **State Transition & Return**:
  - Platform-grounded + chord → falling through the selected platform; floor-grounded + chord → ordinary jump; unsupported/airborne chord → existing behavior. The ignored rectangle clears once the player's top is below its bottom.

### I02. Simulation, save-compatibility, and input tests

- Related Files:
  - `test/player.test.js` :: profile and rectangle drop-through scenarios; modify
  - `test/stage-lifecycle.test.js` :: floor/wall retention and restored-run behavior; modify
  - `test/save-store.test.js` :: old snapshot migration and invalid drop-platform records; modify

#### Details
- Add tests for dropping through a profiled platform without re-landing on it, dropping through a legacy rectangle until the player's top clears its bottom, landing on the floor below, and ordinary Space jump when not supported by a floating platform.
- Add input assertions that ArrowDown is held in samples, is cleared by blur/disable/reset, and does not create a pressed-edge queue.
- Verify an old snapshot without `dropThroughPlatform` restores with `null`; a valid active drop snapshot round-trips; malformed or non-layout rectangles are rejected.

## Acceptance Criteria
- [ ] ArrowDown held + Space pressed while supported by either platform format drops the player through that support.
- [ ] Space remains a normal jump on the floor; the floor, walls, and non-supporting platforms are never ignored.
- [ ] A save created before this field existed still restores; a save made during a legacy-platform drop continues the same drop after restore.
- [ ] Existing jump, roll, dive, and attack input behavior remains unchanged.

## Validation
- `node --test test/input.test.js test/player.test.js test/stage-lifecycle.test.js test/save-store.test.js` — input, platform movement, snapshot migration, and save validation tests pass.
- `npm run build` — Vite production build completes successfully.
- Manual browser check — hold ArrowDown and tap Space on a new platform and a legacy rectangular platform; confirm floor jumping remains normal.

## Commit Message
```text
feat(player): drop through platforms with down and jump

Plan: 2026-11-20-gameplay-round-safety
Phase: P01-gameplay-safety-and-controls
Task: T02-platform-drop-through

- Add ArrowDown held input and platform drop-through state
- Preserve old snapshots and keep floors solid
```

## Progress
- [x] Upstream implementation complete
- [x] Upstream validation recorded in the completed platform-drop-through plan
- commit: `d7f657b3b73ec91de347251d3327326a271d82b5` (upstream `origin/main`; local checkout still needs synchronization)
