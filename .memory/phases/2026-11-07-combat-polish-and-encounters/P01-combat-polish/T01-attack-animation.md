# Task: T01 자유 조준 공격 모션

## Status: done

## Goal
일반 공격에서 몸이 준비·휘두름·복귀를 보이고 검이 현재 조준 방향을 중심으로 약 100° 움직이게 한다. 실제 공격 시간과 피해 범위는 그대로여서 시각적 명료성만 개선한다.

## Decision Summary
- `.memory/decisions/2026-11-07-combat-polish-and-encounters.md` D02~D03: 기존 8방향×3프레임 자산 우선 사용, 부족한 프레임만 새 도트로 보완. 단발 공격, 마우스 자유 조준, 칼날바람, 피해 범위·타이밍 유지.
- 60Hz에서 기존 공격은 19틱, 준비 1~4, 피해 활성 5~9, 회복 10~18이며 19에서 idle 등으로 종료한다. 최초 진입 직후 값 0도 준비로 취급한다. 판정은 현재 aim 중심 반경 36, 반각 50°다.
- 기존 첫 스테이지 T04는 사람 완주·청취 인수가 미완료다. `git status --short`로 기존 변경을 확인·보존하고 이 Task와 무관한 수정은 포함하지 않는다.

## Implementation

### I01. 기존 몸 프레임을 공격 진행도에 맞추기
- Related Files:
  - `src/game/assets/manifest.js` :: `ANIMATIONS`, `hero.attack.{direction}` — 8방향×3프레임 계약; modify
  - `src/game/assets/animation.js` :: `playerAnimation`, `animationFrame`, `playerAttackFrame` — 시뮬레이션 공격 단계 프레임; modify
  - `src/game/render/PlayerView.js` :: `sync` — 몸·외곽선·검 표시; modify
  - `public/assets/characters/hero/attacks.png` — 256×96, 32×32 셀 8열×3행 24프레임; read-only 우선, 필요할 때만 modify
  - `public/assets/source/hero-attacks-original.png`, `scripts/pack-art.mjs`, `docs/asset-provenance.md` — 신규 프레임 보완이 필요한 경우 출처·재생성 기록; read-only 우선, 필요한 경우 modify
  - `src/game/sim/player.js`, `src/game/sim/combat.js`, `src/game/sim/constants.js` — 조작·피해 원본; read-only

#### Details
- **Signatures & Types** (JavaScript 계약):
  ```typescript
  type Player = { mode:string; facing:number; attackTick:number; aim:{x:number,y:number}; x:number; y:number; w:number; h:number };
  function playerAttackFrame(player: Player): number; // 0..23
  function playerAnimation(player: Player): AnimationClip;
  function animationFrame(clip: AnimationClip, elapsedTicks:number): number;
  ```
- **Data & Schema Fields**: `ANIMATIONS['hero.attack.'+d].frames = [d,d+8,d+16]`, 정수 `d`는 0..7. 자산에는 이미 24셀/투명 알파/발 기준 정렬이 있다. 저장·충돌 상태에는 새 필드를 넣지 않는다.
- **Execution Flow / Logic**:
  1. `playerAttackFrame`은 현재 `facing`과 `attackTick`을 사용한다. tick 0..4는 `d`, 5..9는 `d+8`, 10..18은 `d+16`을 반환한다. 공격 중 `PlayerView.sync`는 `animationFrame(clip,tick-clipStart)` 대신 이 함수를 몸과 outline 양쪽에 적용한다. 다른 애니메이션은 기존 FPS/loop 경로를 유지한다.
  2. 공격 중 포인터가 바뀌면 매 틱 `facing`과 `aim`이 바뀐다. clip key 변경으로 공격 모션 단계가 다시 0이 되지 않아야 한다. 예: 활성 tick 6에서 방향 0→4이면 frame 8→12이며 공격 tick·피해 활성은 이어진다.
  3. 기존 셀을 8방향·세 단계 모두 실제 게임에서 관찰해 몸 방향, 발 기준점, 준비/휘두름/복귀가 읽히는지 확인한다. 기존 자산이 부족한 경우에만 `imagegen` 스킬의 이미지 생성 도구로 부족한 도트 프레임을 보완하고, 32×32 셀·8열×3행·투명 알파·셀 안쪽 여백·발 기준을 유지한다. 새 생성 원본·프롬프트·재포장 방법을 provenance에 기록하고 기존 Knight Run의 자산을 가져오지 않는다. 이미지 생성이 불가능하고 기존 이미지로 합의한 모션을 표현할 수 없으면 완료라 주장하지 않고 부족한 방향·단계를 기록한다.
  4. 예외/상태: attack→roll/dive/hurt/dead로 중단되면 즉시 해당 모드의 기존 클립을 사용한다. 씬 재시작·체크포인트 복원 시 오래된 공격 프레임이 남지 않는다. `canStartAttack`, 무적, 쿨다운, 타격 판정·소리 이벤트를 변경하지 않는다.

### I02. 검과 칼날바람 동기화
- Related Files:
  - `src/game/render/PlayerView.js` :: `sync`, 기존 `attackRangePolygon` 사용; modify
  - `src/game/render/attackMotion.js` :: `attackSwordOffset` — 순수 각도 계산; new
  - `test/animation-contract.test.js`, `test/attack-motion.test.js` — 프레임·각도·자유 조준; modify / new
#### Details
- **Signatures & Types**:
  ```typescript
  function attackSwordOffset(attackTick:number): number; // 라디안, 기존 조준각에 더함
  ```
- **Execution Flow / Logic**: tick 0..4에서 0°→-50°로 준비(0이면 0°, 나머지는 `-50*tick/4`); 5..9에서 -50°→+50°로 선형 휘두름(`-50+100*(tick-5)/4`); 10..18에서 +50°→0°로 복귀(`50*(18-tick)/9`); 그 밖에는 0°. 각도는 라디안으로 바꾸어 매 틱 현재 `atan2(aim.y,aim.x)`에 더한다. 연출의 칼날바람·활성 slash 방향도 같은 진행과 동기화하되 기존 `attackRangePolygon`의 고체 지형 가림은 유지한다. 검 회전은 시각 효과만 바꾸며 `attackIntersects`의 조준 중심 판정이나 5~9 활성 시간을 바꾸지 않는다.
- **Validation details**: 단계 경계 0/1/4/5/7/9/10/18/19, 8방향×3단계, 틱 6의 방향 변경, 검 각도와 현재 aim, 피해 판정 활성·미활성 경계 및 벽 가림을 검증한다. 실제 캔버스에서 좌·우·상·하 및 대각선 공격과 포인터 회전을 자동 입력으로 확인하고, 몸·검 이중 이미지 또는 프레임 튐을 살펴본다. 기존 구르기·내려찍기 재사용 표시에는 손대지 않는다.

## Acceptance Criteria
- [x] 8방향에서 준비·휘두르기·복귀 몸 프레임이 공격 틱과 맞게 진행되고 검이 약 100°를 휘두른다.
- [x] 공격 도중 마우스 방향이 바뀌어도 현재 프레임 단계와 피해 판정이 끊기지 않는다.
- [x] 단발 공격·19틱·피해 활성 5~9·반경 36·반각 50°와 지형 가림이 유지된다.
- [x] 기존 24프레임을 사용했으므로 새 자산을 만들지 않았다.

## Validation
- `node --test test/animation-contract.test.js test/attack-motion.test.js test/player.test.js test/combat.test.js test/assets.test.js` — 방향·단계·판정·실제 PNG 통과.
- `npm.cmd test` — 전체 테스트 통과.
- `npm.cmd run build` 및 `git diff --check` — 빌드·공백 검사 통과.
- `npm.cmd run dev` 후 Chrome에서 자동 입력과 8방향 실제 화면을 검사하고 오류·캡처·검증 한계를 기록한다. 시각적 자동 검사가 사람의 조작감 인수는 아니다.

## Commit Message
```text
feat(combat): animate free-aim sword swings

Plan: 2026-11-07-combat-polish-and-encounters
Phase: P01-combat-polish
Task: T01-attack-animation

- Animate the existing directional attack poses and sword arc
- Preserve attack timing, damage and free aiming
```

## Progress
- [x] 구현 완료
- [x] 전체 테스트 64개·빌드 통과, Chrome 자동 입력으로 8방향×3프레임을 확인했고 브라우저 오류가 없었다. 기존 프레임 및 게임 내 공격 화면을 시각 검토했다.
- commit: 이 Task의 Git 이력 참조
