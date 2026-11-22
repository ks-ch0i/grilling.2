# Decisions: Platform Drop-Through

- Date: 2026-11-22
- Status: Confirmed

## D01. Input when no drop-through platform is present
- **Chosen**: `S`/`ArrowDown` + `Space` performs a normal jump when the player is not standing on a drop-through platform.
- **Rationale**: A directional modifier should not consume the normal jump when there is no platform to descend through.

## D02. Modifier and jump key order
- **Chosen**: `S` or `ArrowDown` must already be held when `Space` is pressed to request a drop. Pressing `Space` first remains a normal jump, even if the down key is pressed before the next simulation tick.
- **Rationale**: The action is decided by the key state at the jump press, so a jump already started cannot unexpectedly turn into a drop.

## D03. Platforms that can be dropped through
- **Chosen**: Drop through the run's current non-floor platforms, including authored profiled platforms and legacy rectangular platforms. Ignore only the platform being left until the player clears it; other platforms remain solid and can catch the player.
- **Rationale**: The run's saved terrain layout is the source of collision platforms; the stage floor and arena walls are separate solids.

## D04. Drop movement and simulation
- **Chosen**: Start the descent at 80 px/s and continue with the existing gravity and fall movement. Permit the action only while grounded on a platform. Keep horizontal movement and existing fall behavior.
- **Rationale**: The pending implementation already defines `PLATFORM_DROP_SPEED` as 80 and routes the player through the standard movement step.

## D05. Save and mode behavior
- **Chosen**: Persist which platform is being cleared in the existing run snapshot so Hard-mode continue can finish the drop safely. Apply the same control in Easy and Hard because both use the shared `InputController` and `stepPlayer` simulation.
- **Rationale**: Terrain layout is fixed for a run and saved with the run; platform indexes can therefore identify the same collision surfaces after restore without changing the save version.

## D06. Controls documentation and feedback
- **Chosen**: Document `S`/`ArrowDown` + `Space` in the README and Settings controls. Use the normal fall pose and existing movement sounds; add no separate HUD indicator or new animation.
- **Rationale**: The shared player animation already selects the fall pose once the grounded state ends, and no distinct drop feedback was requested.
