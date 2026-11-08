# Task: T03 거대 벌레 공격 모션과 전환

## Status: done

## Goal
거대 벌레의 산성 발사, 땅속 이동, 꼬리 휘두르기, 2페이즈 돌진 및 전환을 기존 판정에 맞는 동작으로 표현한다.

## Decision Summary
- 공격별 준비 모션과 효과를 추가하되 공격 선택, 준비 시간, 돌출 목표, 피해 범위 및 지속시간은 유지한다.
- 벌레의 페이즈 전환 30틱 동안 맵을 잠시 어둡게 하고 광물이 붉게 빛나며 몸을 뒤트는 동작과 공통 짧은 포효를 표시한다. 플레이어는 이동할 수 있다.

## Implementation

### I01. 벌레 공격별 포즈 시트와 렌더링
- Related Files:
  - `public/assets/source/mine-worm-attack-original.png` — 24개 벌레 포즈 원본; new
  - `public/assets/source/mine-worm-spaced-original.png` — 기존 8포즈 원본; retain
  - `public/assets/characters/worm/poses.png` — 패킹 출력; modify
  - `scripts/pack-art.mjs` :: `specs` — 6×4 셀 패킹; modify
  - `src/game/assets/manifest.js` :: `ASSETS`, `clips`, `clip` — 벌레 공격별 클립; modify
  - `src/game/assets/animation.js` :: `bossAnimation(boss)` — 상태·공격별 클립 선택; modify
  - `src/game/render/EnemyView.js` :: `sync(run)` — 공격 궤적과 보스 표시; modify
  - `src/game/render/MineHazardView.js` :: `sync(run)` — 산성·균열·먼지 표시; modify
  - `test/assets.test.js`, `test/animation-contract.test.js`, `test/mine-boss.test.js` — 자산·상태 회귀; modify

#### Details
- **Signatures & Types**:
  ```ts
  type WormBoss = { kind:'worm'; state:string; stateTicks:number; attackKind:null|'spit'|'burrow'|'tail'|'charge'; phase:1|2; targetX:number; trailStartX:number; burrowsLeft:number };
  function bossAnimation(boss:WormBoss):AnimationClip;
  class EnemyView { sync(run:StageRun):void; destroy():void; }
  class MineHazardView { sync(run:StageRun):void; destroy():void; }
  ```
- **Data & Schema Fields**:
  - Worm sheet: 24 frames, each 128×112, 6 columns×4 rows, transparent background, origin `(0.5,1)`. Keep simulation body dimensions `96×64`.
  - Frame allocation: `0–1 intro`, `2–3 idle`, `4–5 spit windup`, `6–7 spit attack`, `8–9 burrow windup`, `10–11 burrow attack/emerge`, `12–13 tail windup`, `14–15 tail attack`, `16–17 transition`, `18–19 charge windup`, `20–21 charge attack`, `22–23 dead`.
- **Execution Flow / Logic**:
  1. Generate 24 distinct pixel-art frames preserving the current worm design and ore placement. Show a swollen/acid-filled mouth before spit; a low sinking body before burrow; a twist opposite to the tail before tail sweep; low crouch before phase-two crawl. Transition frames show the ore glowing red and the body briefly twisting. Do not reuse the machine silhouette or add attacks.
  2. Register clips with 6×4 frame atlas coordinates. `bossAnimation` picks `spitWindup/spitAttack`, `burrowWindup/burrowAttack`, `tailWindup/tailAttack`, and `chargeWindup/chargeAttack` from the existing `state` and `attackKind`; use idle/intro/transition/dead clips for other states.
  3. Keep the existing 60-tick phase-one windup, 45-tick phase-two windup, 18-tick active non-charge attack, phase-two 72-tick charge, current 180/240px-per-second charge speed, current 18-tick hitboxes, phase-two second burrow target, and 240-tick acid pool. Do not modify `stepMineBoss` or its hitboxes for visual motion.
  4. Make acid projectiles render as a visible teardrop/blob rather than a flat circle. Keep the existing 8×8 projectile position and the current acid pool geometry/duration. The windup pose communicates the source; the visible blob communicates its parabola.
  5. Keep the existing burrow trail and target crack in `MineHazardView`; coordinate them with the sinking pose and current `targetX`/`trailStartX`. Use `telegraphs` and `hitboxes` to draw the tail sweep trail and charge dust within the current danger bounds. Do not draw generic yellow/red boss rectangles after all machine and worm-specific cues exist. Leave ordinary enemy indicators untouched.
- **Error & Lifecycle Handling**: Draw attack graphics into the existing cleared `EnemyView.graphics` or `MineHazardView.graphics`; clean created objects in the existing `destroy()` methods. Do not persist animation frames or visual dust into `StageSnapshot`.

### I02. Worm phase transition map blackout
- Related Files:
  - `src/game/scenes/StageScene.js` :: `create`, `renderWorld`, `update`, SHUTDOWN handler — temporary map dimming; modify
  - `src/game/render/EnemyView.js` :: boss transition tint/pose — preserve readable worm; modify

#### Details
- **Data & Schema Fields**:
  - Add a scene-only Phaser rectangle `bossBlackout` at screen coordinates `(0,0)` with size `640×360`, scroll factor 0, depth 2, fill `0x050409`. It is not part of `StageRun` or save data.
- **Execution Flow / Logic**:
  1. In `renderWorld`, show the overlay only when `run.boss.kind==='worm' && run.boss.state==='transition'`. Set alpha to `0.9` for the existing 30 transition ticks; outside the transition set it invisible and alpha 0.
  2. Keep overlay depth below boss/player sprites and effects and above the background/terrain so the map darkens while the player, worm, attack glow and HUD remain visible. Keep the camera and fixed-step simulation running.
  3. `StageScene` already plays `bossPhase` for `boss:transition`; T01 changes that existing synthesis to the short roar. Do not replay it per render frame or add another event.
  4. Destroy `bossBlackout` in the existing Phaser SHUTDOWN cleanup. Do not add a sound toggle or change settings/save schema.

## Acceptance Criteria
- [x] Every worm attack has a distinct windup and active pose; danger effects align with existing `telegraphs`/`hitboxes`.
- [x] Existing burrow trail and separately retargeted second phase-two strike remain readable and unchanged.
- [x] The map darkens for exactly the existing 30 transition ticks; worm ore glows red and the short roar plays once.
- [x] Player movement remains available during the mine worm transition; transition does not lengthen or add damage.
- [x] Acid pool remains 240 ticks and charge, tail, spit, and burrow collision behavior remains unchanged.
- [x] No generic boss warning/hitbox rectangle remains after the per-attack visuals are present; ordinary enemy warnings remain.

## Validation
- `node scripts/pack-art.mjs` — regenerates the 24-frame worm sprite sheet.
- `node --test test/assets.test.js test/animation-contract.test.js test/mine-boss.test.js` — worm frames and unchanged attack-state contract pass.
- `npm run build` — production build passes.

## Commit Message
```text
feat(boss): animate worm attack patterns and phase change

Plan: 2026-11-08-boss-attack-clarity
Phase: P01-boss-presentation
Task: T03-worm-attack-motion

- Add attack-specific worm poses and aligned effects
- Dim the mine during the mobile second-phase transition
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — asset pack, 지정 테스트 21개, production build 통과
- commit: pending
