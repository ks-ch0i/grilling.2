# Task: T02 숲 스테이지와 적·보스

## Status: done

## Goal
독립 PC 웹 게임에서 2~5분 목표의 저주받은 숲 스테이지를 처음부터 보스 클리어까지 실제 플레이한다. 일반 적 3종과 2단계 고목 보스, 발판·구덩이·체크포인트·회복을 구현한다.

## Decision Summary
- 선행 T01은 Phaser/Vite 앱, 640×360 내부 화면, 60Hz 플레이어 모델(`stepPlayer`), A/D·Space·좌클릭·Shift·E, 3하트, 피격 무적·전 구르기 무적·수직 내려베기를 제공한다. 여기서는 이 입력을 바꾸지 않는다.
- 일반 모드만 제작. 플레이 중 스테이지 중간 체크포인트 1개에서 부활할 때 모든 적은 재생성하고 소비한 회복 아이템은 재생성하지 않는다. 하드 모드·온라인·영구 스탯 성장은 범위 밖이다. 시각 자산은 T04에서 최종 교체하며 이 작업은 기능 검증용 도형을 사용한다.
- 세부 배치·수치는 플레이 조정용 초기값이며 사용자 결정으로 오인하지 않는다. 목표 2~5분은 실제 플레이를 측정해 조정하고 숫자만 검증해 완료로 치지 않는다.

## Implementation

### I01. 데이터 기반 2D 숲과 충돌
- Related Files:
  - `src/game/content/forestStage.js` :: `FOREST_STAGE`, `validateStage`; new
  - `src/game/sim/geometry.js`, `src/game/sim/player.js` :: swept 지형 충돌 및 피트 사망; modify
  - `src/game/scenes/StageScene.js` :: 스테이지 시작·렌더·카메라; modify
  - `test/forest-stage.test.js`; new

#### Details
- **계약**:
  ```ts
  type Rect={x:number,y:number,w:number,h:number};
  type EnemySpawn={id:string,kind:'soldier'|'wisp'|'boar',x:number,y:number};
  type Pickup={id:string,kind:'heal',x:number,y:number};
  type Stage={id:'forest-1',world:{width:number,height:number},spawn:{x:number,y:number},solids:Rect[],pitDeathY:number,checkpoint:{id:'mid',x:number,y:number},pickups:Pickup[],enemies:EnemySpawn[],arena:{left:number,right:number,top:number,bottom:number},boss:{id:'forest-guardian',x:number,y:number}};
  export function validateStage(stage:Stage):true; // invalid throws TypeError/RangeError
  ```
- **초기 좌표**: world 11520×360, 평지 윗면 y=304, 플레이어 AABB 16×28 시작 (120,276); 카메라 viewport 640×360, x 범위 0..10880. 고체 지면은 높이 56이며 구덩이 x 구간 [1504,1568), [3136,3200), [4960,5024), [6848,6912), [8752,8816)를 제외한 연속 구간으로 만든다. 바닥은 구덩이 위에 생성하지 않는다. 64px 폭은 T01 초기 속도/중력/최대 점프로 넘을 수 있어야 한다. `pitDeathY=344`에서 즉사하며 무적을 무시한다.
- 낮은 발판은 예를 들어 (1800,256,128,16), (3488,256,128,16), (5504,256,128,16), (7360,256,128,16), (9120,256,128,16). x/y/w/h는 모두 타일 그리드 16px 단위. 최소 점프(일찍 놓음)로 건너뛸 수 있는 선택지와 긴 점프로 건너는 구간을 섞는다. 필수 길에 피할 수 없는 접촉/공격 조합이 없게 한다.
- checkpoint `mid` 좌표 (5760,276), 접촉으로 활성화 후 응답 표시. 회복 3개 `heal-1` (2400,288), `heal-2` (6200,288), `heal-3` (9600,288); 16×16, 닿으면 HP `min(3,hp+1)`이며 만피여도 소비하고 `consumedPickupIds`에 추가. ID 중복/불일치·맵 밖/음수 직사각형은 validator가 거부한다.
- 숲의 끝 arena 왼쪽 10496, 오른쪽 11472, y=0..304; 16px 고체 문. 보스는 (11040,208)에서 시작. 플레이어가 arena 안으로 진입할 때 문을 닫고 카메라/월드 충돌이 탈출을 막는다. 승리 또는 플레이어 사망 시 잠금 해제; 죽은 후 스테이지 복원 시 보스전 상태/문을 초기화한다.
- StageScene 카메라는 정수 픽셀로 부드럽게 따라가며 마지막 수평 이동 방향으로 60px 앞을 본다(벽·경계 클램프). 포인터 좌표는 매 프레임 `camera.getWorldPoint`로 계산한다. 가림막/발판과 히트 판정 좌표는 같은 월드 좌표다.

### I02. 적 3종과 투사체
- Related Files:
  - `src/game/sim/enemies.js` :: `createEnemy`, `stepEnemy`, `stepProjectile`; new
  - `src/game/sim/combat.js` :: 피격/검 및 내려베기 대상 판정; modify
  - `src/game/render/EnemyView.js`; new
  - `test/enemies.test.js`, `test/forest-stage.test.js`; new

#### Details
- 적 모델 `{id,kind,x,y,w,h,hp,maxHp,state:'idle'|'chase'|'windup'|'attack'|'recovery'|'hurt'|'dead',stateTicks,facing,hitIds}`. 초기 HP soldier=3, wisp=2, boar=3. 기본 스폰 soldier x=800/2600/7600, wisp x=2200/5200/8300, boar x=3900/6900/9900; y는 종류별 바닥에 닿는 값으로 검증. 죽은 개체는 충돌/공격 중지하고 쓰러짐이 끝난 뒤 숨긴다. 새 개체 생성 전 이전 hitbox/projectile을 모두 정리한다.
- 검 병사는 180px 이내에서 접근(speed 45px/s), 36px 이내에 30 tick 준비→8 tick 베기→40 tick 회복. 망령은 움직임이 적고 260px 이내에서 36 tick 준비→포인터와 무관하게 플레이어 방향으로 160px/s 투사체 1개→60 tick 회복, 투사체 최대 수명 180 tick이며 벽/플레이어에 닿으면 제거. 멧돼지는 220px 이내에 42 tick 몸 낮추기→240px/s로 30 tick 돌진→50 tick 회복; 낭떠러지와 벽에서 멈춘다. 보이는 방향과 이동 방향, 위험 판정을 일치시킨다.
- 어떤 종류든 **몸 접촉만으로 1하트** 피해이며 별도 공격/투사체도 1하트; T01의 롤·피격 무적을 공유해 한 번 맞은 순간 중복 차감하지 않는다. 각 공격은 시작에서 준비 방향을 잠그고 예고 동안 플레이어를 추적하지 않는다. 공격 hitbox 활성 구간을 시각적으로 표시한다. 피격·사망 시 공격과 투사체 발사 예약 취소, 기존 투사체는 죽은 개체와 별도로 수명까지 유지하되 리셋 시 모두 제거한다.
- 함수: `createEnemy(spawn:EnemySpawn):EnemyState`, `stepEnemy(enemy:EnemyState,player:PlayerState,terrain:Rect[]):{enemy:EnemyState,events:GameEvent[],projectiles:Projectile[]}`; `stepProjectile(projectile,terrain,player):{projectile,events}`. 모든 상태·타이머는 고정 60Hz tick 기준이고 렌더가 규칙을 바꾸지 않는다. 콤보 각 타/내려베기마다 대상 id별 1회 피해다.

### I03. 2단계 보스와 전투 종결
- Related Files:
  - `src/game/sim/boss.js` :: `createBoss`, `stepBoss`, `resetBoss`; new
  - `src/game/scenes/StageScene.js` :: 경기장 잠금·UI·스테이지 종료; modify
  - `src/game/render/EnemyView.js`, `test/boss.test.js`; modify/new

#### Details
- 보스 AABB 80×96, 최대 HP 초기 18, id `forest-guardian`, 첫 단계 `hp>9`, 두 번째 `hp<=9`. arena 진입 시 90 tick 등장 연출 동안 입력과 위험 판정을 막고, 이후 1단계 공격 cycle: 가지 휘두르기(60 tick 예고, 12 tick 활성, 50 tick 회복), 표적 위치에 뿌리(75/12/50), 수직 내려찍기(60/12/60). 각각 화면에서 공격 범위와 방향을 명확히 예고하고 실행 시 이미 예고한 좌표로 판정한다.
- 처음으로 HP<=9일 때 기존 공격 판정을 제거하고 90 tick 단계 전환 연출을 한 번 재생한 뒤 2단계 시작. 2단계는 3가지 공격 cycle을 유지하되 예고/회복을 75%로 줄이고, 두 번째 뿌리 공격을 30 tick 간격으로 추가한다. 모든 접촉/공격은 1하트이며 같은 시점 여러 hitbox는 플레이어 무적으로 중복되지 않는다. 부활 시 보스 HP·단계·공격 타이머·문·투사체를 최초 상태로 복원한다.
- 보스 HP가 0이면 같은 tick에 한 번만 죽음 처리, 모든 hitbox 제거, 문 해제, 적 승리 연출 후 `stage:clear` 이벤트를 내고 입력을 중단한다. 플레이어와 보스가 같은 tick에 죽으면 플레이어 사망 우선이며 클리어 기록을 남기지 않는다. 상단 HUD는 하트 3칸, 스테이지명, 보스 등장 후 이름·HP바만 기본 표시하며 남은 적 수는 표시하지 않는다.

### I04. 재시작·세이브를 위한 이벤트 계약
- Related Files:
  - `src/game/sim/stage.js` :: `createStageRun`, `stepStage`, `restoreCheckpoint`; new
  - `src/game/scenes/StageScene.js`; modify
  - `test/stage-lifecycle.test.js`; new

#### Details
- `StageRun={stageId:'forest-1',checkpoint:'start'|'mid',player,enemies,projectiles,boss,arenaLocked:boolean,consumedPickupIds:string[],elapsedTicks:number,deaths:number,outcome:null|'clear'}`. `createStageRun(stage,checkpointData?)`는 유효한 checkpoint 및 아이템 id만 적용하고 원본 stage를 변경하지 않는다. `stepStage(run,input,stage):{run,events}`는 플레이어·적·투사체·보스·지형을 60Hz 기준으로 처리한다. 게임 로직은 랜덤 없이 정해진 spawn/공격 cycle을 사용한다.
- 활성 체크포인트 id와 실제 승리/사망, `consumedPickupIds` 변경을 이벤트 `stage:checkpoint`, `stage:pickup`, `stage:death`, `stage:clear`로 전달한다. death 시 deaths+1, elapsedTicks는 초기화하지 않는다. 사망 애니메이션 후 같은 run의 checkpoint('mid' 아니면 start)에 HP 3으로 복귀하고 모든 적/보스/투사체/arena를 초기화한다. 소비 id는 유지하고 획득한 아이템을 되살리지 않는다.
- 렌더/씬은 `exportCheckpointData():{stageId:'forest-1',checkpoint:'start'|'mid',consumedPickupIds:string[],elapsedTicks:number,deaths:number}`, `restoreCheckpointData(data)`를 노출하며 T03은 이 계약만 사용한다. 테스트는 중간 지점 도달 전·후 사망, 전 적 부활, 이미 소비한 아이템 미재생성, 보스 사망 동시 이벤트, 문 잠금/해제와 성공 중복 방지를 확인한다.

## Acceptance Criteria
- [x] 정상 플레이로 이동·점프 가능한 숲 스테이지를 지나 모든 적과 보스를 처치해 클리어할 수 있다.
- [x] 세 적의 예고·공격·회복이 구분되고 2단계 보스 및 상단 체력바와 잠긴 arena가 작동한다.
- [x] 구덩이 즉사, 만피 아이템 소비, 부활 시 모든 적 재생성 및 소비 회복 아이템 미재생성이 적용된다.
- [x] 체크포인트·기록 이벤트가 후속 저장 Task에서 사용할 수 있고 남은 적 수는 표시하지 않는다.

## Validation
- `npm.cmd test` — T01 회귀 및 map/enemy/boss/lifecycle 테스트 통과.
- `npm.cmd run build`; `git diff --check` — 빌드와 공백 검사 통과.
- `npm.cmd run dev` 후 PC 브라우저에서 모든 발판·각 적·보스 두 단계·사망/부활·피트·만피 회복 아이템을 검증하고 최초 완주 시간을 측정한다. 2~5분은 목표이며 조정 전 실제 측정값을 기록한다.

## Commit Message
```text
feat(stage): implement forest enemies and two-phase boss

Plan: 2026-11-07-pixel-action-first-stage
Phase: P01-first-stage
Task: T02-forest-stage

- Add platform terrain, enemy telegraphs, checkpoint and pickups
- Implement a locked boss arena and two-phase guardian
```

## Progress
- [x] 구현 완료
- [x] 자동 검증 통과
- commit: 이 청사진을 포함한 구현 커밋

- 자동 검증: 테스트 27개, 빌드, 공백 검사 통과.
- Chrome 자동 조작으로 처음부터 적 9마리와 2단계 보스를 전부 처치해 사망 없이 90.3초에 클리어했다.
- 브라우저에서 모든 높은 발판, 만피 회복 소비, 체크포인트 부활 및 보스 문을 추가 확인했다. 낮은 발판과 구덩이는 자동 테스트 및 전체 자동 주행으로 확인했다.
- 제한: 자동 주행 시간은 목표 2~5분보다 짧다. 사람이 직접 조작한 최초 완주 시간과 난이도는 미측정이며, T04 실플레이에서 측정해 조정한다.
- 빌드에는 Phaser 번들 크기 경고가 남아 있다.
