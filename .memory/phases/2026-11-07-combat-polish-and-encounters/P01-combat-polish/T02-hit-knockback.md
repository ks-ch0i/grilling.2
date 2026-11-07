# Task: T02 피격 밀려남과 겹침 해소

## Status: done

## Goal
피격된 플레이어가 지상·공중에서 피해 원인의 반대 방향으로 약 12픽셀 부드럽게 밀려나고, 가능한 경우 겹친 적과 분리되게 한다. 벽과 낙사, 기존 무적을 유지한다.

## Decision Summary
- `.memory/decisions/2026-11-07-combat-polish-and-encounters.md` D04~D05: 기존 피격 12틱 동안 약 12픽셀 수평 이동, 공중의 기존 수직 낙하 유지. 충분치 않으면 겹침 해소에 필요한 만큼 추가 이동하되 벽을 통과하지 않는다. 벽에 막혀 분리되지 않으면 45틱 기존 무적 후 접촉 피해가 다시 적용된다.
- 적을 밀지 않고, 구덩이 낙사는 그대로다. 구르기·내려찍기·착지 보호 및 기존 피격 무적 중에는 피해와 밀려남을 모두 발생시키지 않는다.
- 이 Task는 T01의 시각 모션 변경 여부와 무관하게 기존 `stepPlayer`/`stepStage` 계약을 유지한다. 실행 전 `git status --short`로 기존 작업을 보존한다. 첫 스테이지 T04의 사람 인수는 여전히 별도다.

## Implementation

### I01. 피해 원인 전달과 12틱 수평 밀려남
- Related Files:
  - `src/game/sim/constants.js` :: `HURT_TICKS`, `HURT_INVULNERABLE_TICKS`, `HURT_PUSH_DISTANCE` — 12픽셀 정의; modify
  - `src/game/sim/combat.js` :: `applyPlayerDamage` — 실제 유효 피해 시 방향 저장; modify
  - `src/game/sim/player.js` :: `createPlayer`, `stepPlayer` — 밀려남 상태·물리 이동; modify
  - `src/game/sim/stage.js` :: `hurt`, `stepStage` — 접촉·공격·투사체·보스의 피해 원인 좌표 전달; modify
  - `src/game/sim/enemies.js` :: `stepProjectile` — 이동 후 충돌 투사체 위치 반환; read-only
  - `src/game/sim/geometry.js` :: `moveAxis`, `intersects` — 충돌과 미세 단위 이동; read-only

#### Details
- **Signatures & Types** (기존 JS의 호환 계약):
  ```typescript
  type DamageSource = 'pit' | 'contact' | 'enemy-attack' | 'projectile' | 'boss-attack';
  type Impact = { originX: number }; // optional, 월드 좌표
  function applyPlayerDamage(state: Player, source?: DamageSource, impact?: Impact): { player: Player; events: Event[] };
  function stepPlayer(state: Player, input: Input, terrain: Rect[], pitDeathY?: number):
    { player: Player; events: Event[]; pushCompleted?: -1 | 1 };
  function stepStage(previous: StageRun, input: Input, stage: ForestStage): { run: StageRun; events: Event[] };
  ```
- **Data & Schema Fields**: `HURT_PUSH_DISTANCE=12`; 새 플레이어는 `hurtPushTicks:number=0`, `hurtPushDirection:-1|1=1`. 임시 플레이어 상태만 사용하며 checkpoint 저장 스키마는 변경하지 않는다. `pushCompleted`는 마지막 밀림 tick을 stage에 전달하는 선택적 내부 반환 필드로, 저장되거나 오디오/외부 이벤트로 발행되지 않는다.
- **Execution Flow / Logic**:
  1. `applyPlayerDamage`는 기존 dead 중복·roll·dive·착지 보호·피격 무적 검사를 **먼저** 수행한다. 무효 피해는 HP, mode, 피격/밀림 타이머, 이벤트를 변경하지 않는다. `pit`은 기존처럼 무적을 무시하고 즉사하며 밀림을 시작하지 않는다. 유효한 마지막 HP 피해도 즉사와 death 이벤트만 유지한다.
  2. 유효한 비치명 피해에서 기존 HP 감소·`hurtTicks=12`·`invulnerableTicks=45`·hurt 이벤트를 유지하고 `hurtPushTicks=12`를 설정한다. 플레이어 중심 x가 `impact.originX`보다 크면 방향 +1, 작으면 -1이다. 좌표가 없거나 일치하면 `-player.horizontalFacing`(값이 유효하지 않으면 -1)을 사용한다. 선택적 세 번째 인자는 기존 직접 호출 테스트를 깨지 않는다.
  3. `stage.hurt`는 각 비치명 피해의 원인 중심을 전달한다: 일반 적 몸 접촉 및 일반 적 근접 공격은 해당 `enemy.x+enemy.w/2`; 보스 몸 접촉은 보스 중심; 보스 공격은 실제 충돌 hitbox 중심; 투사체는 `stepProjectile`가 반환한 **이동 후** `r.projectile.x+r.projectile.w/2`. 현재 `projectile:hit` 이벤트는 ownerId만 있으므로 오래된 owner의 현 위치로 대체하지 않는다. 기존 이벤트 모양·투사체 소멸·`enemy.hitIds` 로직은 유지한다.
  4. `stepPlayer`는 각 틱 시작 시 `mode==='hurt' && hurtPushTicks>0`을 스냅샷한다. 기존 피격 카운트와 입력 판단은 유지하되 수평 이동 전에 `moveAxis(p,terrain,'x',direction * 12/12)`를 호출하고 `hurtPushTicks--` 한다. 이 이동은 일반 이동과 별도다. 12번째 피격 복구 틱에는 기존처럼 새 공격 등 입력을 받을 수 있으며 밀림 1픽셀 후 기존 입력·이동을 적용한다. 이동 중 벽에 막혀도 타이머는 끝까지 감소한다.
  5. 기존 수직 속도·중력·점프 절단·발판 충돌·pitDeathY는 변경하지 않는다. 구덩이로 밀려나면 일반 중력으로 낙사할 수 있다. 12번째 밀림 틱에는 `{pushCompleted:direction}`을 반환한다. 사망·복구·체크포인트는 새 플레이어 기본값 0으로 초기화한다. 새 피해가 무적 때문에 무시되면 방향·타이머를 재설정하지 않는다.

### I02. 실제 겹침에 대한 추가 분리
- Related Files:
  - `src/game/sim/stage.js` :: `stepStage`, `separateOverlappingTargets` — stage 충돌 후 위치 보정; modify
  - `test/player.test.js`, `test/stage-lifecycle.test.js`, `test/enemies.test.js` — 물리·피해 통합 검증; modify
#### Details
- **Signatures & Types**:
  ```typescript
  function separateOverlappingTargets(player: Player, direction: -1 | 1, targets: Rect[], terrain: Rect[]): void;
  ```
- **Execution Flow / Logic**: `stepStage`가 `pushCompleted`를 받은 틱에 일반 적/보스의 해당 틱 상태가 갱신된 뒤, 살아 있고 상호작용 가능한 몸 사각형 중 플레이어와 실제로 겹친 대상만 검사한다. +1이면 겹친 대상의 오른쪽 끝을 넘어갈 최소 양수 거리, -1이면 왼쪽 끝을 넘어갈 최소 음수 거리를 구한다. `moveAxis`로 같은 방향으로 이동하고 새 겹침이 생기면 유한한 대상 수만큼 반복한다. 이동이 막히거나 실제 x가 바뀌지 않으면 중단한다. 사망한 적·비활성 보스·투사체·공격 hitbox는 물리 몸체로 취급하지 않는다.
- 보정은 기존 면역 시간을 늘리지 않고 장애물을 관통하지 않는다. 추가 이동 뒤 support가 없으면 다음 틱 중력으로 낙하하게 둔다. 사망 판정이 우선인 틱에서는 보정하지 않는다. 보스 intro/transition/clear의 기존 `interactionLocked`, 죽음 우선순위, 승리 이벤트 및 공격 준비 게이지를 유지한다.
- **Test scenarios**: 좌·우 적 접촉과 근접 공격, 보스 hitbox, 이동 중 발사체 양 방향과 중심 동률 fallback; 비치명 12틱의 총 12픽셀과 기존 마지막 틱 입력; 공중 `vy` 변화가 기존 중력과 동일한 점; 같은 위치의 폭 20 일반 적과 폭 80 보스의 잔여 겹침 해소; 이동 방향의 벽에 막힌 경우 벽을 통과하지 않고 기존 45틱 면역 이후 재피해; 구덩이로 밀려난 후 pit 즉사; 무적 중 접촉·투사체의 밀림 없음; lethal 피해·respawn·checkpoint 초기화. 남은 공격·구르기·내려찍기 관련 테스트도 유지한다.

## Acceptance Criteria
- [x] 유효 비치명 피격에서 12틱 동안 반대 방향으로 12픽셀 이동하고 공중 수직 물리는 유지된다.
- [x] 가능하면 추가 분리되며 벽에 막힌 경우 관통하거나 영구 면역이 생기지 않는다.
- [x] 낙사, 기존 피격·구르기·내려찍기 무적과 죽음·복구 규칙이 유지된다.
- [x] 일반 적, 보스, 발사체의 실제 충돌 방향이 올바르다.

## Validation
- `node --test test/player.test.js test/stage-lifecycle.test.js test/enemies.test.js test/combat.test.js` — 원인·이동·벽·낙사·면역 경계 통과.
- `npm.cmd test` — 전체 테스트 통과.
- `npm.cmd run build` 및 `git diff --check` — 빌드·공백 검사 통과.
- Chrome에서 자동 입력 또는 명시적으로 설정한 테스트 상태로 좌우·공중·벽·구덩이·두 적 동시 접촉을 확인하고 각 방법과 남은 사람 확인을 기록한다.

## Commit Message
```text
feat(combat): add collision-safe hit knockback

Plan: 2026-11-07-combat-polish-and-encounters
Phase: P01-combat-polish
Task: T02-hit-knockback

- Push the player away from damage while preserving vertical physics
- Separate overlapping enemies without crossing solid walls
```

## Progress
- [x] 구현 완료
- [x] 전체 테스트 72개와 빌드 통과. Chrome에서 테스트 상태를 설정해 좌·우·공중·벽·구덩이·적 2마리 동시 접촉을 확인했으며 브라우저 오류는 없었다.
- commit: 이 Task의 Git 이력 참조
