# Task: T02 Shield and Parry Pose Assets

## Status: done

## Goal

Create the two transparent 32x32-frame sprite sheets for the shield and parry poses, matching the current hero art, without changing game source files or the asset manifest.

## Decision Summary

- Shield: base hero appearance plus a small round shield in the hero's red clothing palette, eight static aim directions.
- Parry: static left/right body poses with the existing sword held diagonally in front. The game keeps drawing its existing sword separately.

## Implementation

### I01. Generate and prepare the shield sprite sheet

- Related Files:
  - public/assets/characters/hero/directions.png :: style/edit reference — read-only
  - public/assets/characters/hero/shield.png :: eight-frame shield pose sheet, 32x32 cells — new
  - public/assets/characters/hero/actions.png :: palette and body reference — read-only

#### Details

- Use the built-in image_gen tool in edit mode with the existing local hero direction sheet as the target. The original sheet has eight 32x32 frames in a 4-column by 2-row grid. Do not overwrite it; copy the generated final image to the new shield.png path.
- Preserve the current dark hero silhouette, clothing shapes, and pixel-art palette. Add a compact round shield to the base appearance; use the character's existing red clothing palette. Keep the separately rendered sword clear of the shield.
- Keep transparent pixels transparent. Do not add scenery, ground, text, border, cell gutters, glow, or drop shadow.
- Final shield.png is a 128x64 RGBA PNG with eight 32x32 cells, in the existing row-major direction order:
  1. right
  2. down-right
  3. down
  4. down-left
  5. left
  6. up-left
  7. up
  8. up-right
- Use sharp already installed in package.json only for cropping/nearest-neighbor resizing if the generated edit changes canvas scale. Do not add source scripts or modify package dependencies.

### I02. Generate and prepare the parry sprite sheet

- Related Files:
  - public/assets/characters/hero/directions.png :: style/edit reference — read-only
  - public/assets/characters/hero/parry.png :: two-frame parry pose sheet, 32x32 cells — new
  - public/assets/characters/hero/sword.png :: held weapon reference — read-only

#### Details

- Use a separate built-in image_gen edit call on directions.png. Preserve the 4x2 grid and change only frame 0 (right) and frame 4 (left) into the defensive guard body/arm pose. Keep the sword itself out of the sprite pixels because the game renders the existing sword asset separately. Leave the other six frames unchanged in the generated intermediate.
- The two frames are ordered right-facing then left-facing. The character braces with arms set for a diagonal sword guard across the body; T03 positions the existing sword sprite diagonally.
- Use sharp to crop frame 0 and frame 4 from the generated 4x2 intermediate and composite them side by side, in that order, into the final two-cell strip.
- Final parry.png is a 64x32 RGBA PNG with two adjacent 32x32 cells, no padding or gutters.
- Copy each selected final image from the built-in generator's output location into the repo path. Do not leave project assets only in the generator's default output directory.
- Inspect both sheets at native pixel scale and enlarged nearest-neighbor scale. If the character silhouette or alpha grid is off, make a focused image edit and re-check rather than replacing untouched original hero files.

### Acceptance Criteria

- [x] shield.png has exactly eight usable direction frames and parry.png has exactly two usable left/right frames.
- [x] Both sheets match the hero palette and pixel scale with transparent backgrounds.
- [x] Original hero assets, source code, and package files are unchanged.

### Validation

~~~powershell
node --input-type=module -e "import sharp from 'sharp'; const specs=[['public/assets/characters/hero/shield.png',128,64],['public/assets/characters/hero/parry.png',64,32]]; for (const [file,width,height] of specs) { const m=await sharp(file).metadata(); if (m.width!==width || m.height!==height || !m.hasAlpha) throw new Error('Invalid sprite sheet: '+file); }"
~~~
- Open both PNGs in the image viewer at native and enlarged scale; confirm each cell is aligned, transparent, and uses the documented direction order.

## Commit Message

~~~text
art(hero): add shield and parry pose sheets

Plan: 2026-11-22-shield-and-parry
Phase: P01-shield-parry
Task: T02-defense-pose-assets

- Add eight-direction red shield poses and left/right parry poses.
- Preserve transparent 32x32 sprite cells and existing hero assets.
~~~

## Progress

- [x] 구현 완료
- [x] 검증 통과
- Verified RGBA, frame bounds, and foot anchors. Inspected both sheets at 1x and 5x.
