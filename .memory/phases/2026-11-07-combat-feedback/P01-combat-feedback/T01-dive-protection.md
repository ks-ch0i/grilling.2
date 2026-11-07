# Task: T01 내려찍기 하강·착지 보호

## Status: done

## Goal
내려찍는 플레이어가 적에게 막히지 않고 착지 충격파를 발생시키며, 하강부터 충격파 후 0.25초까지 적 피해로부터 보호받도록 한다.

## Decision Summary
- 확정된 `.memory/decisions/2026-11-07-combat-feedback.md` D02: 하강 중 적 몸·공격·투사체 피해 면제, 착지 후 0.25초 면제, 낙사 유지. 충격파 62×31과 피해량은 유지한다.
- 60Hz 고정 틱으로 0.25초는 15틱이다. 착지 틱에도 보호되어야 하며 그 뒤 15틱 보호 후 16번째 틱에 적 피해가 다시 적용된다.
- 기존 첫 스테이지 T04 소스·자산 변경은 미커밋이다. 구현 전 `git status --short` 및 `git diff`로 기준을 보존한다. 기존 변경을 제거하거나 이 Task와 관계없는 변경을 커밋에 포함하지 않는다. 같은 파일의 사전 변경과 새 변경을 안전히 분리할 수 없으면 그 사실과 미커밋 상태를 보고한다.

## Implementation

### I01. 하강 및 착지 직후 보호
- Related Files:
  - `src/game/sim/constants.js` :: `TICK_RATE`, `DIVE_LANDING_PROTECTION_TICKS` — 고정 틱 상수; modify
  - `src/game/sim/player.js` :: `createPlayer`, `stepPlayer` — 상태 초기화와 착지 경계; modify
  - `src/game/sim/combat.js` :: `applyPlayerDamage` — 피해 우선순위; modify
  - `src/game/sim/stage.js` :: `stepStage`, `hurt`, `damageTargets` — 통합 순서 확인; read-only unless needed
  - `src/game/sim/enemies.js` :: `stepProjectile` — 투사체 접촉 시 소멸 관례; read-only

#### Details
- **Signatures & Types** (기존 JS에 적용할 계약):
  ```typescript
  type DamageSource = 'pit' | 'contact' | 'enemy-attack' | 'projectile' | 'boss-attack';
  function createPlayer(x?: number, y?: number): Player;
  function stepPlayer(state: Player, input: Input, terrain: Rect[], pitDeathY?: number): { player: Player; events: Event[] };
  function applyPlayerDamage(state: Player, source?: DamageSource): { player: Player; events: Event[] };
  ```
- **Data & Schema Fields**: `DIVE_LANDING_PROTECTION_TICKS = 15`; `Player.diveGraceTicks: number` 기본 0, 음수 불가; `Player.diveGraceActive: boolean` 기본 false. checkpoint는 플레이어 자체를 저장하지 않으므로 새 플레이어 생성·체크포인트 복구 시 모두 초기값이다. 기존 `invulnerableTicks`, `rollInvulnerable`, `damageInvulnerable`는 별도로 보존한다.
- **Execution Flow / Logic**:
  1. 매 `stepPlayer` 시작 시 기존 낙사 검사와 피격·구르기 무적을 유지한다. `diveGraceActive = diveGraceTicks > 0`을 먼저 스냅샷하고 양수면 1 감소한다. 이 스냅샷으로 남은 값이 1에서 0이 되는 마지막 보호 틱도 보장한다.
  2. `mode === 'dive'`인 하강 중 `applyPlayerDamage`가 낙사 이외 피해를 거부하도록 한다. 플레이어는 적을 물리 지형으로 취급하지 않으므로 그대로 통과한다. 일반 적·보스 접촉, 근접 공격, 투사체 모두 같은 `hurt` 경로에서 보호된다. 기존대로 맞은 투사체는 제거되고 적의 공격 hitIds 동작은 유지한다.
  3. 실제 `mode === 'dive'` 착지에서만 `dive-impact`를 정확히 한 번 생성하고 `diveGraceTicks = 15`, `diveGraceActive = true`로 설정한다. `stepStage`는 착지 틱에 충돌 피해를 충격파 피해보다 먼저 처리하므로 이 즉시 보호 플래그가 반드시 필요하다. 다음 15회 틱에도 보호하고 16번째에서 해제한다. 착지 후 공격·이동을 제한하지 않는다.
  4. `applyPlayerDamage`는 `source === 'pit'`이면 위 모든 무적보다 우선해 즉사하고 기존 death 이벤트를 반환한다. `mode === 'dead'`의 중복 죽음 방지, 기존 피격 무적과 구르기 무적을 유지한다. 보스 intro·transition의 기존 상호작용 잠금과 `event.canDamage`도 유지한다.
  5. `diveUsed`의 착지 초기화·36틱 쿨다운, 낙하 속도, `diveImpactRect` 크기/피해량, 저장 데이터 형식은 변경하지 않는다. 이전 무적이 남아 있으면 각 보호는 독립적으로 동작해 더 긴 보호를 실수로 단축하지 않는다.

### I02. 회귀 검증
- Related Files:
  - `test/player.test.js` :: 피해·착지 테스트; modify
  - `test/stage-lifecycle.test.js` :: 적·보스·투사체 통합 테스트; modify
#### Details
- `applyPlayerDamage`로 내려찍기 하강 중 contact/enemy-attack/projectile/boss-attack 각각 HP와 mode 유지, pit은 즉사 검증.
- 실제 `stepStage`에서 적 몸 위로 내려찍어 착지하고 같은 틱 `dive-impact` 한 번과 적 HP 1 감소, 플레이어 HP 유지를 검증한다. 유효한 적 공격/발사체 및 보스 공격에서도 보호를 검증한다. 투사체 소멸을 확인한다.
- 착지 직후 및 이후 15틱은 보호되고 16번째에는 보호가 해제되는지 확인한다. 구르기·기존 피격 무적과 낙사, 체크포인트 복원, 보스 intro 공격 잠금을 회귀 검증한다.
- 기존 `a dive interrupted by damage ...` 테스트는 새로운 확정 규칙과 모순되므로 삭제만 하지 말고 하강 피해 면제와 착지 쿨다운을 검증하는 테스트로 교체한다.

## Acceptance Criteria
- [x] 적 위에 내려찍으면 피해 없이 충격파가 발생하며 범위 내 적이 한 번 피해를 받는다.
- [x] 적 피해 보호가 하강·착지 틱 및 이후 15틱만 적용되고 낙사는 즉사한다.
- [x] 기존 착지 범위, 보스 연출 잠금, 기존 구르기·피격 무적 및 체크포인트가 유지된다.

## Validation
- `node --test test/player.test.js test/stage-lifecycle.test.js` — 위 경계와 통합 회귀 통과.
- `npm.cmd test` — 전체 테스트 통과.
- `npm.cmd run build` — Vite 빌드 성공.
- `git diff --check` — 공백 오류 없음. 브라우저에서 적 정면 착지, 보스 착지, 구덩이 낙사와 착지 후 피해 재개를 확인하고 자동/사람 조작 여부를 구분해 기록한다.

## Commit Message
```text
fix(combat): protect dive through landing

Plan: 2026-11-07-combat-feedback
Phase: P01-combat-feedback
Task: T01-dive-protection

- Protect the player during descent and briefly after landing
- Preserve pit deaths and landing shockwave damage
```

## Progress
- [x] 구현 완료
- [x] 검증 통과: 전체 테스트 56개, 빌드 및 Chrome 자동 입력 직접 착지 확인. 충격파 tick 378, 플레이어 HP 3·적 HP 2, 피해 재개 tick 394.
- commit: 이 Task의 Git 이력을 참조
