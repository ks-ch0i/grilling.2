# Task: T03 광산 연속 보스

## Status: done

## Goal
광산 경기장에서 채굴 기계와 광물 감염 벌레를 순서대로 상대하고 각 공격, 전환, 물약 및 저장 복구가 일관되게 동작한다.

## Decision Summary
- 기계 HP 12, 벌레 HP 18·9 이하 2페이즈. 기계 처치만으로 스테이지가 끝나면 안 된다.
- 기계 등장에는 이동 가능, 벌레 등장 180틱에는 이동·피해 금지와 위험 정리. 벌레 2페이즈 전환에는 이동 가능하다.

## Implementation

### I01. 기계 보스
- Related Files:
  - `src/game/sim/mineBoss.js` :: `createMineBoss`, `stepMineBoss`, `damageMineBoss` — 두 보스 공통 API; new
  - `src/game/sim/stage.js` :: `damageTargets`, `stepStage` — 기존 숲과 광산 보스 분기; modify
  - `test/mine-boss.test.js` — 보스 공격·전환; new

#### Details
- **Signatures & Types**:
  ```ts
  type MineBossKind = 'machine'|'worm';
  type MineBoss = {id:string;kind:MineBossKind;x:number;y:number;w:number;h:number;
    hp:number;maxHp:number;phase:1|2;state:string;stateTicks:number;
    attackKind:string|null;lastAttack:string|null;lockedFacing:-1|1;
    telegraphs:Rect[];hitboxes:(Rect & {ticks:number})[]; [key:string]:unknown};
  function createMineBoss(kind:MineBossKind, spawn:{x:number;y:number}):MineBoss;
  function damageMineBoss(boss:MineBoss,amount?:number):{boss:MineBoss;events:GameEvent[]};
  function stepMineBoss(boss:MineBoss,player:Player,arena:Rect,rng:RandomState):
    {boss:MineBoss;events:GameEvent[];hazards:Hazard[];rng:RandomState};
  ```
- **Data & Schema Fields**: 기계 `id:'mine-machine',w:80,h:64,hp=maxHp=12,phase:1`, 초기 위치 x=11040,y=240. 상태 `dormant|intro|windup|attack|recovery|dying|dead`, `stateTicks`, 공격 목표·방향, `lastAttack`, `telegraphs`, `hitboxes`, 이동 속도와 난수 상태를 보관한다. 기계가 마지막 체력을 잃은 뒤에도 종료 이벤트와 장면 전환이 중복 발행되지 않아야 한다.
- **Execution Flow / Logic**:
  1. 경기장 진입으로 잠그고 기계 `intro`를 90틱 진행한다. 플레이어 이동·점프는 허용한다. 기존 숲의 등장 중 상호작용 보호 방식은 유지한다.
  2. 준비 시작 때 양 중심의 수평 거리 `<=120`이면 `swipe|charge`, 초과면 `wave|rocks` 중 난수 선택한다. 후보에 직전 공격이 있으면 제외해 연속 반복을 막는다. 공격 방향·목표 위치는 준비 시 고정한다. 기준 예고 60틱, 활성 18틱, 회복 50틱; T05에서 사람의 반응 시간을 확인한다.
  3. `swipe`: 전방 80×56 판정. `charge`: 전방으로 180px/s, 최대 72틱 또는 벽 도달까지 몸통 피해. `rocks`: 목표 x와 양옆 ±50px의 낙하 위치를 각각 표시하고 경기장 상단에서 떨어지는 폭 20·높이 20 충돌체를 생성한다. `wave`: 양 방향 지면 충격파, 속도 120px/s, 수명은 경기장 끝까지. 모든 보스 피해는 기존 `applyPlayerDamage`로 1하트다.
  4. 기계 충격파의 높이는 30px, y=`arena.bottom-30`; 낮은 짧은 점프의 발 높이는 이를 넘지 못해야 하고 긴 점프는 최대 상승 높이가 이를 넘는다. 두 조건을 실제 `stepPlayer`로 테스트해 충돌 사각형을 교정한다. 구르기/내려찍기 중 기존 무적 규칙은 유지한다.
  5. 각 공격의 준비·공격 시작 이벤트와 예고 사각형/파형 위치를 외부에 내보낸다. 타격 위치와 예고의 공간적 일관성 및 떨어지는 돌의 화면 진입 표시를 T04 렌더러가 사용할 수 있어야 한다.

### I02. 벌레, 2페이즈, 물약
- Related Files:
  - `src/game/sim/mineBoss.js` :: worm state machine — 벌레 공격·전환; modify
  - `src/game/sim/hazards.js` :: 산성액·웅덩이·낙석·충격파 — 피해 처리; modify
  - `src/game/sim/stage.js` :: 광산 보스 순서와 물약 — modify
  - `src/game/storage/saveStore.js` :: 새 스냅샷 유효성 — modify
  - `test/mine-boss.test.js`, `test/save-store.test.js` — new/modify

#### Details
- **Data & Schema Fields**: 벌레 `id:'mine-worm',kind:'worm',w:96,h:64,hp=maxHp=18,phase:1`, 경기장 중간에 `y=240`. 광산 실행 상태는 `boss`가 현재 활성 1개, `bossSequence:'machine'|'worm-intro'|'worm'|'done'`, `bossDrop:{rolled:boolean;spawned:boolean;consumed:boolean;x:number;y:number}`, 난수 상태를 포함한다. 투사체, 웅덩이, 낙석, 지면 파형, 목표 좌표, 연속 돌출 횟수·각 준비 타이머 및 시각 표시 데이터도 스냅샷한다. 최초 신규 광산 실행부터 이 필드를 기본값으로 생성한다.
- **Execution Flow / Logic**:
  1. 기계 HP 0은 `boss:machine-defeated`만 내고 `stage:clear`를 내지 않는다. 사망 효과 중에도 플레이어는 이동할 수 있다. 기존 숲 보스 `dying` 처리처럼 이 구간에 별도의 입력 정지를 추가하지 않는다. 사망 효과 후 난수를 정확히 한 번 뽑아 `<0.4`이면 현재 기계 위치 바닥에 `boss-heal`을 둔다. 플레이어 HP는 바꾸지 않는다. 드롭 결정과 아이템은 저장되며 중간 저장 복구·반복 틱으로 중복 추첨하지 않는다.
  2. 벌레 등장으로 넘어갈 때 기존 `projectiles`, 공격 판정 및 진행 중 `hazards`를 제거하고 180틱 `worm-intro`로 진입한다. 일반 수레 구역은 현존 수레를 제거한 뒤 카운트다운/경고를 등장 시간 동안 진행하지 않는다. 물약은 회복 아이템이므로 제거하지 않는다. 등장 중 플레이어 위치와 HP를 고정하고 입력·중력·피해를 적용하지 않으며 보스 등장 예고와 효과음을 1회 낸다. 180틱 후 벌레가 활성화되고 카트 타이머도 이어서 진행한다. 경기장은 계속 잠긴다.
  3. 물약은 일반 회복 아이템과 같이 닿을 때만 최대 3HP 내에서 1을 회복하고 소비한다. 사망 시 새로운 도전으로 드롭 여부를 재추첨하며 보스 진입 전에는 드롭이 없다.
  4. 벌레 1페이즈는 `spit`, `burrow`, `tail`을 순환한다. 기준 예고 60틱, 활성 18틱, 회복 50틱. 산성액은 T02의 포물선 발사체와 동일한 충돌·1하트 피해를 사용하되 웅덩이는 240틱이다. 꼬리는 바라보는 쪽 90×48 판정이다.
  5. 땅속 공격은 준비 시 플레이어 중심 x를 경기장 안에 고정하고 그 지점의 균열과 보스에서 목표로 이동하는 지하 흔적을 동시에 표시한다. 60틱 뒤 48×64 돌출 판정을 18틱 내고 보스 위치를 목표로 옮긴다. 2페이즈의 추가 돌출은 첫 번째 공격 이후 플레이어 위치를 다시 고정해 별도로 45틱 이상 표시하고 두 번째로 공격한다. 두 번째 위치를 첫 목표로 재사용하거나 준비 중 계속 추적하지 않는다.
  6. HP가 9 이하로 처음 내려가면 한 번 `transition`하고 30틱 시각·효과음 표시 후 phase=2. 그동안 플레이어는 이동 가능하다. 2페이즈는 준비·회복을 0.75배로 하고 돌출을 한 번 추가하며 `charge`를 공격 순환에 더한다. 돌진은 예고 후 플레이어를 가로질러 240px/s로 이동하고 경기장 벽에서 정지한다. 기존 공격의 hitbox나 웅덩이 수명이 전환 틱에 누락되지 않도록 전환 기준을 고정한다.
  7. 벌레 HP 0 후 사망 연출을 완료하면 `stage:clear`를 정확히 한 번 내고 잠금을 해제한다. 기계와 벌레 중 한 보스만 `run.boss`로 표시되며 T04에 이름·체력·등장 이벤트를 제공한다. 숲 `boss.js`의 사양과 테스트는 유지한다.
  8. 저장 복원은 기계 준비·이동, 기계 사망과 추첨 전/후, 180틱 등장 중, 웅덩이, 벌레 두 번째 돌출 준비 및 2페이즈를 검증한다. `Set`·난수 상태와 객체 배열을 잃지 않고 같은 다음 입력에 같은 결과가 나와야 한다. 잘못된 `kind`, 상태·페이즈·음수 타이머는 저장을 거부한다.

### I03. 테스트 사례
- Related Files: `test/mine-boss.test.js`, `test/stage-lifecycle.test.js`, `test/save-store.test.js` — new/modify
#### Details
- 중심 거리 120 이하/초과 경계, 같은 기계 패턴 연속 금지, 네 종류 발생, 짧은 점프 실패·긴 점프 성공, 타격당 1칸.
- 고정 난수 0.399는 드롭, 0.4는 미드롭, 저장 전후 추가 추첨 없음. 체력 자동 회복 없음.
- 기계 사망 뒤 스테이지 미클리어, 180틱 동안 좌표·체력 불변 및 공격/수레 정리, 종료 뒤 다시 피해·수레 정상 적용.
- 벌레 9HP에서 단 한 번 페이즈 전환, 전환 중 이동, 2회 돌출의 서로 다른 고정 목표와 각 경고, 240틱 산성 웅덩이, 벌레 처치 후 단일 clear.

## Acceptance Criteria
- [ ] 두 보스가 같은 경기장에 차례로 나타나며 벌레 처치 후에만 완료된다.
- [ ] 기계의 네 패턴·높은 점프 회피·40% 물약, 벌레의 세 공격·2페이즈와 두 번의 별도 돌출이 동작한다.
- [ ] 세 가지 등장/전환의 이동과 피해 규칙을 구분하고 저장·복원해도 보스 상태·위험·드롭이 일치한다.
- [ ] 숲 보스의 기존 동작 및 전체 저장 안전성 회귀가 없다.

## Validation
- `node --test test/mine-boss.test.js test/boss.test.js test/stage-lifecycle.test.js test/save-store.test.js` — 위 경계와 기존 숲 회귀 통과.
- `npm test` 및 `npm run build` — 전체 통과.

## Commit Message
```text
feat(mine): add sequential machine and worm bosses

Plan: 2026-11-08-mine-second-stage
Phase: P01-mine-stage
Task: T03-mine-bosses

- Add readable machine and two-phase worm patterns
- Preserve boss transition, hazards and probabilistic drop
```

## Progress
- [x] 구현 완료
- [x] 검증 통과: 대상 32개 테스트, 전체 94개 테스트와 빌드 통과. 기존 대형 번들 경고 유지.
- commit: 이 Task의 구현 커밋
