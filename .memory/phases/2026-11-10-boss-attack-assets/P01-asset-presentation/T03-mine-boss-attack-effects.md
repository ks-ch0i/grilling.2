# Task: T03 기계·벌레 보스의 외부 공격 스프라이트 연결

## Status: done

## Goal
기계 충격파·낙석·광물, 벌레 꼬리·산성액·웅덩이·잠복 효과를 본체와 독립된 스프라이트로 표시하고, 기존 hazard와 피해 영역을 바꾸지 않은 채 움직임·재질을 읽을 수 있게 한다.

## Decision Summary
- 기계 충격파는 주황 반달과 먼지·잔돌, 낙석은 회갈색, 광물은 청록 결정·짧은 빛 꼬리다. 벌레는 묵직한 갑각 꼬리·청록 잔상, 연두색 점액·방울·기포 웅덩이다.
- 두 보스가 같은 MineHazardView를 공유하므로 함께 연결한다. 일반 적의 같은 종류 hazard·광차·회복물약·플레이어 피격은 기존 표시를 유지한다. 등장 전용 연출은 다음 T04다.

## Implementation

### I01. 공유할 순수 표시 모델
- Related Files:
  - `src/game/render/mineAttackPresentation.js` — 본체 외부 공격과 hazard의 표시 모델; new
  - `src/game/assets/bossFx.js` :: `BOSS_FX_CLIPS`, `sampleFxFrame`, `fxItem` — T01의 고정 앵커 계약; read-only
  - `src/game/sim/mineBoss.js`, `src/game/sim/hazards.js` — 소유자·판정·수명 근거; read-only
  - `test/mine-attack-presentation.test.js` — 소유자·형상·수명·불변성; new

#### Details
- **Signatures & Types**:
  ```typescript
  type Arena={left:number;right:number;top:number;bottom:number};
  type Hazard={id:string;ownerId:string;kind:string;x:number;y:number;w:number;h:number;
    vx:number;vy:number;life:number;alive:boolean;remaining?:number;poolTicks?:number};
  type FxItem={id:string;texture:string;frame:number;x:number;y:number;width:number;
    height:number;flipX:boolean;rotation:number;alpha:number;depth:number};
  export function isBossSpriteHazard(hazard:Hazard):boolean;
  export function collectBossHazardItems(hazards:readonly Hazard[],elapsedTicks:number,arena:Arena):FxItem[];
  export function collectMineBodyItems(boss:MineBoss,elapsedTicks:number,arena:Arena):FxItem[];
  ```
- **Data & Schema Fields**:
  - 새 저장 필드는 없다. hazard와 boss의 기존 필드만 읽는다. 보스 id는 `mine-machine`, `mine-worm`이다.
  - T01의 모든 공격 canvas는128×128, core={x:16,y:16,w:96,h:96}. `fxItem`은 core를 Rect에 맞추고 표시 크기를 128/96배로 만든다. 높은 불투명도의 피해 물체는 core 안에 둔다.
  - 기계 texture `boss-machine-fx`: wave 0~3/loop12틱, rock4~7/loop16틱, mineral8~11/loop12틱, ceiling12~15/60틱.
  - 벌레 texture `boss-worm-fx`: tail0~3/18틱, acid4~7/loop12틱, pool8~11/loop24틱, burrowWarning12~13/loop16틱, burrowBurst14~15/18틱.

| 소유자·kind | 실제 피해 Rect/수명 | 표시의 경과 시간·방향 |
|---|---|---|
| machine/wave | 8×30, 지면 y=bottom-30, vx=±120 | age=ceil(arena폭/2)-life; 왼쪽 원화, vx>0이면 flipX |
| machine/rock | 20×20, 초기 life180 | age=180-life; 회갈색 바위, 회전0 |
| machine/mineral | 12×12, 초기 life60 | age=60-life; 청록 결정, +X 전방 원화를 atan2(vy,vx)로 회전 |
| worm/acid-shot | 8×8, 초기 life180 | age=180-life; 연두 점액, +X 전방 원화를 atan2(vy,vx)로 회전 |
| worm/acid-pool | 28×6, 초기 life240 | age=240-life; 실제 범위를 기준으로 기포 loop, 회전0 |

- **Execution Flow / Logic**:
  1. Precondition & Validation: 배열과 양의 Rect, 유한한 좌표·속도를 전제로 한다. alive=false는 표시하지 않는다. 읽는 함수는 입력을 mutate하거나 RNG를 호출하지 않는다.
  2. `isBossSpriteHazard`는 위 표의 ownerId+kind 조합에서만 true다. `golem-*`의 wave, `insect-*`의 acid-shot/pool, cart는 false다. 종류만 보고 전체 일반 적 외형을 바꾸지 않는다.
  3. Core Processing: 해당 hazard의 `id`를 안정된 FxItem ID로 사용하고 표의 age로 프레임을 계산한다. 기존 Rect만 fxItem에 전달한다. 실제 이동은 stepHazards가 담당한다. 표시를 위해 h.x/y/w/h/vx/vy/life를 수정하지 않는다.
  4. 회전은 정방형 광물·산성액만 적용한다. 원화의 고대비 핵심은 core 중앙 원 안에 있어 회전 후에도 Rect 밖으로 큰 위험 형상이 튀어나오지 않아야 한다. 잔상은 약한 장식이다.
  5. 웅덩이는 life>0인 마지막 틱까지 활성 가장자리를 유지한다. 기포가 사라지는 프레임을 피해 종료보다 먼저 쓰지 않는다. 사라진 hazard를 표시 목록에서도 즉시 제거한다.
  6. Error & Exception Handling: 잘못된 registry key/Rect는 T01 계약에 따라 실패한다. ID를 배열 index로 바꿔 여러 광물 사이 프레임·위치가 서로 바뀌지 않게 한다. snapshot 복구 시 life로 같은 프레임을 재현한다.
  7. State Transition & Return: FxItem[]만 반환한다. `hazard:hit`, `hazard:impact`, `hazard:shatter` 발생 수와 피격 규칙은 그대로다.

### I02. 본체·전방 꼬리·준비 효과 연결
- Related Files:
  - `src/game/render/mineAttackPresentation.js` :: `collectMineBodyItems` — 준비·꼬리·잠복; new
  - `src/game/render/EnemyView.js` :: `sync`, `destroy` — 별도 mine layer와 본체 방향; modify
  - `src/game/render/bossEffects.js` :: `drawMachineBossEffect`, `drawWormBossEffect` — 중복된 기존 도형 제거; modify
  - `src/game/assets/manifest.js` :: machine/worm chargeAttack — 돌진 중 프레임 반복; modify
  - `test/animation-contract.test.js` — 실제 전방 영역·새 모션 계약; modify

#### Details
- **Signatures & Types**: EnemyView의 `constructor(scene)`, `sync(run)`, `destroy()`를 유지한다. T02의 forestLayer와 별도로 `mineLayer:AttackSpriteLayer`를 가진다. T01 layer는 `sync(FxItem[])`와 `destroy()`를 제공한다.
- **Data & Schema Fields**:
  - machine의 w=80,h=64; worm의 w=96,h=64. 본체 원화는 왼쪽 기본이며 `lockedFacing>0`에 body와 outline을 함께 뒤집는 기존 규칙을 유지한다.
  - 준비 시간은 machine60틱, worm1페이즈60/2페이즈45틱, 반복 잠복45틱이다. tail·burrow hitbox는18틱이다. charge는72틱이며 기계180px/s, 벌레240px/s다.
- **Execution Flow / Logic**:
  1. machine 돌진은 T01의 드릴 가속·기체 젖힘 프레임을 사용한다. 후퇴는 실제 좌표 이동 없이 그림에서만 보인다. `machine.chargeAttack`의 6,7과 `worm.chargeAttack`의20,21은 loop=true로 설정해 장시간 돌진에서 회전·기어가기가 정지하지 않게 한다. 각 fps는 기존10/12를 따른다.
  2. machine wave는 집게 준비12,13 → 지면 타격14,15 → 생성된 wave hazard 에셋으로 이어진다. 별도 피해 box나 새로운 공격 종류를 만들지 않는다.
  3. 낙석 준비는 telegraph의 각 x에 `machine.ceiling`을 표시한다. 표시 Rect는 `{x:r.x-6,y:max(arena.top+8,44),w:r.w+12,h:28}`로 두어 상단 HUD y10~37에 작은 돌이 가려지던 문제를 피한다. 실제 낙석의 생성 y와 충돌 범위는 변경하지 않는다. 60-stateTicks로 프레임을 고르고 준비 종료 시 제거한다.
  4. 광물 준비의 발사부 붉은 glow와 1px tremor는 기존 규칙을 유지한다. 발사 시 본체에는 짧은 출구 동작만 보이고, 비행 물체는 hazard sprite가 유일하게 표시한다.
  5. 벌레 tail 활성 hitbox마다 `worm.tail`을 표시한다. Rect는 전방90×48, y=arena.bottom-48이며 age=18-box.ticks다. core 오른쪽 접점을 왼쪽 공격 시 b.x, 뒤집힌 접점을 오른쪽 시 b.x+b.w에 맞춘다. 준비는 몸 반대 비틀기12,13 → 실행14,15로 연결한다.
  6. 벌레 spit는 입 부풀기4,5 → 입 주변 짧은 분사6,7 → acid-shot으로 연결한다. 긴 빔을 본체에 함께 그리지 않는다. 기존 입 glow는 남길 수 있다.
  7. 잠복은 준비8,9와 실제 지면 흔적을 연결한다. `progress=1-stateTicks/(phase2?45:60)`; 지면 이동점 x=trailStartX+(targetX-trailStartX)*progress이다. 해당 점에24×10, 목표 targetX에48×10의 `worm.burrowWarning`을 지면에 맞춰 표시한다. 실제 target Rect48×64와 활성 hitbox에는 `worm.burrowBurst`를18틱으로 표시한다. 2회 잠복은 기존의 재조준된 각 target을 따른다.
  8. 현재 잠복 준비 중에도 본체 contact 판정은 남아 있다. 이 Task에서 그 판정을 바꾸거나 본체를 완전히 감춰 보이지 않는 접촉 위험을 만들지 않는다. 낮아지는 준비 자세와 지면 흔적을 사용하되 접촉 가능한 본체를 읽을 수 있는 노출을 유지한다. 완전한 잠복 무적·접촉 제거는 별도 사용자 결정 사항이다.
  9. mine 보스일 때 mineLayer에 collector 결과를 전달하고 forest일 때 비운다. 기본 graphics는 준비 glow와 2페이즈 광물 glow 등 남은 보조 효과만 그린다. 기존 rocks 작은 사각 돌, wave 삼각형, tail 선, burrow 삼각 파편 등 새 sprite와 겹치는 도형은 제거한다.
  10. Error & Exception Handling: boss 종류가 바뀔 때 이전 mineLayer/forestLayer의 잔여 ID를 정리한다. destroy에서 두 layer를 해제한다. EnemyView의 일반 적·일반 발사체·outline·숲 root 선택 코드는 보존한다.
  11. State Transition & Return: 표시는 상태·hitbox·hazard만 읽는다. 효과 프레임 변경이 보스 HP·targetX·RNG·조준 순간에 영향을 주지 않는다.

### I03. MineHazardView에 보스 전용 layer 연결
- Related Files:
  - `src/game/render/MineHazardView.js` :: `constructor`, `sync`, `destroy` — 보스 hazard 분기; modify
  - `src/game/scenes/StageScene.js` :: `showMineralBurst` — 기존 환경 파쇄 연결 확인; read-only
  - `test/mine-attack-presentation.test.js`, `test/mine-boss.test.js`, `test/mine-enemies.test.js`, `test/mine-integration.test.js` — 회귀 검증; new|modify

#### Details
- **Signatures & Types**: 기존 `MineHazardView(scene)`, `sync(run)`, `destroy()`를 유지한다. 내부에 `hazardLayer=new AttackSpriteLayer(scene)`를 추가한다. 보스 외 기존 carts/minerals/drop/warned의 역할은 유지한다.
- **Execution Flow / Logic**:
  1. 먼저 `collectBossHazardItems(run.hazards,run.elapsedTicks,scene.stage.arena)`를 sync한다. 이 목록에 들어간 hazard는 기존 graphics 또는 minerals Map에서 다시 그리지 않는다.
  2. ownerId가 다른 일반 적의 wave/acid-shot/pool과 광차는 기존 graphics·sprite·warning 코드로 렌더링한다. 보스용 mineral이 기존 Map에 남았다면 해당 ID sprite를 제거한다. 새 layer에서 사라진 ID는 즉시 정리한다.
  3. 기존 MineHazardView 하단의 벌레 windup 지면선·목표 삼각형은 I02의 새 bodyItems와 중복되므로 제거한다. 광차 경고와 bossDrop sprite는 수정하지 않는다.
  4. 기존 광물 비행 충돌과 지면 파쇄의 이벤트/짧은 환경 효과는 이어받는다. 플레이어에게 닿는 순간을 위한 새 전용 hit effect는 추가하지 않는다.
  5. destroy에서 hazardLayer도 해제한다. scene shutdown 뒤 남은 보스 sprite가 다른 라운드에 보이지 않는다.

## Acceptance Criteria
- [ ] 주황 반달·회갈색 낙석·청록 광물·갑각 꼬리·연두 점액/기포가 실제 별도 시트를 사용한다.
- [ ] 각 표시 core는 기존 Rect에 맞고, 좌우 전환·회전·스냅샷 후 프레임이 일치한다.
- [ ] 일반 적 소유의 같은 종류 hazard, 광차 경고·회복물약·플레이어 피격 표현이 변하지 않는다.
- [ ] 표시 함수 호출 전후 run과 다음 step 결과가 동일하다. 광물5~7발·±120px·한 번 피격, 짧은/긴 점프 차이, 웅덩이240틱·잠복 재조준은 기존 검사를 통과한다.
- [ ] HUD 아래 보이는 낙석 준비 신호, 두 꼬리 방향의 연결, 원화와 런타임 결과를 파일로 관찰한다. 직접 플레이로 검증하지 않는다.

## Validation
- `node --test test/mine-attack-presentation.test.js test/mine-boss.test.js test/mine-enemies.test.js test/mine-integration.test.js test/animation-contract.test.js` — 표시 모델과 기존 광산 전투·저장 회귀 통과.
- `npm.cmd run build` — 두 보스의 새 layer 및 clip 연결 빌드 통과.

## Commit Message
```text
feat(boss): render mine boss attacks with dedicated sprites

Plan: 2026-11-10-boss-attack-assets
Phase: P01-asset-presentation
Task: T03-mine-boss-attack-effects

- Connect machine waves and minerals to existing hazards
- Add armored tail and acid sprites without changing enemy hazards
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in phase.md after commit
- 보스 ownerId+kind 조합만 새 시트로 표시하고 일반 적·광차·물약은 기존 경로에 남겼다. 낙석 예고를 HUD 아래에 배치하고 꼬리 양방향 접점, 위상·수명·스냅샷 불변성을 검사했다.
- 지정 집중 검사32/32·빌드 통과. T01에서 관찰한 런타임 PNG의 core를 기존 피해 영역에 연결한다. 직접 플레이·청취 없이 검증했다.
- 잠복 중 본체 접촉 피해 제거는 승인된 추가 범위가 아니므로 규칙을 변경하지 않았다. 기존 번들 경고 외 새 인접 결함은 발견하지 않았다.
