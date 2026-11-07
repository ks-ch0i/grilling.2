# Task: T03 일반 공격 준비 표시

## Status: done

## Goal
캐릭터 가까이 실제 공격 가능 상태를 표시해 단발 공격 중 클릭이 무시되는 시점과 다시 공격할 수 있는 시점을 알린다.

## Decision Summary
- 확정된 `.memory/decisions/2026-11-07-combat-feedback.md` D04: 클릭 예약과 콤보는 추가하지 않는다. 공격, 구르기, 내려찍기, 피격 등 공격 불가 상태를 반영하고 가능해진 순간 가까운 게이지를 잠깐 밝힌다.
- 시뮬레이션은 60Hz이며 일반 공격은 준비 4+활성 5+회복 10=19틱이다. 현재 `stepPlayer`는 `mode`가 `attack`, `roll`, `dive`, `hurt`, `dead`일 때 일반 공격을 시작할 수 없고 그 밖의 idle/run/jump/fall에서는 가능하다. 보스 등장·전환 중에도 공격 동작은 가능하지만 적 피해는 별도로 잠겨 있다.
- 기존 T04 변경이 미커밋일 수 있다. 구현 전 기준 diff를 확인하고 기존 변경을 보존한다. 같은 파일의 이전 변경과 새 변경을 안전히 분리할 수 없으면 그 사실과 미커밋 상태를 보고한다. T01의 추가 보호 필드·T02 화살표가 있어도 상태 판정 계약을 바꾸지 않는다.

## Implementation

### I01. 실제 입력 조건과 표시 상태
- Related Files:
  - `src/game/sim/player.js` :: `canStartAttack`, `stepPlayer` — 공통 입력 가능 조건; modify
  - `src/game/render/attackIndicator.js` :: `attackIndicatorState` — 표시 전환의 순수 계산; new
  - `src/game/render/PlayerView.js` :: constructor, `sync`, `destroy` — 플레이어 근처 게이지; modify
  - `src/game/scenes/StageScene.js` :: `renderWorld`, pause/restore — 씬 상태 전달; modify only if needed
  - `src/game/sim/constants.js` :: `ATTACK_TICKS`, `ROLL_TICKS`, `HURT_TICKS` — 실제 타이밍; read-only

#### Details
- **Signatures & Types**:
  ```typescript
  type PlayerMode = 'idle' | 'run' | 'jump' | 'fall' | 'attack' | 'roll' | 'dive' | 'hurt' | 'dead';
  function canStartAttack(player: { mode: PlayerMode }): boolean;
  type IndicatorMemory = { ready: boolean | null; flashUntil: number; lastTick: number | null };
  type IndicatorResult = { memory: IndicatorMemory; visible: boolean; progress: number; flash: boolean };
  function attackIndicatorState(player: Player, tick: number, active: boolean, previous: IndicatorMemory): IndicatorResult;
  ```
- **Data & Schema Fields**: `canStartAttack`는 mode가 idle/run/jump/fall일 때만 true. 렌더 전용 초기 메모리는 `{ready:null,flashUntil:0,lastTick:null}`이며 저장 파일이나 `Player` 시뮬레이션 모델을 변경하지 않는다. `active`는 씬이 일시정지·클리어가 아니고 플레이어가 dead가 아니며 보스가 dying/dead가 아닌 상태다. 보스 intro/transition 자체는 false 사유가 아니다.
- **Execution Flow / Logic**:
  1. `stepPlayer`의 공격 시작 분기를 기존 우선순위(구르기→내려찍기→점프/공격) 안에서 공통 `canStartAttack`으로 표현한다. 공격 중 클릭은 버리고 별도 대기 입력을 만들지 않는다. 종료 틱의 클릭은 기존과 같이 버리고 다음 틱의 새 클릭만 허용한다. `hurtTicks`가 1에서 0이 되어 모드가 전환된 틱의 기존 허용 동작을 유지한다. 마우스 방향은 계속 매 틱 갱신한다.
  2. `attackIndicatorState`는 `active && canStartAttack(player)`를 ready로 삼는다. 이전 ready가 false이고 이제 true면 `flashUntil = tick+8`(약 0.13초); 같은 tick의 반복 렌더는 flashUntil을 연장하지 않는다. flash는 `ready && tick < flashUntil`, visible은 `active && (!ready || flash)`다. 첫 렌더(`ready:null`) 및 체크포인트/씬 재생성은 준비 전환으로 취급하지 않는다. `active=false`면 표시를 숨기고 `{ready:null,flashUntil:0,lastTick:tick}`로 재동기화해 다음 재개에서 허위 flash를 막는다. 매 호출에 lastTick을 갱신한다.
  3. 공격 중은 `progress=clamp(player.attackTick/19,0,1)`인 게이지로 채운다. roll은 `1 - rollTicks/18`, hurt는 `1 - hurtTicks/12`로 채운다. 착지 시점을 예측할 수 없는 dive는 빈 게이지로 표시한다. 준비 flash는 가득 찬 밝은 게이지이며 8 simulation ticks 뒤 숨긴다. 대기 시 상시 표시하지 않는다. 그래픽은 `player.x+player.w/2-8`, `player.y-8`을 기준으로 16×3px 어두운 바와 금색 채움, flash는 밝은 `0xfff4cf`로 그린다. 캐릭터를 따라가는 월드 좌표·정수 픽셀·depth 7을 사용한다.
  4. 한 `PlayerView`의 graphics는 생성 시 한 번 만들고 매 sync clear 후 다시 그리며 `destroy()`에서 제거한다. pause 동안 tick이 진행하지 않아도 flash가 멈추거나 재개 시 허위 표시되지 않도록 `active`를 반영한다. 체크포인트 복원, 죽음·리스폰, clear, 씬 재시작 시 이전 렌더 메모리를 초기화하거나 안전하게 재동기화한다.
  5. 오류/경계: 진행도는 0..1로 clamp한다. `tick`은 `run.elapsedTicks`이므로 재복원해 감소한 경우 메모리를 초기화한다. 보스 intro와 transition에서 공격 자체는 허용하지만 현재 `interactionLocked` 때문에 데미지가 막히는 기존 동작을 변경하지 않는다.

### I02. 상태 전환 및 입력 검증
- Related Files:
  - `test/player.test.js` :: 단발·마우스 조준·상태별 입력; modify
  - `test/attack-indicator.test.js` :: 순수 표시 상태; new
#### Details
- idle/run/jump/fall은 준비, attack/roll/dive/hurt/dead는 미준비. 기존 분기 우선순위, 피격 해제 틱 및 종료 틱 입력, 공격 중 클릭 미예약, 현재 마우스 방향 유지 테스트를 추가하거나 보존한다.
- 공격/roll/hurt 진행도와 dive 빈 상태, false→true 8틱 flash, 첫 렌더·동일 틱 반복·pause/resume·tick 감소·죽음/리스폰을 검증한다. 보스 intro/transition에서 동작은 가능하고 피해 잠금은 유지됨을 통합 테스트 또는 기존 테스트로 확인한다.
- 실제 브라우저에서 단발 클릭, 빠른 연속 클릭, 구르기, 내려찍기, 피격, pause/resume을 확인한다. 게이지와 캐릭터·칼날·HUD가 겹쳐 상태를 못 읽는지 확인한다.

## Acceptance Criteria
- [x] 공격 불가인 모든 상태에서 캐릭터 가까이에 상태가 나타나고 실제 준비 시점에만 짧은 밝은 표시가 나타난다.
- [x] 공격 중 클릭은 예약되지 않으며 기존 자유 조준과 단발 규칙이 유지된다.
- [x] pause, 죽음, 체크포인트, 보스 연출과 씬 재시작에서 유령 표시가 없다.

## Validation
- `node --test test/player.test.js test/attack-indicator.test.js test/stage-lifecycle.test.js` — 입력·표시·보스 상호작용 회귀 통과.
- `npm.cmd test` — 전체 테스트 통과.
- `npm.cmd run build` — Vite 빌드 성공.
- `git diff --check` — 공백 오류 없음. 브라우저 확인 방법과 자동/사람 조작 여부를 기록한다.

## Commit Message
```text
feat(ui): show player attack readiness

Plan: 2026-11-07-combat-feedback
Phase: P01-combat-feedback
Task: T03-attack-readiness

- Show actual attack availability near the player
- Preserve unqueued single attacks and free aiming
```

## Progress
- [x] 구현 완료
- [x] 검증 통과: 전체 테스트 62개와 빌드 통과. Chrome 자동 입력으로 공격·구르기·내려찍기·일시정지, 테스트 상태 설정으로 피격 표시를 확인했다. 브라우저 오류 없음.
- commit: 19e390a
