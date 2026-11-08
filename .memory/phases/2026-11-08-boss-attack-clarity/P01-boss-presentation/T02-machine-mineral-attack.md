# Task: T02 채굴 기계와 광물 분출

## Status: done

## Goal
채굴 기계의 외형과 네 공격을 읽기 쉽게 만들고, 플레이어 위치 주변에 광물을 분출하는 새 공격을 기존 결정적 시뮬레이션·저장 규칙에 추가한다.

## Decision Summary
- 외형 참고는 사용자가 제공한 채굴 기계 콘셉트 이미지다. 기계는 전면 회전 드릴과 관절식 집게를 가지며 집게로 지면을 쳐 기존 충격파를 만든다. 드릴 휘두르기는 제거한다.
- 새 광물은 60틱 준비·60틱 비행, 5~7개, 플레이어 주변 목표 구역, 무작위 간격이다. 비행 중 접촉 또는 착탄 때 하트 1칸 피해를 주며, 한 광물은 한 번 맞히면 사라진다.

## Implementation

### I01. 기계·광물 이미지와 공격별 클립
- Related Files:
  - `public/assets/source/mine-machine-attack-original.png` — 24개 기계 포즈 원본; new
  - `public/assets/source/mine-machine-original.png` — 이전 기계 원본 기록; retain, unused
  - `public/assets/characters/machine/poses.png` — 패킹 출력; modify
  - `public/assets/source/mine-mineral-original.png` — 단일 광물 발사체 원본, 16×16; new
  - `public/assets/world/mine/mineral.png` — 단일 투명 광물 텍스처; new
  - `scripts/pack-art.mjs` :: `specs`, `makeAtlas` — 기계 6×4 및 광물 1×1 패킹; modify
  - `src/game/assets/manifest.js` :: `ASSETS`, `clips`, `clip` — 자산·클립 등록; modify
  - `src/game/assets/animation.js` :: `bossAnimation(boss)` — 기계 공격 상태별 클립; modify
  - `docs/asset-provenance.md` — 생성 원본과 사용자 참고 이미지 기록; modify
  - `test/assets.test.js`, `test/animation-contract.test.js` — 셀·클립 계약; modify

#### Details
- **Signatures & Types**:
  ```ts
  type MineBoss = { kind:'machine'|'worm'; state:string; attackKind:string|null };
  function bossAnimation(boss:MineBoss):AnimationClip;
  function animationFrame(clip:AnimationClip,elapsedTicks:number):number;
  function preloadAssets(loader:Phaser.Loader.LoaderPlugin,textures?:Phaser.Textures.TextureManager):void;
  ```
- **Data & Schema Fields**:
  - Machine sheet: 24 frames, each 112×112, 6 columns×4 rows, transparent background, origin `(0.5,1)`. Keep simulation body dimensions `80×64`.
  - Frame allocation: `0–1 intro`, `2–3 idle`, `4–5 charge windup`, `6–7 charge attack`, `8–9 rocks windup`, `10–11 rocks attack`, `12–13 wave windup`, `14–15 wave attack`, `16–18 mineral windup`, `19–20 mineral launch`, `21 hurt/impact pose`, `22–23 dead`.
  - `bossAnimation` selects `{machine}.{attackKind}{Windup|Attack}` during the matching state. `intro`, `idle`, and `dead` keep their own clips. `transition` continues to resolve safely although machine has one phase.
  - New `ASSETS` entry: `{key:'mine-mineral',url:'/assets/world/mine/mineral.png',frameWidth:16,frameHeight:16,count:1}`. The transparent teal crystal rotates with its velocity. `MineHazardView` overrides the sprite origin to `(0.5,0.5)` so it rotates about its center; red is reserved for the firing-preparation glow.
  - New hazard is the existing base hazard shape plus `kind:'mineral'`: `{id:string,ownerId:string,kind:'mineral',x:number,y:number,w:12,h:12,vx:number,vy:number,life:60,alive:boolean}`. No mutable attack data is added to save snapshots.
- **Execution Flow / Logic**:
  1. Generate a 24-pose machine sheet that follows the selected concept silhouette: forward rotary drill, articulated mining claw, compact mine machinery, current dark brown/metal palette with teal ore. Treat the supplied image as a shape reference; create original pixel art. Do not add a drill-swipe or claw-sweep attack. Pack each nonempty cell with the existing `sharp` pipeline and document the reference and generated output.
  2. Replace `selectMachineAttack(boss,player,rng)` candidates. Distance remains center-to-center `<=120` game pixels for close range. Close candidates are always `['charge']`, even when `lastAttack==='charge'`, so the charge may repeat after recovery. Far candidates are `['wave','rocks','mineral']` with the existing last-attack filter, so a far attack does not repeat immediately. Continue advancing the seeded `nextRandom` exactly once per selection and return `{kind,rng}`.
  3. Keep machine windup at 60 ticks, charge active at 72 ticks, other existing machine attack active at 18 ticks, phase/recovery rules, wave dimensions/speed, rock count/velocity, player damage, and 45-tick invulnerability. The new `mineral` attack emits once when the 60-tick windup ends; no separate damage tick or warning rectangle is added.
  4. At emission, face the player’s current center. Let `N=60` flight ticks, `g=650` px/s², projectile height `h=12`, origin `(x0,y0)` at the forward emitter, and floor contact top `y1=arena.bottom-h`. Pick `count=5+floor(random*3)`. Pick each landing x independently from `[playerCenterX-120,playerCenterX+120]`, clamp to `[arena.left+16,arena.right-16]`, and sort by x for deterministic rendering. The ±120px half-width is an initial tuning default based on the existing close-range threshold; keep it in one named constant for T04 play adjustment. Use seeded `nextRandom` for count and positions, never `Math.random`.
  5. Treat each picked landing x as the crystal center, so `vx=(landingCenterX-6-x0)*60/N` lands its 12px box centered on that target. With semi-implicit `stepHazards` gravity, set `vy=(y1-y0)*60/N - g*(N+1)/(2*60)` so the crystal reaches floor height in 60 ticks. Initialize the hazard with `life:N`, unique id `${boss.id}-${attackSerial}-mineral-${index}`, and `alive:true`. Use a 12×12 direct-contact box.
  6. In `stepHazards`, process `mineral` with gravity 650 and swept substeps like `rock`. A player collision during flight marks that mineral dead and emits one `hazard:hit`; it emits a shatter visual event at the collision point and cannot later land. On floor collision, mark it dead and emit `hazard:impact`; use a fixed 24×16 ground impact box centered on its x to emit `hazard:hit` only if the player overlaps at that instant. Do not add a persistent pool, bounce, or second hit from the same crystal.
  7. Add `'mineral'` to the hazard-kind validator and `'mineral'` to both `attackKind` and `lastAttack` allowed values in `restoreStageRun`. Preserve existing required snapshot fields; validate live mineral snapshots round-trip deterministically. `stepStage` already applies `hurt()` for `hazard:hit`; route `hazard:impact` and the direct-hit shatter event only to presentation.
  8. In `EnemyView.sync(run)`, during `machine/mineral/windup`, tint the muzzle red and oscillate the displayed machine sprite by at most 1 screen pixel without changing simulation `boss.x/y`. Display the claw lifting before `wave`, its ground contact at wave start, smaller falling debris before `rocks`, and the drill windup/recoil before `charge`. Render each effect from existing `telegraphs`, `hitboxes`, or the selected machine state; no yellow/red boss rectangles.
  9. In `MineHazardView.sync(run)`, display alive mineral hazards with the new crystal image and rotation, and render falling rocks as pixel-art silhouettes rather than outlined boxes. In `StageScene.playEventSound(event)`, draw a brief small crystal shatter/ground-impact burst from event coordinates; do not add new mineral SFX. Destroy transient effect graphics through the existing `visualEffects` lifecycle.
  10. The first implementation of the ±120px target half-width is an inferred tuning value, not an additional user-confirmed design decision. Keep it isolated and report the observed dodge difficulty in T04; changing it requires review against the confirmed “player surrounding area” rule.
- **Error & Exception Handling**: Seeded generation must always produce 5–7 valid positions inside the locked arena. Hazard motion is substepped to prevent tunneling. On invalid `kind`, `restoreStageRun` rejects the snapshot using its existing `TypeError('Invalid hazards')`/`TypeError('Invalid mine boss')` behavior.

### I02. Machine simulation and collision tests
- Related Files:
  - `src/game/sim/mineBoss.js` :: `selectMachineAttack`, `beginWindup`, `stepMineBoss` — pattern selection and emission; modify
  - `src/game/sim/hazards.js` :: `stepHazards(input,player,terrain)` — flight, collision, and impact events; modify
  - `src/game/sim/stage.js` :: `restoreStageRun`, hazard stepping — enum validation and damage routing; modify
  - `test/mine-boss.test.js`, `test/stage-lifecycle.test.js` — deterministic pattern, hit, and snapshot checks; modify

#### Details
- **Execution Flow / Logic**:
  1. Test close-range selection yields only charge, including after a prior charge; test far-range selection yields all three far candidates over seeds and never repeats `lastAttack` where another candidate exists.
  2. Test a mineral windup remains 60 ticks, emits exactly 5–7 minerals once, uses different seeded landing positions, and places them within the player-centered clamped zone.
  3. Step one mineral for its flight. Assert 60-tick floor impact under empty arena geometry; assert airborne contact emits one hit and no impact; assert landing overlap emits one hit at the landing tick and leaves no hazard/pool afterward.
  4. Round-trip a snapshot containing live minerals, continue both original and restored runs with identical inputs, and assert identical boss state, RNG state, hazard positions, health, and events.
  5. Assert existing 30px wave, charge, rock and worm hazards keep their established behavior and the player takes no more than one heart per crystal because the existing invulnerability window is preserved.

## Acceptance Criteria
- [x] The close machine has only drill charge; no drill swipe is selectable or rendered.
- [x] The far machine chooses wave, falling rocks, or mineral spray without consecutive duplicates.
- [x] Mineral windup glow/tremor lasts 60 ticks; 5–7 crystals target the launch-time player area and fly for 60 ticks.
- [x] Each crystal causes at most one 1-heart hit, either on direct contact or on the brief landing impact; no lingering hazard remains.
- [x] Claw shockwave keeps its 30px height and long-jump-only evasion; existing charge and rock collision data stay unchanged.
- [x] Machine visuals use the selected drill-and-claw silhouette and per-attack poses; all effects align to live attack data.

## Validation
- `node scripts/pack-art.mjs` — regenerates the 24-frame machine sheet and single mineral image.
- `node --test test/mine-boss.test.js test/stage-lifecycle.test.js test/assets.test.js test/animation-contract.test.js` — seeded attack, hitbox, save/restore, art, and animation contracts pass.
- `npm run build` — production build passes.

## Commit Message
```text
feat(boss): add machine mineral spray attack

Plan: 2026-11-08-boss-attack-clarity
Phase: P01-boss-presentation
Task: T02-machine-mineral-attack

- Replace machine swipe with the selected drill and claw attack set
- Add deterministic mineral projectiles with one-hit collision
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — asset pack, 지정 테스트 35개, production build 통과
- commit: `e6b34c7`
