# Decisions: Randomized Terrain, Piercing Attacks, and Worm Acid

- Date: 2026-11-17
- Status: Confirmed

## D01. Attacks that pass through terrain — user choice
- **Chosen**: All ranged attacks from regular monsters and all ranged or area attacks from bosses pass through floating platforms and generated terrain. Preserve boss melee hit behavior.
- **Rationale**: Obstacles should not cancel attacks that make the arena harder to read or dodge. The floor remains an impact surface and the arena boundary remains intact.

## D02. Terrain generation scope and timing — user choice
- **Chosen**: Randomize the floating platform layout in both Forest and Mine. Generate one layout when a stage attempt begins, keep it for all eight rounds and boss encounters, and preserve it when resuming a save. A death starts a fresh attempt with a new layout.
- **Rationale**: The stage remains learnable during a run while each new attempt can present a different challenge.

## D03. Platform count, width, and difficulty weighting — user choice
- **Chosen**: Generate 4–6 platforms per stage attempt. Most are 32–64 pixels wide; occasional platforms may be 80–112 pixels wide. Weight layouts toward 5–6 platforms and narrower widths.
- **Rationale**: More frequent, narrower platforms favor the requested higher difficulty while retaining some wider landing surfaces.

## D04. Platform height and reachability — user choice
- **Chosen**: Keep platforms 16 pixels thick and vary their top edge from y=248 to y=288, or 16–56 pixels above the fixed floor at y=304. Every platform must connect to the floor through a jump-reachable path. Keep the player start area clear.
- **Rationale**: The selected range adds vertical variation while leaving margin under the player's roughly 69-pixel maximum jump rise.

## D05. Pre-existing saved runs — user choice
- **Chosen**: A saved run created before randomized terrain keeps the existing fixed layout until that run ends. The next attempt after death uses a generated layout. Preserve the player's current round and state.
- **Rationale**: The terrain feature must not disturb a run already in progress or reset its saved progress.

## D06. Worm boss acid projectile and pool size — user choice
- **Chosen**: For the Mine worm boss only, enlarge the acid projectile hitbox to 16×16 pixels and display its existing effect at about 21×21. Enlarge the pool hitbox to 48×8 pixels and display its existing effect at about 64×11. Keep damage and the four-second pool lifetime unchanged.
- **Rationale**: The projectile and lingering pool should read clearly and their visible size should correspond to their danger area, without changing damage or duration.

## D07. Existing art and regular insect acid — inferred from code
- **Chosen**: Reuse the existing worm acid and pool sprite frames and adjust their in-game display sizes; do not create or resize source images. Leave the regular Mine insect's two-second acid pool unchanged.
- **Rationale**: The project already has dedicated worm acid and pool frames, and the renderer sizes them from the simulation hazard rectangle. The regular insect uses the same general hazard simulation but a separate two-second rule.

## Code constraints and implementation notes

- Both stage definitions currently use the same fixed floor and three floating rectangular platforms. The floor and arena bounds remain fixed; the randomized geometry covers floating platforms only.
- Stage validation, enemy placement, player collision, attack collision, and `StageScene` terrain rendering currently read `stage.solids`. Generated layouts must be shared consistently with those systems and included in new run snapshots.
- The player moves at 105 pixels per second, jumps with initial vertical speed -300, and uses gravity 650. Reachability checks must account for that movement model rather than relying only on screen coordinates.
- Current run snapshots use strict shape validation. A pre-feature saved run has no platform layout, so it must remain identifiable as a fixed-layout legacy run until the next fresh attempt.
- The worm sprite sheet already contains acid and pool frames. `fxItem` scales each frame from its hazard rectangle; the current 8×8 projectile is displayed at about 10.7×10.7, and the 28×6 boss pool at about 37×8. The hazard simulation currently creates a 28×6 pool for acid shots, so the worm-only 48×8 size must not change the regular insect's two-second pool.

## Findings outside the selected scope

- Boss melee hitboxes already test direct overlap with the player without terrain occlusion. Boss bodies also do not use terrain collision during their movement. These behaviors remain as they are; randomized platforms may overlap a boss's movement path as they can with the existing fixed platforms.
- Regular monster projectiles and area hazards currently stop or impact when they meet terrain. Their new platform-piercing behavior must still preserve floor impacts and the worm pool creation rule.
- Existing Mine combat tests encode ledge-blocked golem waves, the regular insect's two-second pool, and the worm boss's four-second pool. Later implementation work should update only the newly changed behaviors and retain the insect rule.

## Next step

Run `/memory-plan` to turn these confirmed decisions into an implementation plan. No game code or assets were changed during this interview.
