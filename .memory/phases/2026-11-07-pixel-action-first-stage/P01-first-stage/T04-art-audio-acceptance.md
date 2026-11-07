# Task: T04 최종 도트 이미지·사운드와 인수 검증

## Status: in_progress

## Goal
임시 도형을 새로 제작한 일관된 도트 캐릭터·적·숲·UI로 교체하고, 직접 만든 효과음과 사용 허가가 확인된 배경음을 더해 첫 일반 스테이지를 시작부터 보스 클리어까지 완성한다.

## Decision Summary
- 독립 `C:/DuringDex/dev_games/pixel-action`의 T01~T03 완료가 선행된다. 조작 A/D, Space, 마우스 360도 좌클릭 단발 공격, Shift 구르기, E 공중 내려베기; 화면 속 주인공은 작고 숲을 넓게 보여준다. 사용자 실플레이 피드백으로 콤보와 공격 방향 고정을 제거한다.
- 숲/폐허의 고딕 잔혹 동화, 낡은 망토 떠돌이 검사, 나무 병사·숲 망령·멧돼지와 거대한 타락 고목 수호자. **배경·발판·이펙트·UI까지 도트 스타일**, 픽셀 밀도 일관; 각 캐릭터의 원본 픽셀 크기는 자유다.
- 사용자 요청: 이미지 생성과 후처리로 새 소재 제작, 효과음은 직접 제작, 배경음은 사용 조건이 명확한 무료 음원. 인게임 스토리/튜토리얼, 온라인·하드 모드·백업은 첫 버전 밖이다.

## Implementation

### I01. 원본 도트 캐릭터와 배경·효과 제작
- Related Files:
  - `public/assets/characters/hero/` — 신규 주인공 8방향 검 공격·이동/점프/피격/사망/롤/내려베기 도트 시트; new
  - `public/assets/characters/{soldier,wisp,boar,boss}/` — 새 적/보스 시트; new
  - `public/assets/world/forest/`, `public/assets/ui/`, `public/assets/effects/` — 새 숲 배경, 발판/구덩이 타일, HUD/menu, 타격/회복 효과; new
  - `src/game/assets/manifest.js` :: 파일·프레임·기준점 선언; new
  - `docs/asset-provenance.md` — 프롬프트·생성 방식·출처·라이선스; new

#### Details
- 래스터 이미지는 `imagegen` 스킬(`C:/Users/USER/.codex/skills/.system/imagegen/SKILL.md`)과 사용 가능한 기본 이미지 생성 도구를 사용한다. 고딕 잔혹 동화, 낮은 해상도의 선명한 도트, 제한된 통일 팔레트, 낡은 망토 검사·숲, 투명 배경 캐릭터, 프레임 경계/일정 기준점, 텍스트·워터마크 없음 등을 구체적으로 프롬프트한다. 각 신규 대상은 별도 생성하고 후속 대상에는 승인된 로컬 결과를 스타일 참조한다. 생성 결과와 편집 대상은 시각적으로 확인한다. 기본 도구 실패 시 임의의 API/모델로 전환하지 않는다.
- 주인공은 8방향 몸체와 자유 각도 검의 동기화가 핵심이다. body 8방향 공격 포즈와 좌우 대기/걷기·점프 상승/낙하·구르기·수직 내려베기·피격·쓰러짐을 분리한다. 공격 중 포인터가 이동하면 검과 공격 범위가 현재 방향을 함께 따른다. 피격/죽음/대기, 걷기 루프와 공중 전환이 갑자기 흔들리거나 기준점이 튀지 않는지 확인한다.
- 나무 병사·망령·멧돼지는 각각 대기·걷기/이동·명확한 준비·공격·피격·쓰러짐. 멧돼지 돌진, 망령 발사체, 병사 검 범위가 예고와 실제 판정에 맞아야 한다. 보스는 대기·등장·가지 휘두르기·뿌리·내려찍기·피격·2단계 전환·쓰러짐을 제공하고 큰 몸과 무거운 동작을 유지한다. 2단계의 빨라진 예고와 범위도 실제 시뮬레이션과 일치시킨다.
- 640×360 가상 화면 기준 픽셀 격자는 통일하고 카메라 이동은 정수 위치/nearest-neighbor로 처리해 이미지가 번지거나 반 픽셀로 흔들리지 않게 한다. 주인공 스프라이트 기본 작업 치수는 32×32, 일반 적 최대 48×48, 보스 96×112 등 **초기값이며 자산/실루엣에 맞게 가변**이다. 시트는 투명 PNG의 고정 셀 또는 투명 개별 PNG와 manifest 좌표를 쓰고 애니메이션별 frame list·fps·loop·origin(발 기준)을 명시한다. 생성 이미지와 실제 충돌박스 크기는 분리한다. 배경 색과 전경 도트는 대비·원근이 읽혀야 한다.
- 숲에는 가독성 높은 고체 발판과 죽음 구덩이를 실제 collision 정의와 일치하게 표시한다. 배경은 무덤/성 등 별도 스테이지로 늘리지 않는다. title, pause, result, hearts, boss bar, settings 등 UI도 픽셀 스타일을 쓰되 텍스트는 선명한 한국어 웹 폰트/대체 글꼴을 적용한다. 남은 적 숫자는 넣지 않는다.
- 파일 경로·프롬프트·원본/참조·생성 도구·프레임/원점·검수 결과를 `docs/asset-provenance.md`에 기록한다. 임시 도형을 최종 자산인 것처럼 숨기거나 기존 Knight Run 이미지를 무단으로 이 프로젝트의 완성 자산으로 참조하지 않는다. 투명 에셋에 실제 alpha가 없거나, 프레임이 섞이거나, 대상 동작이 빠지면 재생성·수정 후 재검수한다. 제작 수단이 막혀 최종 요구를 충족하지 못하면 이 Task를 완료 처리하지 않고 실패와 필요한 지원을 보고한다.

### I02. 렌더러와 애니메이션 통합
- Related Files:
  - `src/game/assets/manifest.js` :: `ASSETS`, `ANIMATIONS`, `preloadAssets(loader)`, `validateAssets(textures)`; new
  - `src/game/render/PlayerView.js`, `src/game/render/EnemyView.js` — 상태→애니메이션 렌더; modify
  - `src/game/scenes/StageScene.js`, `TitleScene.js`, `SettingsScene.js`, `ResultScene.js`, `src/game/ui/menu.js`; modify
  - `test/assets.test.js`, `test/animation-contract.test.js`; new

#### Details
- `ASSETS`는 key·경로·PNG cell width/height 또는 개별 이미지와 origin을 포함하고 `ANIMATIONS`는 소유자·상태·방향·frame keys·fps·loop를 포함한 immutable manifest다. `preloadAssets`는 manifest 전부 preload하고 `validateAssets`는 runtime에서 필요한 key와 frame 존재, 양의 치수/기준점을 검사한다. 누락/디코딩 실패는 읽기 쉬운 오류와 재시도 안내를 화면에 보이며 조용한 빈 캔버스는 금지한다.
- sim 결과의 `idle/run/jump/fall/attack/roll/dive/hurt/dead`, enemy `idle/chase/windup/attack/recovery/hurt/dead`, boss `intro/phase1/transition/phase2/dead`를 각기 대응한다. 저장/물리/공격의 원본은 60Hz sim이며 애니메이션은 상태를 표시만 한다. 렌더 프레임 완료가 데미지 시점이나 boss 완료 이벤트를 독립적으로 바꾸지 않는다.
- 죽음·롤·점프·피격으로 같은 클립이 매 tick 처음부터 재시작되지 않게 상태 전환 시에만 재생; phase 전환/대기/구르기 기준점 안정, 캐릭터가 걷는 동안 떠오르지 않는지 확인. 사용자의 마우스 포인터 월드 좌표와 공격 각도, 8방향 몸 선택, 무기 판정 부채꼴이 실시간으로 맞아야 한다. pixelArt/nearest 설정을 확대·축소 전부 유지한다.
- 실제 이미지 바이트/alpha·시트 치수 및 프레임 유효성 검사, 각 상태 전환에 알맞은 animation 선택, 누락 에셋 오류 및 쿨다운 타이밍이 렌더 fps와 독립임을 테스트한다. PNG는 Node zlib/버퍼 또는 설치된 테스트 도구로 읽기 전용 검사하며, 테스트가 구현 상수만 그대로 반복하지 않게 유효하지 않은 실제 fixture도 사용한다.

### I03. 오디오와 허가 확인
- Related Files:
  - `src/game/audio/AudioManager.js` :: `unlock`, `playSfx`, `playMusic`, `setVolumes`, `dispose`; new
  - `public/assets/audio/sfx/`, `public/assets/audio/music/` — 효과음과 허가 검증된 배경음; new
  - `docs/asset-provenance.md` — 음원 제작법·라이선스·저작자·출처·원본 URL 및 확인일; modify
  - `test/audio-manager.test.js`; new

#### Details
- 발걸음·점프·검 휘두르기·명중·구르기·내려베기·피격·회복·적 사망·보스 등장/단계 변경/사망·승리 효과음을 직접 만들고 파일 또는 Web Audio 합성 파라미터로 재현 가능하게 보관한다. 공통 명세 `playSfx(id:'step'|'jump'|'swing'|'hit'|'roll'|'dive'|'hurt'|'heal'|'enemyDeath'|'bossIntro'|'bossPhase'|'bossDeath'|'victory'):void`; 과도한 중첩은 소리별 최소 재생 간격을 둔다.
- 숲과 보스 배경음 모두 제공(하나의 무료 트랙을 구간에 맞게 재사용하는 것은 가능). 1차 출처의 저작자 명시·개인/상업적 이용·수정/배포·재배포/출처 표시·라이선스 변경 여부를 실제 확인하고 필요한 attribution을 게임 내 설정 또는 문서와 에셋에 포함한다. 출처 불명, 단순 검색 결과, 이용 불가/불명 음원은 사용하지 않는다. 다운로드·저장 시 실제 파일을 프로젝트 `public/assets/audio/music/`에 포함하고 오프라인 로딩되게 한다. 적합한 음원을 확보하지 못하면 완료 처리하지 않고 문제를 보고한다.
- 브라우저 자동재생 제한을 고려해 사용자가 타이틀 시작/이어하기를 클릭하거나 키를 누른 후에만 `unlock()` 및 음악 재생을 시도한다. 음악 로드/재생 실패는 상태를 알려주고 게임은 진행 가능하게 하며, 에셋 미완료를 검증 성공으로 보고하지 않는다. pause에서는 BGM을 일시정지하고 재개 시 기존 위치에서 이어 재생, 재시작/씬 전환 때 중복 재생을 막는다. 설정 음량 music/sfx는 T03 저장값을 사용하고 0은 무음; 화면 흔들림 off는 실제 모든 카메라 shake를 끈다.
- 시뮬레이션 이벤트를 사운드에 단방향 전달하고 프레임마다 같은 효과가 재생되지 않게 event-id 또는 transition 기준을 사용한다. `dispose()`가 이벤트 listener·AudioContext/사운드 인스턴스를 정리한다. AudioContext 차단/언락·음량 0·동시성·pause/resume를 주입 fake로 테스트한다.

### I04. 실제 플레이와 전체 인수
- Related Files:
  - `.memory/phases/2026-11-07-pixel-action-first-stage/P01-first-stage/T04-art-audio-acceptance.md` :: 결과/미해결 기록; modify
  - `docs/asset-provenance.md`; modify

#### Details
- PC 16:9/작은 창에서 타이틀→설정/조작법→새 게임→3종 적→checkpoint→회복 소비→사망→모든 적 재등장·소비품 부재→종료 후 이어하기→보스 2단계→클리어→최고/최근 기록→재시작을 직접 플레이한다. 최소 1회 전체 플레이 시간을 측정하고 2~5분 목표에 맞도록 속도·적 행동·배치·체력은 **합의한 조작·규칙을 바꾸지 않는 범위**에서 조정한다. 반복해서 적이 보이지 않거나 판정이 불공정하면 이유를 기록하고 수정한다.
- 8방향 몸·검 자유 각도의 판정/시각 일치와 공격 중 방향 변경, Shift 전체 무적과 피트 즉사, 공중 일반 공격과 E 수직 내려베기, 보스 예고·잠금, 하트 3칸/피해 1/회복 1, 무음/음량·화면 흔들림·전체화면, pause/종료 중 시간 제외와 사망 누적을 실제로 확인한다. 캔버스가 비었거나 생성 에셋이 임시 도형이면 미완료다.
- 화면별 캡처와 재생성 정보, 검증에 사용한 브라우저·명령·플레이 시간·미검증 제한을 기록한다. 저작권 확인이 필요한 모든 음원·폰트는 문서와 라이선스에 추적 가능해야 한다. 구현된 적 없는 하드 모드나 온라인을 완성했다고 주장하지 않는다.

## Acceptance Criteria
- [ ] 모든 요구 동작의 최종 신규 도트 에셋과 애니메이션, 통일된 숲·발판·UI가 실제로 로드되고 화면에서 확인된다.
- [ ] 직접 만든 효과음과 이용 조건 확인된 무료 배경음이 들리고 설정과 자동재생 제약을 처리한다.
- [ ] 보스 클리어까지 한 판이 플레이 가능하며 저장·시간·사망·복원 계약을 유지한다.
- [ ] 소스·에셋·라이선스·테스트와 검증 증거를 보존하고 미구현 항목을 정직하게 기록한다.

## Validation
- `npm.cmd test` — 전체 게임·입력·적/보스·저장·이미지/사운드 테스트.
- `npm.cmd run build`; `git diff --check`.
- `npm.cmd run dev` 후 위 I04를 PC 브라우저에서 실행한다. 콘솔 오류와 asset 404, 오디오 언락, 프레임/앵커, 클리어 기록을 확인한다.
- `git status --short --branch`와 `git log --oneline -5`로 Task별 이력과 예상 외 변경을 확인한다. 커밋 전에 asset provenance/attribution을 검토한다.

## Commit Message
```text
feat(presentation): finish forest pixel art and sound

Plan: 2026-11-07-pixel-action-first-stage
Phase: P01-first-stage
Task: T04-art-audio-acceptance

- Integrate original pixel characters, forest and UI
- Add original effects, licensed music and full playthrough verification
```

## Progress
- 이미지 생성 원본과 패킹 스크립트, 숲·캐릭터·이펙트 렌더러, 13종 합성 효과음과 CC BY 4.0 배경음을 추가했다. 출처와 재생성 방법은 `docs/asset-provenance.md`에 기록했다.
- `npm.cmd test` 54개 통과, `npm.cmd run build` 통과. 작은 창·무음·볼륨·화면 흔들림 설정과 재생 실패 알림을 Chrome에서 확인했다. 빌드의 Phaser 번들 크기 경고는 남는다.
- 공격 조작 변경 후 Chrome 자동 입력으로 세 종류 적과 두 단계 보스를 모두 처치하여 127.2초, 사망 0회, 기록 저장을 확인했다. 화면은 `docs/verification/T04/`에 보존한다. T03에서는 체크포인트·소비·사망·복원 자동 입력을 별도로 검증했다. T04에서 타이틀 복귀·이어하기 반복과 사망 기록 보존을 재확인했다.
- 사용자 실플레이 피드백으로 콤보와 공격 방향 고정을 제거했다. 공격 중 새 포인터 방향을 몸·검·피해 판정에 반영하며 공격 도중 클릭은 예약하지 않는다. 배경음은 Web Audio 분석기로 0이 아닌 파형을 확인했다.
- 사용자 실플레이에서 보스 진입 시 조작 없이 타이틀로 돌아간 사례가 보고되었다. 원인은 아직 확인되지 않았다. 재로드가 발생하면 동일 탭의 저장 체크포인트로 일시정지 복구하며, 명시적 처음 화면 이동은 원래대로 유지한다. Chrome에서 중간 체크포인트·소비품·시간·사망 수 복구 및 타이틀 선택 후 재로드를 검증했다. 작업 중 개발 서버 자동 갱신이 개입했을 가능성도 있으나 확인되지 않았다.
- 사용자 재확인에서는 타이틀 복귀가 재발하지 않았다. 보스 등장 중 캐릭터가 멈추는 조작감을 지적해 등장 연출 90틱 동안에도 이동·점프를 허용했다. Chrome 키보드 입력과 시뮬레이션 테스트로 확인했다.
- 등장 시 보스가 화면 밖에 있어 연출을 알아보기 어렵다는 사용자 의견을 반영했다. 카메라가 플레이어와 보스를 함께 비추고 화면에 '숲의 수호자 등장'을 표시한다. 이동을 유지한 Chrome 화면은 `docs/verification/T04/boss-intro.png`에 기록했다.
- 사용자 요청으로 내려찍기 착지 판정을 기존 48×24에서 62×31로 확대하고 일반 공격 부채꼴과 착지 사각형 표시를 칼날바람·확산 충격파로 교체했다. 칼날바람은 조준 및 지형에 맞고 착지 충격파는 실제 판정 크기를 기준으로 한다. Chrome 확인 화면은 `docs/verification/T04/attack-wind.png`, `dive-shockwave.png`에 기록했다.
- 확정된 전투 피드백 3항목(내려찍기 보호, 화면 밖 보스 화살표, 공격 준비 표시)을 구현·검증·커밋했다. 전체 테스트 62개와 빌드 통과, Chrome 자동 입력 완주 127.15초·사망 0회·브라우저 오류 없음. 증거는 `docs/verification/combat-feedback-2026-11-07/`에 저장했다. 첫 스테이지 진행 중 스냅샷은 `f3e0b6f`, 세 개선 커밋은 `ce4dfb0`, `ef1f3d2`, `19e390a`다.
- 미완료: 최종 버전에서 사람이 실제로 조작하는 전체 인수와 스피커/헤드폰 청취·난이도 평가. 사용자에게 실행 주소와 확인을 요청했으며, 결과 없이 이 작업을 완료로 표시하지 않는다.
- [x] 구현 완료
- [ ] 최종 수동 인수 통과
- commit: pending
