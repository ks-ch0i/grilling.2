# Task: T02 광산 지형·일반 적·수레

## Status: done

## Goal
화면 공개 전 광산의 지형, 골렘·원거리 벌레·박쥐, 수레와 산성 웅덩이를 60Hz 시뮬레이션에서 완결하고 저장·사망 복구를 검증한다.

## Decision Summary
- 적 약 9마리, 회복 아이템 3개, 시작 지점을 제외한 제한 없는 무작위 수레 구역 5곳. 골렘 충격파는 양쪽 120px, 수레는 경고와 10초 재등장.
- 사양에 없는 속도·크기·시간은 아래 시작값으로 구현하고 T05 실측으로 조정한다. 광산 사용자 진입은 T04까지 열지 않는다.

## Implementation

### I01. 광산 데이터와 공통 검증
- Related Files:
  - `src/game/content/mineStage.js` :: `MINE_STAGE` — 광산 정의; new
  - `src/game/content/forestStage.js` :: `validateStage` — 숲 전용 검사 분리; modify
  - `src/game/content/stages.js` :: `STAGES`, `getStage`, `validateStage` — stage registry; new
  - `src/game/sim/stage.js` :: `createStageRun`, `stepStage` — 광산 분기; modify
  - `test/mine-stage.test.js`, `test/forest-stage.test.js` — 지형 검증; new/modify

#### Details
- **Signatures & Types**:
  ```ts
  type StageId = 'forest-1'|'mine-1';
  type StageDefinition = { id: StageId; world:{width:number;height:number}; spawn:{x:number;y:number};
    solids:Rect[]; pitDeathY:number; pickups:{id:string;kind:'heal';x:number;y:number}[];
    enemies:EnemySpawn[]; arena:{left:number;right:number;top:number;bottom:number}; boss:BossSpawn };
  const STAGES: Readonly<Record<StageId,StageDefinition>>;
  function getStage(id:StageId): StageDefinition; // 알 수 없으면 TypeError
  function validateStage(stage:StageDefinition): true; // 유효하지 않으면 TypeError/RangeError
  ```
- **Data & Schema Fields**: `mine-1`은 11520×360, 지면 y=304·높이 56, 낙사 y=344, 시작 `{x:120,y:276}`, 경기장 `{left:10496,right:11472,top:0,bottom:304}`. 바닥 구멍은 `[1504,1568],[3136,3200],[4960,5024],[6848,6912],[8752,8816]`. 시작 기준 지형 발판은 x `1800,3488,5504,7360,9120`, y=256, w=128,h=16; 장애물 x `1216,2800,4384,6624,9504`, y=288,w=32,h=16. 회복 아이템 `heal-1/2/3`은 x `2400,6200,9600`, y=288. 경기장 내부 초기 보스 스폰은 `{id:'mine-machine',kind:'machine',x:11040,y:240}`; T03에서 실제 크기와 두 보스를 연결한다.
- 적 스폰은 골렘 `golem-1/2/3` x `800,3850,6400` y=264, 벌레 `insect-1/2/3` x `2200,5320,8070` y=280, 박쥐 `bat-1/2/3` x `2300,6500,9700` y=180. 서로 다른 종류의 2쌍(2200/2300, 6400/6500)을 포함한다. 실측상 길막이나 부당한 충돌이 있으면 같은 구성 조건을 유지해 재배치한다.
- **Execution Flow / Logic**:
  1. stage ID, 고유 ID, finite 숫자, 맵 안 사각형, arena 경계, 시작/지상 적의 지면 지지, 공중 박쥐의 정상 높이를 검사한다. 숲 보스 80×96, 기계 80×64 및 적별 치수에 맞는 검증을 한다. 체크포인트와 특정 숲 boss ID를 강제하지 않는다.
  2. `getStage`는 고정 registry의 객체만 돌려주며 임의 저장 데이터로 씬/경로를 지정하지 않는다. 기존 숲 정의 및 테스트는 공통 validator를 사용한다.

### I02. 일반 적과 산성 투사체
- Related Files:
  - `src/game/sim/enemies.js` :: `createEnemy`, `stepEnemy`, `damageEnemy`, `stepProjectile` — 적 AI; modify
  - `src/game/sim/hazards.js` :: `stepHazards` — 충격파·산성액 공통 처리; new
  - `src/game/sim/stage.js` :: `stepStage`, `damageTargets` — 피해와 이벤트 연결; modify
  - `test/mine-enemies.test.js`, `test/enemies.test.js` — AI·기존 숲 회귀; new/modify

#### Details
- **Signatures & Types**:
  ```ts
  type Hazard = {id:string;kind:'wave'|'acid-shot'|'acid-pool'|'cart';
    x:number;y:number;w:number;h:number;vx:number;vy:number;life:number;alive:boolean;
    ownerId:string; [field:string]:unknown};
  function stepHazards(hazards:Hazard[], player:Player, terrain:Rect[]):
    {hazards:Hazard[];events:GameEvent[]};
  ```
- **Data & Schema Fields**: 골렘 `{w:32,h:40,hp:5,range:220,trigger:64,windup:45,active:1,recovery:55,speed:30}`, 벌레 `{w:24,h:24,hp:3,range:260,trigger:260,windup:42,active:1,recovery:75,speed:0}`, 박쥐 `{w:24,h:20,hp:2,range:260,trigger:220,windup:40,active:55,recovery:55,speed:180}`. 투사체·충격파·웅덩이 ID는 발사 횟수를 포함해 고유하게 만들고 발사 카운터도 저장한다. 상태, 잠긴 목표, 위치·속도·수명, 판정 및 무적 관련 값 모두 스냅샷에 포함한다.
- **Execution Flow / Logic**:
  1. 골렘은 가까워지면 준비 후 지면 위 양쪽으로 `wave` 두 개 생성: 시작 폭 8·높이 8, 속도 ±120px/s, 최대 이동 120px. 매 소단계 지면 지지와 앞쪽 벽을 검사해 낭떠러지 또는 벽에서 제거한다. 점프로 높이 8px 판정을 피할 수 있다. 생존한 충격파는 접촉할 때마다 기존 `applyPlayerDamage`의 무적을 따른다.
  2. 벌레는 플레이어 목표를 공격 준비 시 고정하고 지면에 떨어지는 산성액을 발사한다. 시작 속도는 목표 방향 수평 ±110px/s, 수직 -180px/s, 중력 500px/s²; 프레임 간 충돌은 소단계로 검사한다. 지면 충돌 시 28×6px 웅덩이를 120틱 생성하고 화면 밖·수명 종료 시 삭제한다. 플레이어에게 직접 부딪히면 하트 1 피해 후 제거한다. 웅덩이의 플레이어 접촉은 매 틱 기존 45틱 피격 무적을 거쳐 재피해 가능하다.
  3. 박쥐는 `windup` 진입 시 플레이어 중심 좌표를 복사해 고정한다. 준비 종료 후 그 점을 향해 180px/s로 55틱 이하 급강하하고, 지정 좌표 도착이나 충돌 시 스폰 높이로 복귀한 다음 recovery에 들어간다. 플레이어 이동에 따라 목표가 바뀌지 않는다. 접촉 피해는 하트 1, 일반 공격/내려찍기는 기존 판정 사용.
  4. 숲의 위습 투사체를 포함해 새 Hazard와 기존 투사체가 중복 피해를 주지 않도록 각 객체를 정확히 한 번 처리한다. 장애물 충돌·삭제·사망·피격 무적·구르기/내려찍기 무적을 기존 `applyPlayerDamage` 경유로 적용한다. 사용자에게 보여줄 예고 이벤트/데이터를 내보내고 렌더링은 T04에서 한다.

### I03. 무작위 수레와 복구
- Related Files:
  - `src/game/sim/mineCarts.js` :: `createCartZones`, `stepCartZones` — 수레 구역 상태; new
  - `src/game/sim/stage.js`, `src/game/storage/saveStore.js` — 스냅샷·검증 확장; modify
  - `test/mine-carts.test.js`, `test/save-store.test.js` — 타이머·복구; new/modify

#### Details
- **Signatures & Types**:
  ```ts
  type CartZone = {id:string;centerX:number;direction:-1|1;state:'countdown'|'warning'|'active';ticks:number;cartId:string|null};
  function createCartZones(stage:StageDefinition, random:()=>number):CartZone[];
  function stepCartZones(zones:CartZone[], hazards:Hazard[], stage:StageDefinition):
    {zones:CartZone[];hazards:Hazard[];events:GameEvent[]};
  ```
- **Data & Schema Fields**: 5개 `cart-1`~`cart-5`, 구역 중심은 정수 `x ∈ [512, stage.world.width-1]`에서 중복 없이 무작위로 정한다. 시작부(0~511)만 제외하며 다른 구역이나 낭떠러지·경기장을 거르지 않는다. 구역은 중심 ±96px을 월드 안으로 자른 경로이며 좌우 진입 방향도 무작위다. 초기 대기 180틱, 재등장 대기 600틱, 경고 60틱, 수레 크기 32×20, 속도 150px/s; 지면 높이 304에 맞춘 레일을 따라 이동하며 낭떠러지에서도 경로를 유지한다. 정상 종료 시 시각화할 경고 방향, 남은 틱·수레 위치·속도·ID와 진행 중인 난수 상태를 스냅샷에 저장한다.
- **Execution Flow / Logic**:
  1. 무작위 생성기는 주입 가능하게 해 결정적 테스트를 지원한다. 생산 시 새 시도의 독립 시드를 사용하고 상태를 snapshot한다. 동일한 시작 조건의 `random`이 중복 값을 반복해도 무한 루프가 생기지 않도록 빈 좌표 탐색에 한계를 두고 다음 빈 좌표로 폴백한다.
  2. `countdown` 종료 → 60틱의 `warning` 및 1회 `cart:warning` 이벤트 → 진입 방향에서 `active` 수레 생성 → 경로 이탈 또는 일반 공격에 1회 맞으면 제거 → 해당 구역 `countdown=600`. 일반 공격은 기존 `registerAttackHit`의 벽 차단과 공격별 중복 방지를 따른다. 플레이어 접촉은 하트 1·기존 무적 규칙이며 카트는 계속 움직인다.
  3. 실행 사망 시 모든 카트를 초기화하고 5개 구역을 재배정한다. 이어하기는 저장 구역/타이머/현재 카트/난수 상태를 그대로 복원한다. 같은 좌표가 우연히 다시 나올 수 있으므로 사망 테스트는 난수 주입으로 재배정 호출과 새로운 결과를 검증한다.
  4. 보스 등장 3초 동안 위험 정리 규칙은 T03에서 적용한다. 이후 경기장에 배정된 수레 구역도 정상적으로 재개하며 경기장 자체를 구역 선정에서 제외하지 않는다.

## Acceptance Criteria
- [ ] 9개 광산 적과 회복 3개, 혼합 무리 2개, 5개 무작위 수레 구역이 생성된다.
- [ ] 각 적의 체력과 준비·공격·복귀, 120px 충격파 지형 종료, 2초 산성 웅덩이, 1회 수레 파괴·경고·600틱 재등장이 검증된다.
- [ ] 시뮬레이션의 모든 추가 객체와 난수 상태가 JSON 저장 후 동일하게 이어지며 사망 시 재생성된다.
- [ ] 광산은 T04 전까지 실제 메뉴에 노출되지 않고 숲 회귀가 없다.

## Validation
- `node --test test/mine-stage.test.js test/mine-enemies.test.js test/mine-carts.test.js test/enemies.test.js test/save-store.test.js` — 신규 및 복구 동작 통과.
- `npm test` 및 `npm run build` — 전체 통과.

## Commit Message
```text
feat(mine): simulate enemies and mine cart hazards

Plan: 2026-11-08-mine-second-stage
Phase: P01-mine-stage
Task: T02-mine-encounters

- Add the mine layout and three enemy behaviors
- Persist acid, shockwaves and randomized mine carts
```

## Progress
- [x] 구현 완료
- [x] 검증 통과: 대상 21개 테스트, 전체 87개 테스트와 빌드 통과. 기존 대형 번들 경고 유지.
- commit: 이 Task의 구현 커밋
