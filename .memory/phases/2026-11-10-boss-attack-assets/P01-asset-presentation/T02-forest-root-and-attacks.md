# Task: T02 숲 보스 공격과 접지 기준 뿌리 연결

## Status: pending

## Goal
가지팔·한 팔 내려찍기·여러 갈래 뿌리를 독립 스프라이트로 표시하고, 팔 접지 뒤의 뿌리 시간과 회복 상태의 두 번째 뿌리까지 저장·복구 가능한 상태로 재현한다.

## Decision Summary
- 가지·내려찍기의 기존 피해 영역·시간·피해량은 유지한다. 뿌리는 큰 팔 찌르기만 예고로 사용하고 발생 위치의 사전 바닥 표시를 없앤다.
- 접지 후 1페이즈 60틱에 한 번, 2페이즈 30틱·60틱에 두 번 발생한다. 두 번 모두 팔을 꽂은 자세를 유지하고 몸·팔이 움찔한다. 초당 60틱이다.

## Implementation

### I01. 뿌리 시간과 표시 수명
- Related Files:
  - `src/game/sim/boss.js` :: `attacks`, `createBoss`, `beginWindup`, `damageBoss`, `stepBoss`, `targetRect` — 접지·분출·회수 상태; modify
  - `src/game/sim/stage.js` :: `restoreStageRun`, `death` — 엄격한 스키마·이전 저장·사망 정리; modify
  - `src/game/sim/combat.js`, `src/game/storage/saveStore.js` — 피격·상위 저장 규칙; read-only
  - `test/boss.test.js`, `test/stage-lifecycle.test.js`, `test/save-store.test.js` — 시간·복구·취소 검증; modify

#### Details
- **Signatures & Types**:
  ```typescript
  export const ROOT_PLUNGE_TICKS: 24;
  export const ROOT_DELAY_TICKS: Readonly<{1:60;2:30}>;
  export const ROOT_EFFECT_TICKS: 24;
  type RootEffect = {x:number;y:number;w:48;h:48;age:number;strike:1|2};
  // 기존 ForestBoss 필드는 모두 유지하고 다음 필드만 추가한다.
  type RootPresentationFields = {rootEffects:RootEffect[]};
  createBoss(spawn:object):ForestBoss;
  stepBoss(state:ForestBoss,player:PlayerRect,arena:Arena):{boss:ForestBoss;events:GameEvent[]};
  damageBoss(state:ForestBoss,amount?:number):{boss:ForestBoss;events:GameEvent[]};
  ```
- **Data & Schema Fields**:
  - 기존 보스: `id,x,y,w=80,h=96,hp=18,maxHp=18,phase=1,state='dormant',stateTicks=0,cycle=0,attackKind=null,lockedFacing=-1,telegraphs=[],hitboxes=[],secondRootDelay=0,secondRoot=null,transitioned=false`를 유지한다.
  - 새 `rootEffects=[]`는 nullable이 아닌 배열이다. 각 원소는 정확한 필드 `x,y,w,h,age,strike`, 유한한 좌표, w/h=48, age 정수 0~23, strike=1 또는 2다. 최대 두 개이며 같은 strike의 중복을 허용하지 않는다.
  - 기존 `hitboxes`는 `{x,y,w,h,ticks}`만 가진다. 표시용 필드를 피해 히트박스에 넣지 않는다. `secondRoot`는 기존 Rect 또는 null이다.
  - 추가 이벤트: `boss:root-ground`는 접지 순간 한 번; `boss:root-erupt`는 `{type,strike,x,y,w,h}`. 기존 첫 `boss:attack` 이벤트도 유지한다. 새 피격·포효 사운드를 추가하지 않는다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: `stepBoss`는 입력을 복사하고 원본을 변경하지 않는다. 기존 배열과 함께 rootEffects도 원소별 복사한다.
  2. 기술 배분으로 큰 팔 동작은 24틱(0.4초)으로 정한다. root windup은 1페이즈 `24+60=84`, 2페이즈 `24+30=54`틱이다. 이 수치는 접지 전 자세와 사용자가 고정한 접지 후 지연을 구분하기 위한 기준이다. 뿌리에는 기존 일괄 `*.75` 단축을 적용하지 않는다.
  3. windup 진입 시 기존 `targetRect('root',...)`로 첫 위치를 고정한다. 플레이어 중앙 x를 arena.left+16~arena.right-48에 clamp한 48×48 Rect, y=arena.bottom-48이다. 첫 위치를 접지나 발생 순간 다시 조준하지 않는다.
  4. windup countdown이 해당 phase의 delay 값에 도달한 step에 `boss:root-ground`를 한 번 발생시킨다. 이때 피해는 없다. 24틱 전후로 팔 들어올림/찌르기에서 꽂힌 유지 자세로 전환한다.
  5. countdown=0에서 기존처럼 `state='attack',stateTicks=12`, 첫 Rect의 ticks=12 히트박스와 age=0,strike=1 RootEffect를 함께 생성한다. 첫 `boss:attack`과 `boss:root-erupt`를 발생시킨다.
  6. 2페이즈는 바로 이 첫 발생 때의 플레이어 위치로 두 번째 Rect를 고정하고 기존 `secondRootDelay=30`을 사용한다. 30틱 뒤 ticks=12 히트박스와 age=0,strike=2 효과를 생성한다. secondRoot를 null로 지우고 두 번째 분출 이벤트를 한 번 발생시킨다. 두 번째 위치를 30틱 동안 계속 추적하지 않는다.
  7. 기존 hitbox countdown을 유지한다. rootEffects는 매 simulation step에 age를 1 증가시키고 age>=24를 제거하되 새로 생성한 효과는 그 step에 age=0이다. age 0~11은 실제 활성 형상, 12~23은 피해 없는 약한 회수 표현이다. 두 번째가 본체 recovery 상태여도 효과를 유지한다.
  8. 가지와 내려찍기는 windup 60틱(2페이즈 45), 활성 12틱, 회복 각각 50/60틱(2페이즈 round(*.75))을 유지한다. 뿌리 활성은 12틱, 회복은 기존 50틱(2페이즈 38)이다. 회복 시간을 임의로 늘리지 않는다.
  9. phase 전환·보스 사망·reset·플레이어 사망에는 rootEffects와 pending secondRoot/secondRootDelay를 정리한다. 플레이어 사망 동안 보스 step이 멈춰도 오래된 뿌리가 화면에 얼어 있지 않게 한다.
  10. State Transition & Return: 기존 상태 enum과 반환 형식은 유지한다. 새 표시 필드로 피격 처리를 추가하지 않고 stage는 기존 hitbox만 검사한다.
- **Error & Exception Handling / 저장 호환**:
  - `restoreStageRun`은 `keys(b,Object.keys(bt))`로 정확한 키를 검사한다. 이 검사 전에 **forest-1에서만** `rootEffects`가 없는 이전 snapshot에 빈 배열을 보충한다. 제공된 값이 잘못된 경우 빈 배열로 덮어 정상화하지 말고 TypeError를 던진다.
  - 예전 활성 root 저장에 표시 필드가 없고 root hitbox가 남아 있으면 각 box에서 `age=12-ticks`로 활성 효과를 복원한다. strike는 secondRootDelay>0이면 1, 그렇지 않은 2페이즈 recovery이면 2, 나머지는 1로 한다. 피해 Rect와 남은 ticks를 수정하지 않는다.
  - 기존 root windup 저장은 남은 stateTicks를 유지한다. 새 규칙을 적용하려고 플레이어 위치·시간·체력을 초기화하지 않는다. 접지 지점을 이미 지난 저장에서는 접지 이벤트를 재생하지 않는다.
  - rect helper는 정확한 키를 검사하므로 RootEffect 전체를 `rect(effect,true)`에 넣으면 안 된다. 전용 필드 검사 후 `{x,y,w,h}`로 투영해 검증한다. mine 보스의 필드·저장 버전·일반 적 스키마는 변경하지 않는다.

### I02. 본체 자세와 외부 공격 렌더링
- Related Files:
  - `src/game/assets/manifest.js` :: 숲 clip — 새로운 유지·움찔 자세와 속도; modify
  - `src/game/assets/animation.js` :: `bossAnimation` — 접지·연속 분출의 자세 선택; modify
  - `src/game/render/forestAttackPresentation.js` — 순수 표시 모델; new
  - `src/game/render/EnemyView.js` :: `sync`, `destroy` — 숲 전용 layer·방향·자세; modify
  - `src/game/render/bossEffects.js` :: `drawForestBossEffect` — 이전 숲 선 그리기 제거; modify
  - `src/game/assets/bossFx.js`, `src/game/render/AttackSpriteLayer.js` — T01 계약; read-only
  - `test/forest-attack-presentation.test.js` — 독립 뿌리 수명·방향·좌표; new
  - `test/animation-contract.test.js` — 이전 그래픽 호출 검사 대신 실제 표시 모델 검사; modify

#### Details
- **Signatures & Types**:
  ```typescript
  // T01의 FxItem: id,texture,frame,x,y,width,height,flipX,rotation,alpha,depth.
  // T01 fxItem(key,id,rect,ageTicks,durationTicks?,options?) -> FxItem.
  export function collectForestAttackItems(boss:ForestBoss,elapsedTicks:number):FxItem[];
  // 기존 bossAnimation 시그니처 유지; rootEffects를 읽는 순수 함수.
  bossAnimation(boss:ForestBoss):AnimationClip;
  ```
- **Data & Schema Fields**:
  - T01 texture `boss-forest-fx`: branch 0~3, rootActive 4~7, rootRetract 8~11, slam 12~15. 각 canvas=128×128, core={16,16,96,96}. core를 실제 Rect로 맞추면 중심은 Rect 중심, 표시 폭/높이는 각각 128/96배다.
  - 고정 ID는 `forest-branch-0`, `forest-slam-0`, `forest-root-1/2`다. 같은 효과가 유지될 때 ID가 바뀌지 않아야 한다. 다른 공격으로 넘어가면 layer.sync([]) 또는 누락 ID 제거로 정리한다.
  - rootWindup=본체 9,10을 5fps로 재생(총 24틱). rootHold=11 한 프레임, rootPulse=12 한 프레임. 기존 rootAttack 별칭은 남길 수 있으나 실제 선택은 아래의 접지·효과 상태를 사용한다.
- **Execution Flow / Logic**:
  1. 가지·내려찍기 활성 hitbox는 기존 Rect로 전달하고 `age=12-box.ticks`, duration=12로 해당 clip을 고른다. 가지는 90×66, y=b.y+30, 전방 b.x-90 또는 b.x+b.w이다. 내려찍기는 64×84, y=b.y+12, 전방 b.x-64 또는 b.x+b.w이다.
  2. 모든 rootEffects는 **본체 state와 무관하게** 순회한다. age<12이면 rootActive(duration12), 이후 rootRetract(age-12,duration12)다. 회수 alpha는 최대 .45에서 0으로 줄여 활성 위험과 구분한다. 사전 telegraphs는 내부 조준 Rect로만 쓰고 바닥 선·균열·문양은 그리지 않는다.
  3. 본체 root 선택 우선순위: rootEffects에 age<4가 있으면 rootPulse → 접지 후 windup/활성 뿌리 age<12/pending secondRootDelay>0이면 rootHold → 접지 전 windup이면 rootWindup → 이후 기존 idle/recovery 표현이다. 첫·두 번째 분출마다 pulse가 다시 보여야 한다.
  4. 숲 공격 원화의 기본 방향은 왼쪽이다. 공격·root 유지/움찔 자세일 때 body와 outline 및 외부 팔을 `lockedFacing>0`이면 flipX한다. 보존된 idle·intro·전환·사망은 기존 방향을 따른다. 외부 팔의 core 오른쪽 접점은 왼쪽 공격 시 b.x, 뒤집힌 접점은 오른쪽 공격 시 b.x+b.w다.
  5. EnemyView에 `forestLayer=new AttackSpriteLayer(scene)`를 둔다. forest에서만 collector 결과를 sync하고 mine 보스이면 빈 배열로 정리한다. destroy에서 반드시 해제한다. 일반 적 graphics와 projectile·피격 표시를 변경하지 않는다.
  6. 기존 `drawForestBossEffect`의 root windup 선과 가지·뿌리·내려찍기 도형은 제거한다. import와 해당 테스트를 새 collector로 옮긴다. `bossEffects.js`의 기계·벌레 함수 및 StageScene의 숲 페이즈 전환 장식은 이 Task에서 유지한다.
  7. Error & Exception Handling: alpha·좌표는 유한해야 하고 표시 함수는 run을 mutate하지 않는다. rootEffects 필드가 없는 직접 단위 fixture에는 `[]`를 기본으로 읽되 저장 검증은 I01을 따른다.
  8. State Transition & Return: 같은 snapshot의 collector 결과는 동일하다. 일시정지·복구 후 프레임이 실시간 타이머로 앞서가지 않는다.

### I03. 회귀 검사
- Related Files:
  - `test/boss.test.js`, `test/forest-attack-presentation.test.js`, `test/animation-contract.test.js`, `test/stage-lifecycle.test.js`, `test/save-store.test.js` — modify|new as above
- **Execution Flow / Logic**:
  1. root windup을 시작한 T=0에서 T=23까지 접지 없음, T=24 접지 이벤트 1회. 1페이즈 T=83까지 hit 없음, T=84 첫 hit. 2페이즈 T=53까지 없음, T=54 첫 hit, T=84 두 번째 hit.
  2. contact 이후 60/30틱 경계를 직접 검증한다. 2페이즈 첫 위치는 windup 시작, 두 번째 위치는 첫 발생 때 고정됨을 서로 다른 player.x 입력으로 확인한다.
  3. 두 번째가 recovery일 때 FxItem이 존재한다. active12틱 이후 damage box는 없어도 최대12틱 회수 FX만 남고, 새 피해 이벤트가 생기지 않는다.
  4. windup·접지 후 지연·첫 분출·두 번째 대기·회수에서 snapshot→JSON→restore→다음 step이 원본과 같다. 이전 rootEffects 없는 snapshot도 복구하며 malformed 추가 필드는 거절한다.
  5. root 준비 표시 없음, 좌우 팔 접점, 가지·slam의 기존 Rect, phase 전환/사망 취소·일시정지 동일 프레임을 검사한다. 단순 프레임 번호 복제보다 보이지 않는 피해·표시와 판정 수명 차이를 검증한다.

## Acceptance Criteria
- [ ] 큰 팔 찌르기와 접지 후 60/30틱 기준이 정확하며 2페이즈 두 번째는 다시 30틱 뒤다.
- [ ] 사전 바닥 예고가 없고 실제 뿌리·팔·파편 스프라이트가 기존 피해 위치에 표시된다.
- [ ] 회복 상태에서도 두 번째 뿌리가 표시되고 이후 피해 없는 회수까지 정리된다.
- [ ] 이전/현재 저장과 사망·페이즈 전환이 유효하며 플레이어 피격·일반 전투 규칙을 바꾸지 않는다.
- [ ] 새 PNG를 파일로 관찰하고 아래 집중 검사·빌드 통과를 기록한다. 직접 게임 플레이는 하지 않는다.

## Validation
- `node --test test/boss.test.js test/forest-attack-presentation.test.js test/animation-contract.test.js test/stage-lifecycle.test.js test/save-store.test.js` — 뿌리 경계·표시·저장·기존 전투 통과.
- `npm.cmd run build` — 새 숲 렌더러 연결 빌드 통과.

## Commit Message
```text
feat(boss): synchronize forest attacks with grounded root timing

Plan: 2026-11-10-boss-attack-assets
Phase: P01-asset-presentation
Task: T02-forest-root-and-attacks

- Connect branch and slam sprites to existing hit regions
- Preserve delayed root visibility and compatible save snapshots
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
