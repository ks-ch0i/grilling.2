# Task: T03 Authored Arena Layouts and Layered Movement

## Status: done

## Goal

숲과 광산에 각 3개의 수작업 발판 배치를 넣고 새 시도마다 하나를 선택한다. 각 스테이지의 다층 배치에서 실제 조작으로 층을 오를 수 있어야 하며, 예전 하드 저장의 정확한 배치가 복원되어야 한다.

## Decision Summary

- 배치는 새 시도 단위로 고르고 하드 라운드 전환/이어하기 동안 유지한다. 새 배치는 별도 `authored` 구분으로 저장하고 이전 `random` 및 `legacy-fixed`를 호환한다.
- 두 층에서 발판의 가로 겹침을 허용하되 점프 도달 가능성, 지상 통로, 현재 서 있는 층의 판정을 보존한다. T03에서는 기존 그래픽으로 전부 플레이 가능하다.

## Implementation

### I01. 스테이지 배치 데이터와 새 시도 선택

- Related Files:
  - `src/game/content/arenaPlatformPresets.js` :: `ARENA_PLATFORM_PRESETS` — 데이터와 안정된 순서, Phaser/시뮬레이션 의존 없음; new
  - `src/game/sim/terrain.js` :: `createAuthoredPlatformLayout`, `validatePlatformLayout`, `validateAuthoredPlatformGeometry` — 선택, 검증 및 호환; modify
  - `src/game/sim/stage.js` :: `createStageRun`, `restoreStageRun`, `stepStage` — 스테이지 시도에 결합; modify
  - `src/game/sim/mineCarts.js` :: `nextRandom` — 32비트 결정적 난수; read-only
  - `src/game/content/forestStage.js`, `src/game/content/mineStage.js` :: `FOREST_STAGE`, `MINE_STAGE` — 바닥, 스폰, 아레나와 예전 고정 발판 정의; read-only

#### Details

- **Signatures & Types**:
  ```typescript
  type StageId = 'forest-1' | 'mine-1';
  type Profile = { x: number; w: number; topProfile: number[]; variant: number };
  type Rect = { x: number; y: number; w: number; h: number };
  type AuthoredLayout = { mode: 'authored'; presetId: string; platforms: Profile[] };
  type LegacyLayout = { mode: 'random'; platforms: Profile[] | Rect[] } | { mode: 'legacy-fixed'; platforms: Rect[] };
  const ARENA_PLATFORM_PRESETS: Readonly<Record<StageId, readonly { id: string; platforms: readonly { x: number; w: number; topProfile: readonly number[]; variant: number }[] }[]>>;
  createAuthoredPlatformLayout(stage: Stage, rngState: number): { layout: AuthoredLayout; rngState: number };
  validateAuthoredPlatformGeometry(stage: Stage, platforms: Profile[]): true;
  validatePlatformLayout(stage: Stage, layout: AuthoredLayout | LegacyLayout): true;
  ```
- **Data & Schema Fields**:
  - 아래 행 순서는 스테이지별 배치 인덱스(0..2)와 해당 배치 발판 인덱스(0..2)다. 각 발판은 `(x, w, topProfile, variant)`. X/Y는 기존 640×360 게임 월드 픽셀이고, 프로필은 왼쪽부터 16픽셀마다의 접촉 높이. 바닥 윗면 Y=304, 아레나 X=16..624, 게임 내 스폰 X=16을 유지한다.
  - 숲 variant 의미: 0 뿌리·흙, 1 통나무, 2 석조 유적, 3 나뭇가지. 광산 variant 의미: 0 광맥 바위, 1 채굴 작업대, 2 폐철로, 3 철제 구조물. T04가 전체 조형물의 개별 그림에 이 순서를 사용하므로 이미 저장한 ID와 행 순서를 재배정하지 않는다.

| Stage | Preset ID | idx 0 | idx 1 | idx 2 |
| :--- | :--- | :--- | :--- | :--- |
| 숲 | forest-creek-v1 | (112, 64, [276,274,272,274], 0) | (268, 80, [264,262,262,264,266], 1) | (456, 64, [252,250,252,254], 3) |
| 숲 | forest-terrace-v1 | (176, 96, [266,264,264,266,268,266], 1) | (240, 64, [216,218,220,220], 2) | (440, 80, [272,270,268,270,272], 0) |
| 숲 | forest-ruins-v1 | (104, 48, [282,280,282], 3) | (296, 112, [256,254,252,252,254,256,258], 2) | (496, 64, [268,266,266,268], 1) |
| 광산 | mine-rails-v1 | (112, 80, [276,276,278,278,276], 2) | (288, 64, [256,256,256,256], 1) | (472, 80, [268,266,264,266,268], 0) |
| 광산 | mine-lift-v1 | (128, 64, [276,274,272,274], 0) | (288, 64, [216,216,218,220], 3) | (320, 112, [268,270,268,266,266,268,270], 1) |
| 광산 | mine-catwalk-v1 | (128, 64, [282,280,280,282], 1) | (256, 112, [256,254,254,254,256,256,258], 2) | (464, 96, [270,268,266,266,268,270], 3) |

- **Execution Flow / Logic**:
  1. 카탈로그를 깊게 동결하고 정확한 단계 ID에 연결한다. `createAuthoredPlatformLayout`은 기존처럼 잘못된 단계 `TypeError`, uint32 범위 밖 상태 `RangeError`. `nextRandom(rngState)`를 한 번 사용하여 `Math.floor(value * 3)`으로 고르고 복제한 layout 및 다음 상태를 반환한다. 연속 재시도에서 동일 배치가 다시 나올 수 있으며 선택은 매번 새로 수행한다. 런에서 좌표를 조합하는 기존 무작위 생성기는 호출처와 기존 생성 분포 검증을 교체한 후 제거한다. 레거시 검증 함수·기존 프로필 제약·레거시 reachability 계산은 그대로 둔다.
  2. `createStageRun(stage,{},options)`만 새 선택기를 호출한다. 시작 라운드, 체력, 적 패턴과 기존 seed 옵션을 유지한다. `run.terrainLayout=layout`와 `run.rngState=nextState`를 기존 광산 카트/적 생성 전에 반영한다. `stepStage`에서 사망 후의 재시작은 원래대로 현재 RNG를 넘기므로 새 선택을 수행한다. 이지의 선택·재시도·다음 라운드와 하드 다음 스테이지도 이미 새 세션 생성 경로를 쓰므로 새 메뉴 분기를 추가하지 않는다.
  3. `validatePlatformLayout`의 `authored` 분기만 정확한 `mode,presetId,platforms` 키를 요구한다. ID가 현재 스테이지 카탈로그에 있고, 배열 길이·순서·각 프로필의 정확한 키·값·샘플이 정의와 모두 일치해야 한다. 모양/타입 불일치는 `TypeError`, 알려지지 않은 ID나 값 불일치는 `RangeError`. 선택/복원 때 점프 시뮬레이션을 반복하지 않는다. 카탈로그의 모든 배치를 별도 `validateAuthoredPlatformGeometry` 검증에 통과시키고, 저장 로드에서는 정의와 정확히 일치하는지 확인한다.
  4. `random` 및 `legacy-fixed` 분기는 기존 `mode,platforms`의 정확한 키를 계속 사용한다. `restoreStageRun`은 저장된 layout과 난수 상태를 그대로 복원한다. `terrainLayout`이 없는 예전 런은 기존 `stage.solids.slice(1)`으로만 채운다. 버전 번호나 v3→v4 마이그레이션을 변경하지 않는다. 저장된 ID를 다시 추첨하거나 저장된 높이를 새 데이터로 덮어쓰지 않는다.

### I02. 높이가 겹치는 층의 유효성 및 이동

- Related Files:
  - `src/game/sim/platforms.js` :: `validatePlatformProfile`, `followPlatformTop`, `crossedPlatformSurface`, `platformSupportAhead`; modify
  - `src/game/sim/terrain.js` :: `validateAuthoredPlatformGeometry`, `reachableFromFloor`, `canJumpTo`; modify
  - `src/game/sim/player.js`, `src/game/sim/enemies.js` :: `stepPlayer`, `stepEnemy` — 지원 면 적용 호출처; read-only
  - `src/game/sim/boss.js` :: `rootSurfaceY`, `targetRect`, `stepBoss` — 현재 서 있는 발판의 높이 및 고정된 공격 예고/판정; read-only
  - `src/game/scenes/StageScene.js` :: `syncTerrainViews` — 기존 16픽셀 모듈로 새 프로필에 임시 표시; read-only

#### Details

- `validatePlatformProfile(profile, options?: {minY?:number,maxY?:number}): true`로 확장하되 기본 248..288은 유지한다. 새 배치만 216..288, 폭 32..112 및 16의 배수, 이웃 높이차 ≤4, 전체 높이차 ≤16, variant 0..3을 적용한다.
- `validateAuthoredPlatformGeometry`는 3개 프로필, 아레나/바닥 범위, 이미 있는 `startClearance(stage)` 가로 범위와의 불겹침을 확인한다. 수평 구간이 겹치는 프로필마다 서로 교차하는 16픽셀 샘플 쌍의 차이가 모두 ≥48이어야 한다. 비교는 반열린 구간 `aStart < bEnd && bStart < aEnd`를 사용하며, 위아래 관계는 겹치는 구간 내에서 일관되어야 한다. 겹치지 않는 발판 사이에는 이 제한을 적용하지 않는다. 바닥은 기존 고체 충돌을 유지하고 떠 있는 새 발판은 위에서 내려올 때만 받쳐 주는 기존 프로필 충돌로 처리한다.
- 기존 `reachableFromFloor`의 BFS에서 실조작 `stepPlayer`를 사용한다. 중첩한 경우 높은 대상의 왼쪽/오른쪽 끝보다 바깥쪽으로 노출된 낮은 발판에서 이륙한다. 기존 `takeoffXs`의 측면 후보와 높이 오를 때까지 수평 이동을 늦추는 방식으로 카탈로그를 검증한다. 필요하면 `canJumpTo`가 낮은 발판에서 이륙 후 입력을 0으로 기다리는 대신 여러 시작 타이밍을 평가하도록 검증만 확장한다. 실제 점프 속도/중력/콜라이더를 완화하지 않는다.
- `followPlatformTop`의 현재 면 검색은 첫 가로 일치가 아니라 `platformTopY(platform,previousCenter) !== null && Math.abs(y-previousFeet)<=1e-6`인 면을 찾는다. 이전 높이 기준 ±4픽셀 이내인 다음 면을 골라 `actor.y`와 `vy=0`만 수정하는 동작은 유지한다. 서 있는 면이 없으면 false. `crossedPlatformSurface`는 하강 구간 내 먼저 닿는 높이를 이미 고르며, `platformSupportAhead`도 현재 높이 범위 안의 면을 고른다. 이 동작들을 상·하 배열 순서와 독립적으로 검증한다.
- 숲 `rootSurfaceY`는 `surfaceY >= playerFeet` 중 가장 가까운 면을 이미 사용한다. 아래에 서면 위층을 건너뛰고, 위에 서면 해당 층을 쓰며, 바닥에 서면 Y=304다. 공격 1/2차 모두 예고 rect와 발동 rect가 일치하는지 검증하고 시점·피해량·관통 규칙을 수정하지 않는다.

### I03. 배치·충돌·저장 회귀 검증

- Related Files:
  - `test/terrain.test.js` :: 결정적 선택·6개 배치·구형 형식·다층 유효성; modify
  - `test/player.test.js` 또는 `test/terrain.test.js` :: 층 판정과 실제 점프; modify
  - `test/stage-lifecycle.test.js` :: 새 시도, 사망, 라운드 고정, 이어하기; modify
  - `test/save-store.test.js`, `test/easy-mode.test.js`, `test/boss.test.js` :: 기존 라운드/저장 및 숲 뿌리 동작; modify
  - `test/knockback.test.js`, `test/mine-stage.test.js`, `test/forest-stage.test.js` :: 충돌·스테이지 회귀; read-only

#### Details

- 두 단계 각각 고정 seed `0`, `251`, `1112`는 배치 인덱스 `0`, `1`, `2`에 대응한다. 이 값들과 `0xffffffff`에서 동일 입력은 동일 결과, 첫 난수 상태는 `nextRandom(seed).state`, 반환 객체를 변경해도 카탈로그 불변을 검증한다. 기존 생성 개수·폭 분포 검증은 삭제하되 248..288 프로필과 예전 직사각형의 유효/무효 데이터를 유지한다.
- 6개 좌표 모두 실제 점프 BFS에 통과하고, 각 단계 중 단 하나의 배치에 겹침이 있으며, 아래→위 점프를 단계마다 직접 재현한다. 같은 X에서 바닥/아래/위의 수평·하강 입력 시 해당 층, 배열 순서를 바꿔도 동일을 검증한다. 48 미만 간격, 상대 층 관계 역전, 잘못된 ID/단계/프로필 변형/추가 키를 거부한다.
- 사망의 기존 `notDeepEqual(newTerrain,oldTerrain)`는 유한한 배치 수에서 항상 참일 수 없다. 사망 상태의 저장된 `rngState`로 새 선택 결과를 계산해 일치하는지를 단언하고 기존 R1/HP/누적 시간·사망 수를 그대로 확인한다. 하드는 일반→보스 라운드 전환에도 동일한 배치를 쓰고, 새 하드·이지 시작과 Forest→Mine 진행에는 맞는 단계의 배치가 쓰인다.
- 새 authored, 기존 profiled random, rectangle random, 그리고 terrainLayout 누락(legacy-fixed) 런의 복원을 통과시킨다. 이어하기에서 동일 배치, 타이머, 적 상태, 위치, RNG, 기록을 확인한다. 숲 R8 1차 뿌리와 2차 뿌리가 각 층을 예고대로 타격하는 테스트를 추가하고 바닥 기준 동작도 확인한다.

## Acceptance Criteria

- [x] 각 단계의 3개 배치는 전부 도달 검증을 통과하며, 지정된 한 배치에 두 층 간 점프 경로가 있다.
- [x] 새 시도에서만 배치가 선택되고 하드 라운드 중간 및 이어하기에는 유지된다.
- [x] 이전 저장의 발판, 타이머, 기록과 RNG를 복원할 수 있다.
- [x] 두 층에서 캐릭터와 적이 서 있는 표면을 유지하고 뿌리 예고가 올바른 층에 놓인다.

## Validation

- `node --test test/terrain.test.js test/player.test.js test/stage-lifecycle.test.js test/save-store.test.js test/easy-mode.test.js test/boss.test.js test/knockback.test.js test/mine-stage.test.js test/forest-stage.test.js` — 78개 통과.
- `npm.cmd test`, `npm.cmd run build` — 전체 201개 및 Vite 빌드 통과. 기존 대형 번들 경고가 남아 있다.
- Orca 브라우저의 별도 포트에서 하드 이어하기로 숲·광산 R8과 발판·경과 틱·사망 수가 일치하는 것을 확인했다. 테스트 입력으로 `stepStage`와 `renderWorld`를 실행해 숲 304→266→216→266, 광산 304→268→220→268 바닥·발판에 착지하고 기존 모듈 스프라이트 위치가 프로필과 일치함을 확인했다. 숲 R8 2페이즈 뿌리 예고와 발동은 아래층 Y=268, 위층 Y=216에 각각 일치했다. 이지에서는 사망 팝업의 다시 시도로 새 배치를 선택하고 누적 사망 1회를 유지했다.

## Commit Message

```text
feat(terrain): select authored arena layouts

Plan: 2026-11-20-menu-and-arena-redesign
Phase: P01-menu-and-arena
Task: T03-authored-arena-layouts

- Add six fixed arena presets with optional layered paths
- Preserve saved terrain and use the actor's current support layer
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: see the commit that marks this blueprint done
