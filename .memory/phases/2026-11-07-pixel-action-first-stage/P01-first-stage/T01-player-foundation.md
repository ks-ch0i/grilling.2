# Task: T01 독립 프로젝트와 플레이어 전투 기반

## Status: done

## Goal
`C:/DuringDex/dev_games/pixel-action`에서 PC 브라우저로 실행되는 독립 게임을 만들고 임시 검증 화면에서 좌우 이동, 가변 높이 점프, 마우스 360도 검 3연타, 구르기와 공중 내려베기를 실제로 조작한다.

## Decision Summary
- 새 게임은 Knight Run의 세이브·장비·계정·서버와 완전히 독립한다. 기존 폴더와 원격을 수정하지 않는다. 하드 모드, 온라인 랭킹, 모바일·게임패드는 첫 버전 밖이다.
- 키: A/D 이동, Space 가변 점프, 마우스 왼쪽 클릭 1회=공격 1회, Shift 구르기, E 공중 내려베기. 세부 수치는 아래 **초기 튜닝값**이고 플레이 후 조정 가능하다.
- 플레이어 3하트, 모든 피해 1하트, 접촉 피해와 피격 후 무적, 구르기 전체 무적. 렌더링은 명료한 8방향 몸과 360도 검; 이 작업의 검증용 도형은 최종 도트 에셋이 아니다.

## Implementation

### I01. 신규 저장소와 브라우저 골격
- Related Files:
  - `package.json`, `package-lock.json`, `.gitignore` — 독립 Node/Vite/Phaser 앱; new
  - `index.html`, `src/main.js`, `src/styles.css`, `src/game/config.js` — 캔버스·실행 진입점; new
  - `.memory/decisions/2026-11-07-pixel-action-first-stage.md`, 이 Task 및 plan/phase/current — 작업 기록; modify only status as required

#### Details
- 실행 전에 현재 절대 경로가 `C:/DuringDex/dev_games/pixel-action`인지, `.git` 및 사용자 파일을 확인한다. 아직 별도 Git 저장소가 없을 때만 `git init -b main`; 기존 저장소가 있으면 초기화하지 않는다. 사용자 파일을 덮지 않는다. Git 사용자 이름/메일을 임의로 설정하지 않는다.
- Node >=22.12.0, ESM JavaScript, Phaser `4.2.1`, Vite `8.3.1`을 고정하고 lockfile 생성. 이 버전은 기존 로컬 프로젝트에서 설치·빌드 확인된 값이다. scripts: `dev: vite --host 127.0.0.1`, `build: vite build`, `test: node --test test/*.test.js`. `npm.cmd install --no-audit --no-fund` 후 이후 작업은 `npm.cmd ci` 사용 가능하게 한다.
- 내부 좌표 640×360, 픽셀 정수 좌표, Phaser Scale.FIT/CENTER_BOTH, nearest-neighbor/`pixelArt:true`, 캔버스 단일 instance. 창 비율이 달라도 클릭을 캔버스 화면 좌표에서 카메라 월드 좌표로 변환한다. 키보드·마우스 외 입력은 필수 아님. HTML에는 접근 가능한 제목과 게임 영역, 실제 게임의 조작 안내는 T03 메뉴에서만 노출한다.
- `src/main.js`는 정확히 하나의 `new Phaser.Game(config)`만 만든다. `src/game/config.js`는 `export function createGameConfig(parent)`를 제공한다. `src/game/scenes/StageScene.js`에서 초기 연습실을 시작한다. 1920×360 연습실의 바닥 윗면 y=304, 시작 중심 x=128, 천장·벽 밖 제한; 움직이는 최종 적 대신 내구도 무한 표적과 검 히트 표시를 제공해 기능을 실측한다.

### I02. 시간·입력·좌표와 충돌 계약
- Related Files:
  - `src/game/input/InputController.js` :: `sample(scene)`, `destroy()`; new
  - `src/game/sim/constants.js`, `src/game/sim/geometry.js`, `src/game/sim/player.js` :: 고정 스텝·충돌·상태; new
  - `src/game/scenes/StageScene.js` :: 입력 수집, 누산기, 렌더 및 카메라; new

#### Details
- **고정 스텝**: 월드 모델은 Phaser 렌더와 분리된 1/60초 tick으로만 갱신한다. `deltaMs`를 누산해 tick당 입력 이벤트를 최대 한 번 소비하고 한 프레임에 최대 8 tick을 처리한다. 탭 비활성/일시정지에는 누산기·키를 비우고 복귀 시 대기 시간을 시뮬레이션하지 않는다. 입력은 DOM/Phaser listener를 scene shutdown에서 해제한다.
- **데이터**: 화면 원점 좌상단, x 오른쪽·y 아래; 바닥 사각형은 `{x,y,w,h}`; 플레이어 `{x,y,vx,vy,w:16,h:28,grounded,hp:3,mode,facing,invulnerableTicks,rollCooldown,diveCooldown,combo,lockedAim,hitIds}`, 위치는 AABB 좌상단이다. `mode`는 `idle|run|jump|fall|attack|roll|dive|hurt|dead`. 초기값 x=120, y=276, 나머지 속도/타이머 0. `InputFrame={move:-1|0|1,jumpPressed:boolean,jumpHeld:boolean,attackPressed:boolean,rollPressed:boolean,divePressed:boolean,aimX:number,aimY:number}`. `aimX/aimY`는 현재 카메라에서 변환한 월드 포인터다.
- **함수 계약**: `createPlayer(x:number,y:number): PlayerState`; `stepPlayer(state:PlayerState,input:InputFrame,terrain:Rect[]): {player:PlayerState,events:GameEvent[]}`; `intersects(a:Rect,b:Rect):boolean`; `normalizeAim(px,py,aimX,aimY,previous):{x:number,y:number}`. 모듈은 DOM/Phaser에 의존하지 않는다. 이벤트 `{type:'swing'|'dive-impact'|'roll'|'jump'|'hurt'|'death', ...}`는 소리/렌더가 소비한다.
- **초기 튜닝값**(전부 상수로 모아 실측 후 조절): 속도 150px/s, 중력 900px/s², 점프 초기 vy=-300px/s, 최대 낙하 400px/s. 착지 시에만 새 점프가 시작된다. 점프 버튼을 일찍 놓으면 상승 중 vy를 45%로 줄여 짧게 뛰고, 계속 누르면 정상 높이에 도달한다. 충돌은 x, y 순서로 이동해 만난 고체 AABB의 진입면으로 밀어내고 축 속도를 0으로 한다. 발판의 옆·아래 충돌도 처리한다. 낙하 중 바닥 윗면 착지로만 grounded=true. 한 tick의 이동량이 얇은 지형을 통과하지 않게 swept AABB 또는 충분한 substep을 사용한다.
- **입력 에지**: 이벤트 큐는 keydown repeat와 마우스 버튼 유지에 따른 반복 입력을 무시하고 새 누름만 `Pressed`로 소비한다. 동시에 A/D면 0. 포커스 상실 시 held/queued 모두 초기화해 이동이 고착되지 않게 한다. 화면 밖 포인터도 마지막 유효 월드 방향을 유지하고 포인터가 몸 중심과 일치하면 마지막 방향, 최초에는 오른쪽을 쓴다.

### I03. 공격, 구르기, 내려베기
- Related Files:
  - `src/game/sim/combat.js` :: `angleToFacing8`, `attackIntersects`, `applyPlayerDamage`; new
  - `src/game/sim/player.js` :: 공격 상태 기계 및 이벤트; new
  - `src/game/scenes/StageScene.js` :: 임시 검·타격 범위 표시; modify

#### Details
- **3타**: 새 클릭으로 첫 타 시작, 공격 중 클릭 하나를 버퍼링해 회복 종료 때 다음 타(최대 3) 실행, 한 타의 순서 startup 4 / active 5 / recovery 10 tick. 회복 끝까지 버퍼가 없거나 3타가 끝나면 콤보 종료. 첫 타 때 플레이어 중심→포인터 단위 벡터를 잠그고 전체 콤보에 재사용한다. 8방향 몸 인덱스는 `round(atan2(y,x)/(π/4))`를 0..7로 정규화; 검과 실제 공격 부채꼴은 잠긴 연속 각도를 쓴다. 포인터가 바뀌어도 콤보 중 방향이 바뀌지 않는다.
- **판정**: 각 타의 active 구간에만 플레이어 중심에서 반경 36px·중심각 ±50° 내의 적 AABB에 적용한다. AABB 전체가 부채꼴과 교차하는지 판정하고 대상의 안정된 id를 `hitIds`에 기록해 같은 타가 한 적에게 한 번만 피해를 준다. 새 타에서는 집합을 비운다. 빈 공간과 벽 관통 경계, 같은 적 중복, 좌우/수직/대각 8방향 및 회전된 검 표시와 판정을 테스트한다. 피해량 초기값 1.
- **롤**: grounded 또는 공중에서도 허용, 최초 누름에 수평 이동 방향(중립이면 마지막 수평 방향)으로 18 tick 동안 230px/s, 전체 18 tick 무적; 종료 후 24 tick 재사용 대기. 롤 중 공격/점프/내려베기 신규 발동 불가. 지형 충돌과 낭떠러지 추락은 여전히 처리하며 구덩이 추락은 무적을 무시한다. 피격은 구르기 우선.
- **내려베기**: 공중에서만 E가 동작하며 vy=400px/s 수직 강하, 1회 사용 후 착지 시 cooldown 36 tick 시작. 다음 사용 전 재점프와 cooldown 종료가 모두 필요하다. 착지 이벤트 순간 플레이어 아래쪽 범위 `x±24,y=feet±12`에 1 피해를 대상별 한 번 적용; 공중 좌클릭은 일반 검 공격이다. 롤/사망/피격 중 새 스킬 불가. 착지 이전 밑으로 빠지면 피트 사망; 콤보/스킬 상태가 멈추지 않도록 정리한다.
- `applyPlayerDamage(player,source)`는 3하트에서 정상 접촉/공격 시 1칸 감소, 45 tick 피격 무적을 부여하며 롤·피격 무적 동안 추가 피해를 무시한다. 0이면 death 이벤트 1회. 피트 사망은 체력과 무적 무관하게 즉시 0으로 한다. 시간은 60Hz tick 기준이며 충돌 처리의 우선순위는 피트→롤 무적→피격 무적→피해다.

### I04. 검증 가능한 플레이어 표현
- Related Files:
  - `src/game/render/PlayerView.js` :: `sync(player,scene)`, `destroy()`; new
  - `test/player.test.js`, `test/combat.test.js`, `test/input.test.js`; new
#### Details
- T01에서는 몸을 8방향으로 구분할 수 있는 임시 도형과 포인터 각도의 검·명중 영역을 렌더한다. 충돌 AABB, 기준점, 월드 속도는 그림 크기에 독립시킨다. T04에서 동일 상태 계약을 최종 도트로 바꾼다.
- 점프 짧게/길게·공중 재점프 거부·착지 판정·벽·플랫폼 밑·피트, 롤 전 구간 무적과 종료/쿨다운, 피격 연타 방지와 하트 0, E 공중만/수직/착지 후 쿨다운, 클릭 edge/버퍼 3타/방향 잠금/같은 적 1회 피해, 포커스 손실을 자동 테스트한다.

## Acceptance Criteria
- [x] 독립 Git 저장소가 생기고 기존 Knight Run 파일·Git·원격은 변경하지 않았다.
- [x] 연습실에서 명시된 모든 입력이 실제 동작하고 360도 조준과 8방향 몸이 일치한다.
- [x] 고정 tick에서 점프·충돌·무적·공격이 같은 입력에 동일하게 진행되고 키가 고착되지 않는다.
- [x] 임시 도형은 후속 최종 이미지로 교체할 대상으로 명시된다.

## Validation
- `npm.cmd test` — 핵심 입력·물리·전투 전부 통과.
- `npm.cmd run build`; `git diff --check` — build와 공백 검사 통과.
- `npm.cmd run dev` 후 PC 브라우저에서 16:9/창 크기 변경을 포함해 조작, 8방향·3타 고정 방향, 짧은/긴 점프, 구르기와 E를 확인하고 실패/제한을 기록한다.

## Commit Message
```text
feat(player): establish pixel action controls and combat

Plan: 2026-11-07-pixel-action-first-stage
Phase: P01-first-stage
Task: T01-player-foundation

- Initialize an independent browser game repository
- Implement and verify player movement and melee controls
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: f46d31a
