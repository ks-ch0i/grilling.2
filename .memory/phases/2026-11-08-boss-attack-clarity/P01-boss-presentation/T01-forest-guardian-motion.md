# Task: T01 숲 수호자 공격 모션과 효과

## Status: done ✅

## Goal
숲 수호자의 세 공격과 페이즈 전환에 분명한 준비·실행 시각 신호를 제공하되 기존 공격 시간과 판정을 그대로 유지한다.

## Decision Summary
- 숲 수호자는 팔을 당겨 가지를 크게 휘두르고, 땅 갈라짐 뒤 뿌리를 올리며, 팔을 들어 앞땅을 내려친다. 페이즈 전환은 주변 나무·뿌리의 흔들림·빛과 짧은 포효로 표현한다.
- 보스 공격의 노란 준비 사각형과 빨간 피해 사각형은 이 Task에서 숲 수호자 전용 효과로 대체한다. 일반 적의 표시는 유지한다.

## Implementation

### I01. 숲 수호자 포즈 시트와 클립
- Related Files:
  - `public/assets/source/boss-spaced-original.png` — 숲 수호자 포즈 원본, 24개 셀; modify
  - `public/assets/characters/boss/poses.png` — 재패킹되는 게임 시트; modify
  - `scripts/pack-art.mjs` :: `specs`, `makeAtlas` — 6×4 셀 패킹; modify
  - `src/game/assets/manifest.js` :: `ASSETS`, `clips`, `clip` — 자산 수와 애니메이션 클립; modify
  - `src/game/assets/animation.js` :: `bossAnimation(boss)` — attackKind/state별 클립 선택; modify
  - `docs/asset-provenance.md` — 원화 생성·패킹 출처; modify
  - `test/assets.test.js`, `test/animation-contract.test.js` — 셀·클립 계약; modify

#### Details
- **Signatures & Types**:
  ```ts
  type AnimationClip = { key:string; owner:string; state:string; texture:string; frames:number[]; fps:number; loop:boolean };
  type ForestBoss = { kind:'boss'; state:string; attackKind:null|'branch'|'root'|'slam' };
  function bossAnimation(boss:ForestBoss):AnimationClip;
  function animationFrame(clip:AnimationClip,elapsedTicks:number):number;
  ```
- **Data & Schema Fields**:
  - 숲 보스 자산 `boss`: 프레임 크기 112×112, 개수 24, 행 우선 6열×4행. 원점 `(0.5,1)`은 유지한다.
  - 프레임 배정: `0–1 idle`, `2–3 intro`, `4–5 branchWindup`, `6–8 branchAttack`, `9–10 rootWindup`, `11–12 rootAttack`, `13–14 slamWindup`, `15–17 slamAttack`, `18–20 transition`, `21–23 dead`.
  - `bossAnimation`은 `state==='windup'|'attack'`일 때 `attackKind`와 상태를 조합해 해당 클립을 고른다. 기타 상태는 `intro`, `idle`, `transition`, `dead` 클립을 반환한다.
- **Execution Flow / Logic**:
  1. 원본은 기존 숲 수호자 실루엣·팔·나뭇가지와 기존 픽셀 밀도를 유지한다. 각 프레임은 투명 112×112 셀 안에 온전히 들어가고 인접 셀에 닿지 않게 한다. 원본 시트는 `pack-art.mjs`로 재생성할 수 있게 프레임 격자를 정확히 6×4로 지정한다.
  2. `manifest.js`의 `boss` 프레임 수를 24로 바꾸고 위 표대로 클립을 등록한다. 공격 클립은 windup에서 미리 당기는 포즈, attack에서 타격과 복귀를 보여준다. 모든 클립은 고정 시뮬레이션 틱을 사용한다.
  3. `bossAnimation`은 branch/root/slam 각각의 windup과 attack에 서로 다른 키를 반환한다. 공격 선택, `boss.js`의 공격 표, 체력, 위치, 히트박스 및 상태 틱은 수정하지 않는다.
  4. 원본 생성 방식, 픽셀 크기, 프레임별 설명을 `docs/asset-provenance.md`에 기록한다. T04 이후 실제 기준선에 원본 명칭이 달라졌으면 새 경로를 기록하되 24개 셀 규격을 유지한다.

### I02. 숲 공격 효과와 전환 포효
- Related Files:
  - `src/game/render/EnemyView.js` :: `sync(run)` — 숲 보스의 예고·활성 효과; modify
  - `src/game/audio/AudioManager.js` :: `SFX.bossPhase`, `playSfx(id)` — 짧은 전환 포효; modify
  - `src/game/scenes/StageScene.js` :: `playEventSound(event)` — 기존 `boss:transition` 이벤트 연결; read-only unless the event mapping is absent after T04
  - `test/audio-manager.test.js`, `test/animation-contract.test.js` — 효과음·클립 회귀; modify

#### Details
- **Signatures & Types**:
  ```ts
  class EnemyView { sync(run:StageRun):void; }
  class AudioManager { playSfx(id:string):boolean; }
  type BossRect = { x:number; y:number; w:number; h:number; ticks?:number };
  ```
- **Execution Flow / Logic**:
  1. Forest boss `telegraphs` and `hitboxes` remain the only source of target and damage bounds. Never add visual timers or larger/smaller rectangles that disagree with those boxes.
  2. During branch windup, use the branchWindup pose; during its active box draw a short curved branch/swing trail within the box. During root windup, draw a thin crack at the exact target rectangle; while active, draw roots rising inside that rectangle. During slam windup use the lifted-arm clip; while active, draw a ground crack and small dirt/wood fragments inside the front-ground box.
  3. Remove yellow fill/stroke and red fill for `run.boss.kind==='boss'`. Keep the current generic enemy windup and enemy hit drawing unchanged. Keep mine boss fallback rectangles until T02/T03 each supply their attack visuals.
  4. When forest boss state is `transition`, lightly animate the existing world/root graphics with a small repeating offset and glow for the existing 90 ticks. Do not stop player movement or extend the transition. No added camera shake or hit-stop.
  5. `boss:transition` already maps to `bossPhase`. Replace only its oscillator recipe with a short descending rough sawtooth roar (from 220Hz to 70Hz, duration 0.55s, interval 0.7s). Do not add attack-specific sounds. Keep volume, mute, unlock, and throttle logic.
- **Error & Lifecycle Handling**: Reuse `EnemyView.graphics`, clear it on each `sync`, and destroy it through the existing `EnemyView.destroy()` path. Do not create an effect sprite per tick.

## Acceptance Criteria
- [x] Forest branch, root, and slam use distinct windup/attack pose sequences and effects.
- [x] Every cue uses the exact existing `telegraphs`/`hitboxes`; no boss rectangle remains for the forest guardian.
- [x] Forest phase transition keeps 90 ticks and movement, shows the environment/root cue, and plays the short roar.
- [x] Existing forest attack cycle, damage, target lock, and 2-phase root timing remain unchanged.

## Validation
- `node scripts/pack-art.mjs` — regenerates the 24-frame forest boss sheet without empty/boundary cells.
- `node --test test/assets.test.js test/animation-contract.test.js test/boss.test.js test/audio-manager.test.js` — asset, pose, simulation-timing, and SFX checks pass.
- `npm run build` — production build passes.

Browser spot-check: the Orca browser loaded all 24 frames and rendered the forest guardian in practice mode. The attack frames were not inspected during live play; final three-boss browser confirmation remains in T04.

## Commit Message
```text
feat(boss): clarify forest guardian attack motion

Plan: 2026-11-08-boss-attack-clarity
Phase: P01-boss-presentation
Task: T01-forest-guardian-motion

- Add per-attack forest boss poses and aligned effects
- Add a short phase roar without changing attack timing
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: included in the T01 task commit
