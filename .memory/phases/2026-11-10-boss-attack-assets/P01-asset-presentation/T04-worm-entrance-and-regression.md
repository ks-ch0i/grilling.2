# Task: T04 4초 벌레 등장·포효 연결과 전체 회귀 검증

## Status: done

## Goal
기계 처치 완료 후 벌레를 4초 동안 맵 깜빡임 → 바닥의 먼지 속 실루엣과 포효 → 전체 화면 암전 → 완전한 외형 공개 순서로 등장시킨다. 저장·일시정지·연습 시작도 동일한 단계와 소리를 재현하고, 앞선 세 Task를 전체 자동 검사로 마무리한다.

## Decision Summary
- 바닥 돌출 때는 검은 실루엣만 보이고 얼굴·갑각 세부는 암전 이후에 공개한다. 기존 등장 중 조작 정지 규칙을 240틱에 적용하며 새 피해·지형 판정은 만들지 않는다.
- 시뮬레이션의 남은 intro ticks를 유일한 시간 근거로 사용한다. 포효는 등장 구간 시작이 아닌 돌출 시작에 한 번 재생한다. 기존 벌레 2페이즈 전환의 30틱 암전·포효는 별도다.

## Implementation

### I01. 등장 타임라인과 이벤트
- Related Files:
  - `src/game/sim/wormIntro.js` — 240틱 상수와 순수 타임라인; new
  - `src/game/sim/stage.js` :: `stepStage`, `restoreStageRun` — 자연 등장·단계 경계 이벤트·검증; modify
  - `src/game/dev/roundSelector.js` :: `createPracticeRun` — 같은 시간으로 연습 시작; modify
  - `src/game/sim/mineBoss.js` :: `stepMineBoss` — 기존 intro countdown과 전투 전환; read-only
  - `test/worm-intro.test.js` — 경계·이벤트·복구; new
  - `test/mine-boss.test.js`, `test/round-selector.test.js`, `test/mine-integration.test.js` — 기존 등장 길이와 통합 검사; modify

#### Details
- **Signatures & Types**:
  ```typescript
  export const WORM_INTRO_TICKS:240;
  export const WORM_INTRO_BURST_TICK:96;
  export const WORM_INTRO_BLACKOUT_TICK:120;
  export const WORM_INTRO_REVEAL_TICK:144;
  type WormIntroTimeline={elapsedTicks:number;
    phase:'flicker'|'burst'|'blackout'|'reveal'|'done';
    phaseTicks:number;phaseDuration:number;showBody:boolean;showBossHud:boolean;
    mapDimAlpha:number;blackoutAlpha:number};
  export function getWormIntroTimeline(remainingTicks:number):WormIntroTimeline;
  ```
- **Data & Schema Fields**:
  - root/intro 저장 필드를 더 추가하지 않는다. 기존 `bossSequence='worm-intro'`, `boss.state='intro'`, `boss.stateTicks`와 `elapsedTicks`를 사용한다.
  - natural spawn: x=(arena.left+arena.right)/2-48, y=arena.bottom-64. 현행 arena는 left10496,right11472,top0,bottom304이고 worm w96,h64다. 기존 bossDrop 롤과 좌표, hazards/projectiles 정리는 유지한다.
  - `elapsedTicks=240-remainingTicks`로 계산한다. 전체 게임의 run.elapsedTicks와 구분한다.

| 구간 | 경과 틱 | 남은 틱 | 출력 |
|---|---|---|---|
| flicker | 0~95 | 240~145 | body/HUD 숨김, mapDimAlpha를16틱 간격으로 .12/.50 교대, blackout=0 |
| burst | 96~119 | 144~121 | 검은 실루엣/파괴 먼지, body/HUD 숨김, mapDim=0, blackout=0 |
| blackout | 120~143 | 120~97 | body/HUD 숨김, mapDim=0, blackout=1 |
| reveal | 144~239 | 96~1 | body/HUD 공개, mapDim=0, blackout=max(0,1-phaseTicks/12) |
| done | 240 | 0 | body/HUD 표시, 두 overlay=0, phaseDuration=0,phaseTicks=0 |

- flicker/burst/blackout/reveal의 phaseDuration은96/24/24/96, phaseTicks는 해당 경계에서0부터 증가한다. 이 배분은 총4초 요구를 구현하는 제작 기준이다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: remainingTicks가 정수0~240이 아니면 RangeError다. 실제 `worm-intro` 저장은 `stateTicks`1~240이어야 한다. done=0은 순수 함수 경계 검증에 사용한다.
  2. 기계의 기존 dying90틱이 끝난 `boss:defeated` 분기에서 stateTicks를 공통 WORM_INTRO_TICKS로 설정한다. bossSequence·초기 HP18·한 번의 물약40%롤·이전 위험 정리·arenaLocked는 기존 그대로다. 기계 HP0 순간부터 4초를 세지 않는다.
  3. 기존 worm-intro early return에서 beforeRemaining을 읽고 stepMineBoss를 한 번 호출한다. `beforeRemaining>144 && afterRemaining<=144`를 넘는 step에서 `{type:'boss:worm-burst'}`를 한 번 push한다. 렌더 함수에서 이 이벤트를 만들지 않는다.
  4. intro=0이 된 step에는 기존 stepMineBoss가 phase1 windup으로 전환하며 run.bossSequence='worm'이 된다. 총240 simulation step이 끝날 때까지 플레이어 위치·HP·hazard를 기존 intro 규칙대로 동결한다. phase 전환처럼 이동을 허용하는 다른 규칙과 섞지 않는다.
  5. `createPracticeRun('mine-worm')`도 같은 상수로240을 설정한다. 라운드 목록·개발 전용/배포 비활성화·연습 기록 미저장은 유지한다.
  6. Error & Exception Handling: 새 version/reset을 만들지 않는다. 기존180 이하의 intro snapshot도 남은 시간을 그대로 받아 타임라인에 투영한다. 남은 시간을240으로 재설정해 이미 지난 시작 장면·포효를 반복하지 않는다. 기존45틱 intro fixture도 유효한 reveal 구간이다.
  7. State Transition & Return: 새로운 시작 신호 `boss:worm-intro`는 기존처럼 생성하되 소리 재생에는 사용하지 않는다. burst 이벤트는 저장이 이미 남은144 이하인 상태에서 다시 재생되지 않는다.

### I02. 검은 실루엣·깜빡임·암전·본체 공개
- Related Files:
  - `src/game/render/WormIntroView.js` — 등장 FX와 두 화면 overlay; new
  - `src/game/scenes/StageScene.js` :: `create`, `renderWorld`, shutdown — view 생성·순서·해제; modify
  - `src/game/render/EnemyView.js` :: `sync` — body/outline 노출과 reveal 애니메이션 시작; modify
  - `src/game/assets/bossFx.js`, `src/game/render/AttackSpriteLayer.js` — T01 계약; read-only
  - `test/worm-intro-view.test.js` — 전체 암전·노출·정리; new

#### Details
- **Signatures & Types**:
  ```typescript
  export class WormIntroView {
    constructor(scene:object);
    sync(run:StageRun,stage:StageDefinition,timeline:WormIntroTimeline|null):void;
    destroy():void;
  }
  // 후방 호환 optional 인자를 추가한다. 기본 호출 sync(run)도 유효하다.
  EnemyView.sync(run:StageRun,options?:{bossVisible?:boolean;bossElapsedTicks?:number}):void;
  ```
- **Data & Schema Fields**:
  - T01 texture `worm-entrance-fx`: 256×192 프레임8개. burst0~3/24틱, settle4~7/96틱. 지면 접점=(128,176)이다.
  - 표시는192×144(스케일.75), 중심 x=boss.x+boss.w/2, y=arena.bottom-60으로 한다. 표준 origin(.5,.5)에서 원화 접점이 정확히 arena.bottom에 맞는다. body와 무관한 별도 ID `worm-entrance-burst`/`worm-entrance-settle`, depth6.
  - dim rectangle: 화면640×360, origin(0,0),scrollFactor0,검정,depth9. 배경과 게임 물체를 어둡게 하고 depth10~11 HUD는 유지한다.
  - blackout rectangle: 화면640×360, origin(0,0),scrollFactor0,검정,depth100. 기존 depth2/alpha.9의 2페이즈 bossBlackout과는 별도 객체다. 등장 암전은 player·boss·HUD를 모두 덮어야 한다.
- **Execution Flow / Logic**:
  1. StageScene.create에서 WormIntroView를 생성하고 shutdown에서 destroy한다. renderWorld는 `bossSequence==='worm-intro' && boss.kind==='worm'`일 때만 순수 timeline을 계산하며, 나머지는 null로 전달한다.
  2. flicker에는 dim만 사용하고 본체·outline·보스 이름·체력바·방향 화살표·기존 '거대 벌레 등장' 문구를 숨긴다. 준비 중 완전한 본체가 먼저 나타나지 않아야 한다.
  3. burst에는 0~3 프레임으로 바닥 파괴와 먼지 속 검은 실루엣만 표시한다. 기존 boss sprite를 검게 tint한 것과 동시에 완전한 본체를 그리지 않는다. 소리는 I03의 이벤트가 담당한다.
  4. blackout에는 불투명한 상위 rectangle만으로 전체 게임 화면을 가린다. 렌더 카메라를 흔들거나 지형 solids를 실제로 지우지 않는다.
  5. reveal에는 body/outline을 정상 표시하고 EnemyView의 bossElapsedTicks=timeline.phaseTicks를 전달해 기존 worm intro0,1 자세를 공개 시점부터 재생한다. 앞 구간에 숨겨진 동안 이미 클립이 끝난 것으로 처리하지 않는다. HUD도 이때부터 공개한다. settle4~7을96틱에 맞춰 표시하고 alpha=1-phaseTicks/96으로 먼지만 사라지게 한다.
  6. `EnemyView.sync`는 options.bossVisible을 body와 outline 모두에 적용한다. animationFrame 경과 값은 override가 있으면 그것을 쓰고, 없으면 기존 tick-bossStart다. T02 숲 root와 T03 mine attack layer는 intro 상태에서 공격 item을 만들지 않는다.
  7. timeline=null 또는 intro 종료면 새 overlay를 숨기고 intro layer를 비운다. 기존 worm phase2 상태에서는 기존 bossBlackout만 동작하며 본체와 플레이어 이동을 유지한다. scene reset/다른 연습 라운드에서도 잔여 암전이 없어야 한다.
  8. Error & Exception Handling: 모든 계산은 남은 simulation ticks에서 나오므로 일시정지·설정창·blur 때 같은 화면을 유지한다. render를 여러 번 호출해도 소리나 새 simulation event가 발생하지 않는다. destroy는 중복 호출에 안전하다.

### I03. 포효를 돌출 순간으로 옮기기
- Related Files:
  - `src/game/audio/eventSounds.js` — 테스트 가능한 정적 이벤트→사운드 맵; new
  - `src/game/scenes/StageScene.js` :: `playEventSound` — 맵 사용·기존 동적 적 피격 처리; modify
  - `src/game/audio/AudioManager.js` :: `SFX.wormEmergence` — 짧은 저음 포효; modify
  - `test/audio-manager.test.js`, `test/worm-intro.test.js` — 시점·한 번 재생·기존 소리; modify|new

#### Details
- **Signatures & Types**:
  ```typescript
  export const EVENT_SFX:Readonly<Record<string,string>>;
  // AudioManager.playSfx(id:string):boolean은 기존 시그니처 유지.
  ```
- **Data & Schema Fields**:
  - 기존 StageScene의 정적 매핑 jump/swing/roll/dive-impact/hurt/stage:pickup/boss:intro/boss:transition/boss:death/stage:clear/acid:pool을 동일하게 옮긴다.
  - `'boss:worm-burst':'wormEmergence'`만 등장음에 연결하고 `'boss:worm-intro'`에는 매핑하지 않는다. 동적 enemy:hurt→hit/enemyDeath 선택과 보스 음악·파편·카메라 shake 처리는 기존 StageScene에서 유지한다.
  - 기존 합성 ID를 사용하며 별도 음원 파일은 요구하지 않는다. wormEmergence를 `from:180,to:45,duration:.75,type:'sawtooth',interval:.7`의 낮게 내려가는 포효로 설정한다. bossPhase의 기존220→70/.55초는 유지한다. 이는 사용자가 지정한 포효를 기존 합성 경로로 구현하는 기술 기준이다.
- **Execution Flow / Logic**:
  1. burst 이벤트가 실제 step에서 발생한 시점에만 playSfx를 호출한다. 현재 map lookup을 EVENT_SFX로 교체한다. 렌더·view 생성·복구·일시정지 재개에는 포효를 재호출하지 않는다.
  2. 기존 AudioManager의 음소거·unlock·paused·동시음 제한·설정 볼륨 처리는 유지한다. 소리 재생이 거절돼도 타임라인과 전투는 진행한다.
  3. 한 번의 update에 여러 simulation step이 실행돼96틱 경계를 지나도 event가 한 번만 발생한다. 로드 시 이미 경계를 지났으면 다시 울리지 않는다.
  4. Error & Exception Handling: 기존 오디오 실패 안내를 사용하며 새 네트워크 음원이나 자동 권한 요청을 추가하지 않는다. 음악 트랙은 기계→벌레 사이에 재시작하지 않는다.

### I04. 전체 회귀와 최종 기록
- Related Files:
  - `test/worm-intro.test.js`, `test/worm-intro-view.test.js` — new
  - `test/mine-boss.test.js`, `test/round-selector.test.js`, `test/mine-integration.test.js`, `test/audio-manager.test.js` — modify
  - `.memory/phases/2026-11-10-boss-attack-assets/P01-asset-presentation/phase.md` — 관찰·검증·제한 기록; modify
- **Execution Flow / Logic**:
  1. 남은 ticks240,145,144,121,120,97,96,1,0에서 정확한 phase/visibility/alpha를 검증한다. 96틱 경계에서 포효1회,120~143경과 동안 전체 암전,144부터 외형 공개다.
  2. 자연 전환과 mine-worm 연습 모두240틱이다. 기존 mine-boss의179회 대기 검사는239회로, 초기180 기대값은240으로 바꾼다. **모든180을 일괄 치환하지 않는다**: rock/acid/projectile의 life180, 기계 돌진 속도180, 광차 첫 카운트180은 별개다.
  3. 기계 dying 중 플레이어가 움직이는 기존 규칙, 40% 물약 단 한 번, intro 중 물약 미소비·HP/위치 동결, 벌레 처치 때만 clear, 음악 연속성을 유지한다.
  4. 새240타이머의 모든 단계와 이전180/45 snapshot을 JSON 저장·복구한 뒤 다음 step 및 표시 모델이 같다. 남은144 저장 후 재개에는 burst 소리가 추가로 발생하지 않는다. 단계 이전부터 재개하면 경계를 지날 때 한 번 발생한다.
  5. fake scene으로 body/outline 숨김, boss HUD 숨김, depth100 전체 overlay, reveal 첫 프레임, shutdown·다른 라운드·restore 뒤 잔여 overlay 정리를 검사한다. Phaser 게임을 브라우저로 직접 플레이하지 않는다.
  6. 실제 새 PNG를 파일로 관찰한 기록과 자동 테스트/빌드를 분리해 남긴다. 인간이 새 연출을 보거나 실제 소리를 들었다는 확인을 자동 검사로 대신했다고 쓰지 않는다. 기존 사용자의 화면·소리 정상 피드백은 이전 버전 관찰로만 보존한다.
  7. 전체 검사가 통과한 뒤 이 계획의 Task·phase·current 진행을 동기화한다. 이전2026-11-08 T04를 과거에 완료한 것으로 소급하지 않는다.

## Acceptance Criteria
- [x] 기존 기계 사망 뒤 총240틱이며96/120/144 경계가 정확하다.
- [x] 돌출 때 검은 실루엣과 포효만 보이고, 전체 암전 이후에 본체와 보스 HUD가 공개된다.
- [x] 포효는 돌출 시작에1회이며 pause/render/restore가 중복 재생하지 않는다.
- [x] 연습 모드·기존 저장·물약·clear·음악·2페이즈 이동과 암전이 회귀하지 않는다.
- [x] 모든 테스트와 프로덕션 빌드가 통과하고 이미지 관찰·자동 검증·미실시한 사람 체감 확인을 구분해 기록한다.

## Validation
- `node --test test/worm-intro.test.js test/worm-intro-view.test.js test/mine-boss.test.js test/round-selector.test.js test/mine-integration.test.js test/audio-manager.test.js` — 등장·복구·음향 시점 집중 검사.
- `node scripts/pack-art.mjs` — T01~T03의 실제 자산 재패킹, 불필요한 픽셀 변경이 없는지 확인.
- `npm.cmd test` — 전체 회귀 검사.
- `npm.cmd run build` — 전체 연결 빌드. 기존 번들 경고는 오류와 구분해 기록하며 임의의 최적화 Task를 추가하지 않는다.

## Commit Message
```text
feat(boss): stage four-second worm emergence after machine defeat

Plan: 2026-11-10-boss-attack-assets
Phase: P01-asset-presentation
Task: T04-worm-entrance-and-regression

- Reveal a floor-burst silhouette before blackout and full emergence
- Synchronize the roar and preserve practice and save timelines
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: babddcd
- 남은 intro ticks를 유일한 시간 근거로240틱/96·120·144 경계를 구현했다. 실루엣과 완전한 본체를 분리하고 body/outline/HUD 공개와 포효를 동기화했다.
- 기존 등장 이벤트의 소리를 바닥 돌출 이벤트로 옮겼고, 180틱·45틱 이전 저장을 남은 시간 그대로 복구한다. 연습 시작도240틱이다.
- 암전 Rectangle의 fillAlpha=0이면 객체 alpha를 높여도 검정이 칠해지지 않는 기존 설정을 fillAlpha=1로 바로잡았다. 새 전체 화면 암전도 불투명 fill+객체 alpha를 사용한다.
- 집중 검사30/30, 전체135/135, 재패킹과 빌드 통과. 최종 번들1,464.20KB 경고는 기존 한도를 넘는 경고로 기록하며 별도 최적화는 하지 않았다.
- 실제 PNG 원화/런타임 시트는 T01에서 파일 관찰했고 로직·가짜 scene으로 표시와 소리를 검증했다. 브라우저 직접 플레이·사람의 새 버전 시청·실제 청취를 했다고 주장하지 않는다.
