# Task: T03 일반 적 배치와 두 동시 전투

## Status: done

## Goal
숲 스테이지의 일반 적 9마리와 지형을 유지하면서 가장 긴 단독 적 간 간격을 줄이고, 서로 다른 적 둘이 동시에 반응하는 전투 2곳을 만든다.

## Decision Summary
- `.memory/decisions/2026-11-07-combat-polish-and-encounters.md` D06~D08: 새 재사용 표시 없음; 적 수 9와 대략적인 스테이지 흐름 유지; 병사+망령과 병사+멧돼지 각 1쌍, 나머지 5마리는 단독; 구덩이 점프 직전·착지 지점은 비운다.
- 스테이지 길이 11520, 보스 입구 x=10496, 플레이어 spawn x=120 및 체크포인트 x=5760, 회복품 x=2400/6200/9600과 구덩이 `[1504,1568]`, `[3136,3200]`, `[4960,5024]`, `[6848,6912]`, `[8752,8816]`은 변경하지 않는다. T01~T02와 독립적으로 검증한다.
- 실행 전 `git status --short`로 기존 변경을 보존한다. 새 배치의 브라우저 확인은 사람의 조작감·청취 최종 인수를 대체하지 않는다.

## Implementation

### I01. 기존 적 ID와 종류를 보존한 좌표
- Related Files:
  - `src/game/content/forestStage.js` :: `FOREST_STAGE.enemies`, `validateStage` — 배치 정의; modify
  - `src/game/sim/enemies.js` :: `stepEnemy`, `specs` — 기존 시야·행동; read-only
  - `src/game/sim/stage.js` :: `createStageRun`, `stepStage` — 생성·검증; read-only
  - `test/forest-stage.test.js`, `test/stage-lifecycle.test.js` — 구조·전투 검증; modify

#### Details
- **Signatures & Types**:
  ```typescript
  type EnemySpawn = { id:string; kind:'soldier'|'wisp'|'boar'; x:number; y:number };
  function validateStage(stage: ForestStage): true; // invalid structure => TypeError; invalid geometry => RangeError
  function createStageRun(stage: ForestStage, data?: CheckpointData): StageRun;
  function stepStage(previous: StageRun, input: Input, stage: ForestStage): { run: StageRun; events: Event[] };
  ```
- **Data & Schema Fields**: 기존 순서·ID·종류·y와 3종 각 3마리는 보존한다. x만 다음처럼 설정한다. 좌표는 계획 단계에서 `validateStage`와 두 조합의 5틱 시뮬레이션으로 확인한 초기 구현값이다.

  | ID | kind | x | y | 분류 |
  | --- | --- | ---: | ---: | --- |
  | soldier-1 | soldier | 800 | 276 | 단독 |
  | wisp-1 | wisp | 2200 | 284 | 쌍 A |
  | soldier-2 | soldier | 2300 | 276 | 쌍 A |
  | boar-1 | boar | 3850 | 284 | 단독 |
  | wisp-2 | wisp | 5320 | 284 | 단독 |
  | soldier-3 | soldier | 6400 | 276 | 쌍 B |
  | boar-2 | boar | 6500 | 284 | 쌍 B |
  | wisp-3 | wisp | 8070 | 284 | 단독 |
  | boar-3 | boar | 9700 | 284 | 단독 |

- **Execution Flow / Logic**:
  1. 사전 조건: 현재 배열은 병사 x `[800,2600,7600]`, 망령 `[2200,5200,8300]`, 멧돼지 `[3900,6900,9900]`을 map하며 ID는 인덱스로 생성한다. 각 배열을 병사 `[800,2300,6400]`, 망령 `[2200,5320,8070]`, 멧돼지 `[3850,6500,9700]`으로 바꾼다. 배열 순서를 바꾸지 않아 checkpoint 복원과 이벤트의 ID가 유지된다.
  2. 구덩이의 각 경계로부터 적 생성 사각형이 최소 128픽셀 떨어지게 하고, 바닥 위에 실제 지지와 양의 충돌 상자가 있음을 `validateStage` 및 테스트로 확인한다. 지형·구덩이·발판·시작점·체크포인트·회복품·arena·보스는 수정하지 않는다. 회복품의 기존 ID/소비 상태·재시작 생성 계약도 유지한다.
  3. 쌍 A는 `wisp-1 x=2200`과 `soldier-2 x=2300`; 쌍 B는 `soldier-3 x=6400`과 `boar-2 x=6500`이다. 기존 망령 발사 감지거리 260, 멧돼지 돌진 감지거리 220, 병사 추격거리 180·공격 시작거리 36을 바꾸지 않는다. 정지한 플레이어를 각각 x=2150, x=6300에 두고 5틱 시뮬레이션하면 병사는 `chase`, 망령 또는 멧돼지는 `windup`이어야 한다. 플레이 방식에 따라 항상 동시 교전됨을 보장하지는 않는다.
  4. x순서의 인접 적 최대 간격은 기존 1700에서 1630으로 감소한다. 한정된 적을 두 쌍으로 모으므로 감소 폭은 작다. 5개 단독 적은 나머지 쌍이나 서로에게서 500픽셀 이상 분리한다. 병사·망령·멧돼지 체력·속도·공격 예고·충격량·피격 경직은 변경하지 않는다.
  5. 구조 오류는 기존 `validateStage`의 `TypeError`/`RangeError`를 유지한다. 새 저장 필드와 임시 런타임 위치 변경을 도입하지 않는다. 향후 테스트에서 보스 진입 또는 이동이 깨지면 임의로 적을 추가하거나 체력을 바꾸지 말고, 적 ID와 2개 조합·거리·안전 조건을 지키는 범위에서 좌표를 수정하고 실제 변경을 기록한다.

### I02. 구조·두 조합·완주 검증
- Related Files:
  - `test/forest-stage.test.js` :: `FOREST_STAGE` 구조·구덩이 점프·간격 테스트; modify
  - `test/stage-lifecycle.test.js` :: 2개 쌍의 실제 `stepStage` 상태; modify
  - `docs/verification/` — 자동/사람 검증 구분 및 화면 증거; new as needed
#### Details
- 종류별 3·총 9·ID 중복 없음·실제 지지·128픽셀 구덩이 생성 안전·기존 체크포인트/픽업/보스 좌표 유지·최대 간격 1630 이하를 검증한다. 단독과 쌍 분류, 두 다른 종류의 100픽셀 간격, 쌍 외 적과 최소 500픽셀 간격을 검증한다.
- `createStageRun` 뒤 대상 둘만 남기는 테스트는 **생성 후에** 필터링한다. 각각의 플레이어 위치 x=2150 / 6300, y=276에서 `stepStage`를 5틱 실행해 해당 soldier가 chase이고 파트너가 windup인 것을 검증한다. 주변 적/구덩이 제거 등 테스트 전용 상태 조작을 실제 플레이로 보고하지 않는다.
- 5개 기존 구덩이 점프와 발판 접근 테스트를 보존한다. 실제 Chrome 자동 입력으로 타이틀→전투 쌍 A·B→체크포인트→보스 2단계→클리어, 사망/시간/콘솔 오류를 확인한다. 자동 조작기에서 기존 적 좌표를 가정한 부분이 있다면 테스트용 조작기를 새 배치에 맞게 조정하되 게임 코드에서 적 수·피해를 억지로 변경하지 않는다. 두 쌍은 플레이어의 이동·회피에 따라 따로 싸울 수 있으므로 '동시 반응 가능'과 '반드시 동시 전투'를 구분한다.

## Acceptance Criteria
- [x] 일반 적 9마리와 ID·종류·지형·보스·체크포인트·회복품이 유지된다.
- [x] 서로 다른 종류의 두 쌍이 각각 동시 반응 가능하며 나머지 5마리는 단독이다.
- [x] 적은 구덩이 점프 직전·착지 지점에 생성되지 않고 기존 구덩이를 건널 수 있다.
- [x] 기존 가장 긴 인접 적 간 간격보다 새 간격이 짧고 보스까지 클리어 가능하다.

## Validation
- `node --test test/forest-stage.test.js test/stage-lifecycle.test.js test/enemies.test.js` — 구조·지형·두 조합 통과.
- `npm.cmd test` — 전체 테스트 통과.
- `npm.cmd run build` 및 `git diff --check` — 빌드·공백 검사 통과.
- Chrome 자동 입력 완주 결과의 시간·사망·남은 적·두 조합 상태·브라우저 오류를 기록한다. 소리 품질과 난이도는 사람이 직접 평가하기 전 미확인으로 표시한다.

## Commit Message
```text
feat(stage): rebalance forest enemy encounters

Plan: 2026-11-07-combat-polish-and-encounters
Phase: P01-combat-polish
Task: T03-encounter-spacing

- Arrange two mixed enemy pairs without changing enemy counts
- Shorten the longest gaps while preserving pit approaches
```

## Progress
- [x] 구현 완료
- [x] 전체 테스트 74개·빌드 통과, 두 쌍의 동시 반응을 시뮬레이션으로 확인. Chrome 자동 입력 완주는 181.37초·사망 1회·브라우저 오류 없음. 최초 사망 전 9마리 타격을 확인했으며, 체크포인트 복구로 재생성된 적 중 앞 구간 5마리는 클리어 시 남아 있었다. 증거: `docs/verification/combat-polish-2026-11-07/`.
- commit: 이 Task의 Git 이력 참조
