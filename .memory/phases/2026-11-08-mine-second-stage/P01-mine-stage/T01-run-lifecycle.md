# Task: T01 체크포인트 제거와 저장·복구

## Status: done

## Goal
숲에서 사망하면 처음부터 다시 시작하고, 종료 후에는 마지막 저장의 실제 전투 상태를 일시정지 상태로 이어가게 한다. 새 저장은 스테이지별 기록을 담으며 기존 v1 데이터는 사용자의 결정에 따라 한 번 초기화한다.

## Decision Summary
- 두 스테이지 공통 규칙: 체크포인트 없음, 사망 때 체력·적·아이템 초기화, 시간 0 및 사망 횟수 누적. 당시 스테이지의 정상 플레이 시간만 센다.
- 시작·이어하기·새로고침 모두 사용 중인 앱의 저장 안전장치를 지킨다. 기존 알려진 v1 초기화는 예외적으로 허용하고 손상·미래 버전은 보존한다.

## Implementation

### I01. 숲 실행 상태와 죽음
- Related Files:
  - `src/game/sim/stage.js` :: `createStageRun`, `stepStage`, `stageTerrain` — 실행 생성·틱·충돌; modify
  - `src/game/content/forestStage.js` :: `FOREST_STAGE`, `validateStage` — 숲 데이터 검증; modify
  - `src/game/scenes/StageScene.js` :: `create`, `renderWorld`, `update`, `pauseGame` — 체크포인트 표시 제거·복구 메뉴; modify
  - `test/stage-lifecycle.test.js`, `test/forest-stage.test.js` — 수명주기·지형 검증; modify

#### Details
- **Signatures & Types**:
  ```ts
  type StageId = 'forest-1' | 'mine-1';
  type RecordEntry = { elapsedTicks: number; deaths: number };
  function createStageRun(stage: StageDefinition, data?: StageSnapshot | {}): StageRun;
  function snapshotStageRun(run: StageRun): StageSnapshot;
  function restoreStageRun(stage: StageDefinition, snapshot: StageSnapshot): StageRun;
  function stepStage(run: StageRun, input: InputFrame, stage: StageDefinition): {run: StageRun, events: GameEvent[]};
  ```
- **Data & Schema Fields**: `StageRun`은 기존 `stageId,player,enemies,projectiles,boss,arenaLocked,consumedPickupIds,elapsedTicks,deaths,outcome,deathTicks`를 유지하고 `checkpoint`를 제거한다. `player.hitIds`와 각 적의 `hitIds`는 런타임에서 `Set<string>`이다. `StageSnapshot`은 위의 모든 시뮬레이션 필드를 포함하는 JSON 전용 데이터이며 각 Set은 문자열 배열로 저장한다. `outcome`은 `null|'clear'`, 틱/사망 수는 음이 아닌 정수다. 플레이어의 위치·속도·모드·피격 무적·회피/공격 쿨다운·조준, 적/보스의 HP·상태·타이머·대상·예고/판정, 투사체의 위치·속도·수명 등 진행에 영향을 주는 모든 값을 빠짐없이 저장한다. 각 배열은 독립 복사하고 복원 시 Set을 되살린다.
- **Execution Flow / Logic**:
  1. `FOREST_STAGE.checkpoint`, 검증 로직, 장면의 깃발·문구·이벤트·사운드·옛 `checkpointData` 사용을 제거한다. 숲 지형, 적과 회복 위치, 공격 및 등장 중 이동은 유지한다.
  2. 사망 판정은 기존과 같이 즉시 1회만 `deaths++`하고 `elapsedTicks=0`, `deathTicks=60`으로 표시한다. 사망 애니메이션 중 시간은 증가시키지 않는다. 60틱 뒤 `createStageRun(stage)`으로 완전히 새 상태를 만든 뒤 누적 `deaths`만 이전한다. HP=3, 적/보스/아이템 모두 초기화한다. 새 플레이 첫 활성 틱부터 시간을 측정한다.
  3. `snapshotStageRun`은 구조적 복사 후 Set을 배열로 변환한다. 복원은 stageId, 필수 필드, 정수 범위, 유한 좌표/속도, 배열·ID 유일성, HP와 상태/타이머, 정적 아이템 ID, Set 문자열을 검증한 뒤 새 객체를 만들고 Set을 복구한다. 생명체가 죽어 있는 순간도 그대로 복구해 사망 카운트를 재증가시키지 않는다. `JSON.parse(JSON.stringify(snapshot))` 전후 동작이 같아야 한다. 잘못된 스냅샷은 `TypeError`/`RangeError`로 거절하고 기본 상태로 조용히 바꾸지 않는다.
  4. 이어하기와 자동 새로고침 복구는 `data.run`을 복원하고 `pauseGame`을 띄운다. 시작 직후 입력과 시간을 진행하지 않는다. `InputController.reset()`으로 눌림을 비우고 재개 입력 이후에만 틱을 진행한다. 회복 안내에서 체크포인트 언급을 제거한다.
  5. `outcome`이 clear인 스냅샷을 진행 중 데이터로 다시 쓰지 않는다. 장면 종료 핸들러의 flush가 완료 기록이나 다음 스테이지 대기를 덮어쓰지 못하도록 `finished`를 유지한다.

### I02. v2 저장, 초기화 및 주기
- Related Files:
  - `src/game/storage/saveStore.js` :: `SAVE_KEY`, `freshSave`, `parseSave`, `loadSave`, `writeSave`, `recordCompletion` — 저장 계약; modify
  - `src/game/storage/appStore.js` :: `createAppStore` — 최초 읽기·초기화·재시도; modify
  - `src/game/storage/runCoordinator.js` :: `createRunCoordinator` — 주기 저장·완료; modify
  - `src/game/storage/reloadRecovery.js`, `src/game/ui/menu.js`, `src/game/scenes/TitleScene.js`, `src/game/scenes/ResultScene.js` — 변경된 저장 계약 호환; modify
  - `test/save-store.test.js`, `test/run-coordinator.test.js`, `test/reload-recovery.test.js`, `test/menu-state.test.js` — 저장 및 메뉴; modify

#### Details
- **Signatures & Types**:
  ```ts
  type StageId = 'forest-1' | 'mine-1';
  type StageRecords = { best: RecordEntry | null; recent: RecordEntry | null };
  type SaveV2 = { version: 2; run: StageSnapshot | null;
    unlockedStageIds: StageId[]; records: Record<StageId, StageRecords>;
    settings: { musicVolume: number; sfxVolume: number; screenShake: boolean } };
  function freshSave(): SaveV2;
  function recordCompletion(save: SaveV2, stageId: StageId, result: RecordEntry): SaveV2;
  function createRunCoordinator(options: {store: AppStore; onStorageError?: (reason: string) => void}): Coordinator;
  ```
- **Data & Schema Fields**: 기본값은 `run:null`, `unlockedStageIds:['forest-1']`, 두 스테이지 `best:null,recent:null`, `settings:{musicVolume:.5,sfxVolume:.7,screenShake:true}`. `SAVE_KEY`는 기존 `pixel-action.save.v1`을 유지하고 JSON `version`만 2로 변경한다. T01에서는 유효한 숲 스냅샷만 실행 가능하고 `mine-1` 슬롯은 예약한다. T02·T03은 새 종류와 추가 필드를 같은 버전의 명시적 검증기에 추가한다.
- **Execution Flow / Logic**:
  1. 기존 **유효한 v1 스키마 전체**를 별도 판별기로 읽으면 과거 값을 복사하지 않고 `freshSave()`로 전환해 동일 게임 키에 v2를 기록한다. 최초 v2 쓰기 실패는 저장 경고·재시도 경로를 사용하고, 입력/출력 실패 시 거짓 성공하지 않는다. 기존 v1 초기화는 사용자 합의로 별도 안내하지 않는다.
  2. JSON 손상, 모양이 유효하지 않은 v1, version>2 또는 읽기 실패는 초기화하지 않고 원본을 보존한다. 저장 차단·재시도·읽기 실패 후 기존 슬롯과의 충돌 검사는 현행과 같이 유지한다. 무관한 localStorage/sessionStorage 키는 건드리지 않는다.
  3. 스키마는 모든 최상위 키와 각 레코드·설정을 정확히 확인한다. 해금 ID의 중복·알 수 없는 ID, 시간/사망 음수, 비유한 값, 잘못된 세계 스냅샷을 거부한다. 버전 2의 미래 미지원 shape도 기존 원본을 덮어쓰지 않는다.
  4. `recordCompletion`은 대상 스테이지의 recent만 갱신하며 기존 best보다 시간이 엄격히 짧을 때만 best를 해당 사망 횟수와 함께 갱신한다. 동률은 기존 best를 유지한다. 다른 스테이지 기록·해금·설정은 유지한다. T01에서는 완료 후 run=null; T04가 숲 클리어 시 광산 대기 스냅샷 생성으로 확장한다.
  5. `createRunCoordinator`는 `exportStageSnapshot()`을 사용하고 실행 틱과 별도인 내부 0~59 카운터로 60틱마다 저장한다. `elapsedTicks`는 사망 때 감소하므로 저장 주기의 기준으로 쓰지 않는다. 아이템·사망·완료 시, 일시정지·`visibilitychange` 숨김·`pagehide`·정상 종료 시 flush한다. 사망 이벤트 발생 시 이미 적용된 0 시간과 누적 횟수를 저장한다. 비활성 화면에서 실제 경과시간에 대한 저장 주기를 주장하지 않는다.
  6. T01에서 제목과 결과 화면은 숲만 표시하되 v2 레코드를 읽게 고친다. 새 스테이지 선택과 숲 클리어 후 광산 대기는 T04에서 추가한다. T01 뒤에도 기존 게임을 시작·재개·완료할 수 있어야 한다.

### I03. 회귀 테스트
- Related Files: `test/stage-lifecycle.test.js`, `test/save-store.test.js`, `test/run-coordinator.test.js`, `test/menu-state.test.js` — modify
#### Details
- 시작 전/후/보스에서 사망해 시작 지점, 모든 아이템·적·보스 복구, 시간 0과 누적 사망을 확인한다. 기존에 체크포인트 소비 보존과 사망시간 포함을 기대하던 테스트는 새 사양으로 교체한다.
- 공격·무적·적 타이머·투사체와 보스 페이즈를 JSON 왕복하고 같은 입력을 주었을 때 다음 상태와 이벤트가 같은지 비교한다. 사망 중 저장/복구도 중복 카운트 없이 비교한다.
- 유효 v1 자동 초기화, v2 설정·기록 기본값, 관련 없는 키 보존, 손상/미래 버전 비파괴, 저장 실패·복구 및 충돌, 사망 직후 60틱 저장과 이벤트/페이지 종료 flush, 중복 완료 방지, 재개 전 틱 중지, 기록 동률을 확인한다.

## Acceptance Criteria
- [ ] 숲에 체크포인트나 관련 UI가 없고 사망 시 해당 스테이지의 모든 상태가 초기화되며 기록 시간만 0으로 돌아간다.
- [ ] 플레이·보스·사망 상태의 JSON 왕복과 일시정지 복구가 정확하며 저장 타이머가 사망 후에도 동작한다.
- [ ] 유효 v1 진행·기록·설정은 자동 초기화되고 손상·미래 데이터는 보존된다.
- [ ] 기존 숲 시작·완료, 설정, 개별 기록, 저장 오류 알림이 계속 동작한다.

## Validation
- `node --test test/stage-lifecycle.test.js test/forest-stage.test.js test/save-store.test.js test/run-coordinator.test.js test/menu-state.test.js test/reload-recovery.test.js` — 변경된 수명주기와 저장 통과.
- `npm test` — 전체 회귀 통과.
- `npm run build` — Vite 빌드 성공; 기존 번들 크기 경고는 결과에 기록.

## Commit Message
```text
feat(run): restart stages and restore saved state

Plan: 2026-11-08-mine-second-stage
Phase: P01-mine-stage
Task: T01-run-lifecycle

- Remove checkpoints and restart attempts on death
- Save versioned full run snapshots and stage records
```

## Progress
- [x] 구현 완료
- [x] 검증 통과: 전체 76개 테스트, 대상 33개 테스트, 빌드 통과. 기존 Vite 대형 번들 경고 유지.
- commit: 이 Task의 구현 커밋
