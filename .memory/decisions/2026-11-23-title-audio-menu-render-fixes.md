# Decisions: Title Audio, Menu Layout, and Shield Rendering Fixes

- Date: 2026-11-23
- Status: Confirmed

## D01. Music during round transitions and result overlays
- **Chosen**: Keep the current stage BGM playing during round-clear waits, easy-mode round-clear choices, death choices, and stage-clear result screens.
- **Rationale**: Avoid interrupting the music while the player waits or chooses what to do next.

## D02. Music in pause and settings screens
- **Chosen**: Continue BGM while the game is paused or the settings screen is open. Stop it when the browser tab becomes hidden; resume it when the tab becomes visible again.
- **Rationale**: A menu pause should not interrupt music, while a hidden tab should not keep playing audio.
- **Note**: Automatic resumption when the tab becomes visible is the direct implementation of the selected active-tab behavior.

## D03. Dedicated title-screen BGM
- **Chosen**: Use “Whispers in the Fog” by Ruhinre as the title-screen BGM.
- **Source**: https://opengameart.org/content/whispers-in-the-fog
- **License and format**: The source page lists CC0 and an OGG file of about 204 KB. Credit is appreciated but not required.
- **Rationale**: The user selected the short, seamless, mysterious ambient loop for the existing dark-fantasy forest title screen.

## D04. Music track transitions
- **Chosen**: Crossfade from title BGM to the selected stage BGM over about one second.
- **Rationale**: Avoid an abrupt cut when the player starts a game.

## D05. Title BGM autoplay after login
- **Chosen**: Attempt to play the title BGM after login. If the browser blocks playback, start it on the first click, tap, or key press on the title screen. If that first action starts a game, play the stage BGM.
- **Rationale**: Browser autoplay policies may require interaction with the game site; a login redirect alone cannot reliably authorize audio playback.
- **Reference**: https://developer.chrome.com/blog/autoplay?hl=en

## D06. Shield stays with the player
- **Chosen**: Correct the production rendering so the shield stays attached to the moving player, preserving the existing eight-direction shield poses unless investigation proves an asset correction is needed.
- **Observed behavior**: The user reports that the player moves while the shield remains near the center of the map on the deployed Azure site.
- **Code finding**: Current `PlayerView` uses a composite player-with-shield frame from `hero-shield` and positions the body at the player's world coordinates. There is no separate shield GameObject in the checked source. Reproduce and trace the production discrepancy before changing the rendering approach.
- **Rationale**: Fix the reported detachment while retaining the existing shield art and directional poses.

## D07. Account status placement on the home screen
- **Chosen**: Show account identity and logout as text/button controls at the lower-left of the home screen. Remove the enclosing box. Show save/sync changes as a short-lived notification at the bottom center instead of persistent sync text.
- **Rationale**: Keep account controls visible without a card while making save feedback brief and easy to notice.
- **Implementation note**: Keep the account controls and notifications within the actual contained forest artwork bounds. Use a clearly labeled local-only account status in Vite development mode.

## D08. Remove the visible title heading
- **Chosen**: Remove the “Pixel Action” heading from the home screen; keep the forest background and menu buttons.
- **Rationale**: The reference marks only the heading for removal.

## D09. Audio warning placement
- **Chosen**: Move the existing audio warning from the lower-left to the lower-right while keeping account controls at lower-left and transient save feedback at bottom center.
- **Rationale**: Keep audio errors clear of the account controls and centered notification.

## Notes for planning
- These decisions require changes to the audio manager, title and stage scene audio lifecycle, title-screen markup/styles, and shield rendering diagnosis.
- No Azure resources or third-party runtime services are needed for these game changes.
- Do not delete the existing `Grill-Me API` Entra registration as part of this work; it is unrelated to these UI/gameplay adjustments.
