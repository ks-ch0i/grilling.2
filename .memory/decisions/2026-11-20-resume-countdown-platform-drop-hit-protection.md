# Decisions: Resume, Platform Drop, Hit Protection, and Round Spawn Safety

- Date: 2026-11-20
- Status: Confirmed

## D01. Resume countdown
- **Chosen**: On resume, show `3 → 2 → 1` over about one second. Keep the game simulation paused until the countdown ends. Pressing Escape during the countdown cancels it and returns to the pause menu, with gameplay still paused.
- **Rationale**: The short countdown gives the player a moment to prepare without letting enemies or combat timers advance. Escape remains a way to return to a safe pause state.

## D02. Drop through platforms
- **Chosen**: While standing on a floating platform, holding ArrowDown and pressing Space drops the player through the platform that supports them. This applies to both current profiled platforms and legacy rectangular platforms. On the floor or away from a platform, Space remains a normal jump; floors and walls remain solid.
- **Rationale**: The requested control works consistently across new terrain and previously saved terrain without making the arena floor or walls passable.

## D03. Existing post-hit protection
- **Chosen**: Set post-hit protection to one second (60 simulation ticks). Apply it to ordinary enemy, boss, projectile, and hazard damage through the existing shared guard. Pit death remains lethal.
- **Rationale**: The existing shared protection is only 45 ticks (0.75 seconds), which players found too short. One second gives them more time to recover after a hit without changing the shared damage rules.

## D04. Hostile spawn overlap
- **Chosen**: Keep the selected enemy roster and retry/re-plan positions so player artwork does not overlap any hostile at round starts or during a boss appearance. Include regular enemies, round-start bosses, and the round-8 Worm reveal after Machine defeat. Do not allow a boss-position fallback to place a boss overlapping the player.
- **Rationale**: Retrying positions preserves the round's enemy composition while preventing an enemy or boss from appearing on top of the player.

## Codebase notes
- `StageScene.resumeGame()` currently resumes immediately. `pauseReset()` clears accumulated time and queued/held input; the countdown must keep simulation updates paused until it finishes.
- `InputController` currently maps A/D movement and Space jump, but has no ArrowDown input.
- Current profiled platforms use top-surface crossing checks. Legacy fixed platforms are rectangular solids. Drop-through must support both collision paths while leaving the floor and walls solid.
- Damage sources route through `applyPlayerDamage()`. The current timer is 45 ticks at 60 ticks per second (0.75 seconds), and the player sprite blinks during the timer. The shared guard is present; source inspection alone does not reproduce the reported gameplay symptom.
- Regular enemy placement already rejects collision-rectangle overlap with the player and previously placed enemies. The rendered character/enemy frames and decorative outlines are larger than their gameplay collision rectangles, so visible overlap can remain. Boss placement is separate and can fall back to its nearest candidate even if it overlaps the player.
- Enemy selection uses a saved random state. Position retries must remain deterministic and must not change the already-selected enemy roster.
