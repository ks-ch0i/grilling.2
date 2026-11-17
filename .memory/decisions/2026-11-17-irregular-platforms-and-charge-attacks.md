# Decisions: Irregular Platforms, Charge Attacks, and Root Targeting

- Date: 2026-11-17
- Status: Confirmed

## D01. Charge attacks and platform collision — user choice
- **Chosen**: Apply platform piercing to the three explicit charge attacks: the Forest boar, Mine Machine boss, and phase-two Mine Worm boss. Spawn the boar on the fixed floor. Keep both bosses' existing floor spawn behavior.
- **Rationale**: Charging enemies should cross floating platforms rather than stop at them; the boar should begin on the base floor. The bosses already spawn there and constrain their charge to the arena.
- **Constraints**: Ignore floating platforms only during the active charge. Preserve the floor and arena/world boundaries. Bat flight is not part of this change.

## D02. Platform scope, count, and appearance — user choice
- **Chosen**: Do not add walk-up hills. In both Forest and Mine, generate 2–4 irregular platforms on each new stage attempt. Choose the count uniformly from 2, 3, and 4.
- **Appearance**: Create new biome-specific platform sprites: tree roots and soil for Forest; layered rock and ore for Mine. Reuse existing assets as palette/style references and decoration.
- **Construction**: Use modular 16-pixel-wide end and middle sprite pieces that compose platform widths from 32 to 112 pixels.
- **Rationale**: The platform form itself should fit each stage's environment while retaining variable layouts.

## D03. Platform top profile and walking — user choice
- **Chosen**: The platform top may be irregular. The player and grounded monsters (soldier, boar, golem, insect) track the surface height and step up or down without jumping. Bat and boss movement remain unchanged.
- **Profile limits**: Keep all top samples within the previously chosen y=248–288 range. Adjacent 16-pixel surface sections differ by no more than 4 pixels. The full top profile of one platform varies by no more than 16 pixels from its highest to lowest point.
- **Collision**: Use one-way top-surface collision. Characters can pass upward through a platform and move through its sides; they land and walk on its top profile. Do not add separate sloped hills.
- **Combat**: The top profile continues to block player melee line of sight. Existing platform-piercing ranged and charge attacks pass through it.
- **Rationale**: The small bounded steps keep the surface walkable without jumping while the one-way rule supports vertical platform movement.

## D04. Platform generation and existing saves — carried forward from prior user choices
- **Chosen**: Keep generated platforms jump-reachable from the floor and keep the starting area clear. Retain the earlier width preference: mostly 32–64 pixels, with occasional 80–112 pixel platforms and a bias toward narrower forms.
- **Persistence**: Keep one exact layout, profile, and visual selection through all rounds and boss encounters and when resuming a save. A death begins a new attempt and generates a new layout.
- **Compatibility**: Preserve a run that predates this update with its existing fixed rectangular platforms until that run ends. The next attempt uses the new generated platforms.
- **Rationale**: Existing progress remains stable while new attempts receive the updated terrain.

## D05. Forest Guardian root attacks on platforms — user choice
- **Chosen**: Apply the fix to every Forest Guardian appearance in Forest rounds 5, 7, and 8, including the additional phase-two root strike in round 8.
- **Target selection**: When the warning begins, select the nearest walkable surface beneath the player's horizontal target position. If the player is airborne, select the first supporting surface below the player's feet; if none exists, use the fixed floor. Keep the warning and hitbox at that same selected surface.
- **Rationale**: A root strike should reach players standing above the base floor while preserving a readable, locked warning and impact position.
- **Preserve**: Keep the current root dimensions, damage, attack timing, phase schedule, and number of strikes.

## Code constraints and implementation notes

- `src/game/sim/terrain.js` currently creates deterministic rectangular layouts; `terrainLayout` is saved and validated strictly. Store irregular top profiles and visual selections in the run layout so collision, rendering, and save/restore use the same geometry.
- `src/game/sim/geometry.js` currently resolves axis-aligned rectangles. The new one-way profile needs explicit surface-height collision for player and ground-enemy movement. Simulation must use stored profile data rather than reading sprite pixels at runtime.
- `src/game/sim/rounds.js` selects spawn support from stage solids, so the boar's floor-only spawn must be enforced there without changing other enemy placement rules.
- `src/game/sim/boss.js` currently targets Forest Guardian roots at the fixed arena floor and receives no terrain argument. Root targeting must receive the active run's platform profiles and use the chosen support height for both telegraph and eruption.
- `src/game/scenes/StageScene.js` renders platforms from the run layout. It must draw each modular themed sprite to match the same stored top profile used by collision.
- The project stores generated art sources under `public/assets/source/` and builds runtime sprites through `scripts/pack-art.mjs`; update the asset manifest and `docs/asset-provenance.md` with the new sheets.
- Preserve the existing world bounds, floor, eight-round schedule, damage values, and save progress outside the active run's terrain representation.

## Findings outside the selected scope

- None. The platform art, simulation collision, and Forest Guardian targeting changes are all within the requested scope.

## Next step

The implementation plan is now recorded at [Irregular Platforms, Charge Attacks, and Root Targeting](../plans/2026-11-17-irregular-platforms-and-charge-attacks.md). Run `/memory-execute` to begin T01. No game code or art assets were changed during this interview.
