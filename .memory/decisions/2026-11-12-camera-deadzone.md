# Decisions: Player Camera Dead Zone

- Date: 2026-11-12
- Status: Confirmed

## D01. Camera tracking axes
- **Chosen**: Track the player horizontally and vertically.
- **Rationale**: The user selected both axes so camera movement reflects movement outside the virtual rectangle in either dimension.

## D02. Dead-zone rectangle
- **Chosen**: Use an invisible rectangle centered horizontally with width 30% of the 640-pixel viewport (192 px), giving screen bounds x=224..416. Use a 150-pixel-tall vertical interval from y=210 to y=360.
- **Rationale**: The user narrowed the horizontal interval from 60% to 30% after the wider area made camera movement start too late. The vertical area includes the grounded center y=290 and the normal floor-jump apex around y=221, so those jumps do not move the camera. The area remains an internal camera boundary and is not drawn.

## D03. Camera response outside the rectangle
- **Chosen**: Move only the camera axis needed to bring the player's center back to the nearest rectangle edge. Stop following on an axis when the player returns inside that axis interval. Retain the existing eased movement factor of 0.12 per render update.
- **Rationale**: The user chose edge following instead of recentering. Existing camera motion is eased, so retaining it avoids a sudden change in feel.

## D04. Horizontal follow target
- **Chosen**: Use the actual player center during normal play and remove the existing 60 px look-ahead in the facing direction.
- **Rationale**: The user chose to make rectangle boundaries correspond to the player's actual position, so the camera does not react to facing changes while the player remains inside.

## D05. Vertical camera bounds
- **Chosen**: Keep stage geometry and simulation coordinates unchanged. Permit camera scrollY from -80 to 0, allowing up to 80 px of upward camera travel for jumps; return toward 0 during descent.
- **Rationale**: Both stages are 360 px tall, equal to the viewport. The user chose camera-only overscan rather than expanding and repositioning the stages.

## D06. Background response
- **Chosen**: Apply vertical background parallax at 15% of camera movement, matching the existing horizontal parallax factor.
- **Rationale**: The user chose consistent, slower background movement on both axes.

## D07. Boss intro framing
- **Chosen**: Preserve existing player-and-boss framing during boss introduction as an override to the dead-zone follow.
- **Rationale**: The user chose to retain the established cinematic introduction camera behavior.

## D08. Horizontal dead-zone refinement
- **Chosen**: Reduce the horizontal dead-zone width to 30% of the viewport. At this point keep the vertical height at 80 px pending a recommendation.
- **Rationale**: The user reported that horizontal follow started too late and requested 30%, then asked for a vertical recommendation.

## D09. Vertical dead-zone refinement
- **Chosen**: Reduce the vertical dead-zone height from 80 px to 48 px while keeping its center at y=290.
- **Rationale**: The user accepted the recommendation based on a roughly 69 px jump height. The new top edge y=266 causes about 45 px of upward camera follow at the jump peak, compared with about 29 px for the prior 80 px zone.

## D10. Reduce vertical camera sensitivity for floor jumps
- **Chosen**: Set the vertical dead-zone to y=210..360 (150 px high). Keep the existing upward camera travel limit at -80 px.
- **Rationale**: The user reported excessive y-axis sensitivity and asked for no camera movement during floor jumps. A normal jump moves the grounded player center from about y=290 to about y=221, which remains inside the revised zone with roughly 11 px of upper margin.

## Existing constraints and follow-up notes
- The internal viewport is 640x360. Both stages are 11520x360. Player dimensions are 16x28 and the grounded player center is y=290.
- Jump constants imply an uncropped peak of about 69 px above the grounded position. The selected y=210..360 zone contains the full normal floor jump. Jumps that move the player center above y=210 can still trigger upward camera follow.
- The camera currently eases toward its target with factor 0.12, sets horizontal world bounds, rounds pixels, and has a 60 px facing look-ahead during normal play. Boss intro uses a separate player/boss midpoint target.
- Screen-fixed HUD and intro overlays use `setScrollFactor(0)`. Boss direction positioning already subtracts `cam.scrollY`.
- **Scope limitation to report**: Camera vertical overscan is upward only (`scrollY` -80..0). The camera cannot pan below the original view when the player falls past the lower dead-zone edge, such as during a pit fall.
- **Visual follow-up to report**: Some world effects may benefit from visual inspection during implementation because the forest/mine background and ground layers were authored for a 360 px fixed-height view. The user selected 15% vertical background parallax; this decision does not expand stage geometry.
