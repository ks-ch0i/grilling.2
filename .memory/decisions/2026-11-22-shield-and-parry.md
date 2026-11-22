# Decisions: Shield and Parry

- Date: 2026-11-22
- Status: Confirmed

## D01. Defense categories and damage
- **Chosen**: Shield defends against ranged attacks; parry defends against melee attacks. A successful defense still costs 0.5 HP. Unblocked hits keep their existing damage.
- **Rationale**: Defense makes attacks less punishing while half-heart chip damage preserves pressure.

## D02. Damage reaction and health display
- **Chosen**: A successful defense removes 0.5 HP without knockback or hurt-stun, then grants the existing 0.75-second invulnerability. Health can use half-heart values and the HUD shows full, half, and empty hearts.
- **Rationale**: The defense should feel effective, and the existing invulnerability prevents one sustained hitbox from repeatedly applying chip damage.

## D03. Shield activation and timing
- **Chosen**: Hold the right mouse button to raise the shield, for up to 1 second. Releasing it early or ending it through a roll ends the shield. It remains active for its remaining duration after blocking an attack and can defend against multiple ranged attacks. Its 3-second cooldown begins when the shield ends. Keeping the button held through cooldown does not reactivate it; release and press again after cooldown.
- **Rationale**: The shield has a defined exposure window and cannot be held indefinitely or automatically cycle back on.

## D04. Parry activation and timing
- **Chosen**: Press `Q` to parry. The forward parry window lasts 0.25 seconds and remains active through that entire window after a successful block. Its 3-second cooldown starts on the `Q` press, even when no attack is blocked. A roll ends the active parry window but does not reset its cooldown.
- **Rationale**: The user gets a short timing challenge while repeated front-facing hits within that window can be defended.

## D05. Facing and coverage
- **Chosen**: Both abilities defend within a 120-degree arc centered on the current mouse aim. Shield coverage blocks attacks from the front only. Parry collision coverage remains aim-based even though its art has only left/right poses; select the pose from the horizontal sign of the aim.
- **Rationale**: This keeps gameplay coverage consistent with the established aiming control while limiting asset scope.

## D06. Which attacks can be defended
- **Chosen**: Shield blocks flying projectiles, ranged waves, and falling projectile-like attacks from enemies and bosses. Parry blocks active melee swings and charges. Ordinary body contact, stationary acid pools, mine carts, and pit damage bypass both defenses.
- **Rationale**: The distinction follows the attack itself; persistent environmental damage is not treated as a ranged attack merely because the code currently groups it under hazards.

## D07. Interaction with player actions
- **Chosen**: Defense can start while idle, running, jumping, falling, or attacking; starting defense cancels an attack. It cannot start during roll, dive, hurt, or death. While defense is active, movement and jumping remain available, attacks are unavailable, and roll is allowed but immediately ends the active defense. Shield and parry cannot overlap; an input for the other defense while one is active is ignored without spending its cooldown.
- **Rationale**: Defense can respond during offense and platforming without stacking with the game's roll invulnerability or combining both defenses.

## D08. Feedback
- **Chosen**: Do not add cooldown HUD indicators or a cooldown-ready cue. Show the active shield/parry pose and a character-level visual effect on a successful defense. Use distinct synthesized sounds for shield impact and parry deflection. Inputs during cooldown receive no special feedback.
- **Rationale**: This keeps the HUD unchanged and lets active poses and block feedback communicate the action without adding ready-state UI.

## D09. Asset task boundary and art direction
- **Chosen**: Create the shield and parry pose image files in a separate task. That task produces files only; the defense implementation task connects them to animation. Use the existing 32x32 pixel-art scale. Shield frames add a small round shield to the base character and use the character's red clothing palette; create eight static directions. Parry frames use the existing sword held diagonally across the body; create static left/right poses only.
- **Rationale**: This separates asset production from game logic while matching the current character presentation and aiming model.

## D10. Existing code constraints to account for
- **Chosen**: The implementation must represent half-heart HP in player state, save validation, and rendering. Keep the existing pickup behavior of healing one HP, capped at 3 HP.
- **Rationale**: Current player HP and save validation require integer values from 0 through 3, and the current HUD only displays full or empty hearts. Pickups currently heal one full HP.

## D11. Out-of-scope behavior
- **Chosen**: A successful parry does not stagger, interrupt, or otherwise affect the attacker. No cooldown-ready notification or retry sound is added.
- **Rationale**: The feature remains defensive and does not change enemy or boss attack patterns.

## D12. Save migration and continued cooldowns
- **Chosen**: Migrate existing v4 saves to v5 while preserving the current run, records, unlocks, Easy progress, and settings. Initialize shield/parry as ready for migrated runs. Persist remaining cooldown timers in later saves. On restore, cancel an active shield and begin its 3-second cooldown; cancel an active parry window while keeping its already-running cooldown.
- **Rationale**: This adds defense state without discarding the player's existing progress. Held mouse/key input is transient and cannot be restored safely.
