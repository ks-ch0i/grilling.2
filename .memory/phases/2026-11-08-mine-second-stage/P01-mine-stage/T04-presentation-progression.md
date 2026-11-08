# Task: T04 화면·음향·스테이지 진행 통합

## Status: pending

## Goal
숲 클리어 후 광산을 해금하고 화면과 소리가 완성된 두 스테이지를 선택·진행·이어하기·기록 확인할 수 있게 한다.

## Decision Summary
- 광산은 배경·지형·3종 적·2종 보스·수레를 기존 게임과 어울리는 새 픽셀 아트로 표현한다. 보스 예고, 3초 등장, 산성·충격파·수레 방향 경고는 실제 위험과 일치해야 한다.
- 새 광산 탐험곡과 공통 보스곡, 효과음을 추가한다. 두 보스 사이 음악을 재시작하지 않는다. 출처와 라이선스를 문서·설정에 기록한다.

## Implementation

### I01. 광산 이미지와 애니메이션
- Related Files:
  - `public/assets/source/` — 광산 원본 이미지; new
  - `public/assets/world/mine/`, `public/assets/characters/` — 포장된 광산 이미지; new
  - `scripts/pack-art.mjs` :: `specs`, backdrop/terrain output — 재현 가능한 패킹; modify
  - `src/game/assets/manifest.js`, `src/game/assets/animation.js` — asset·clip 매핑; modify
  - `test/assets.test.js`, `test/animation-contract.test.js` — 프레임·상태 매핑; modify
  - `docs/asset-provenance.md` — 원본·생성 과정·저작권; modify

#### Details
- **Data & Schema Fields**: 광산 배경 `mine-backdrop` 640×304, 지면 `mine-ground` 64×56, 발판 `mine-platform` 64×16. 시트 `golem` 48×48, `insect` 40×40, `bat` 40×40 각각 16프레임; `machine` 112×112, `worm` 128×112 각각 8프레임. `mine-cart` 48×32 단일 이미지. 모든 캐릭터 원점 `(0.5,1)`, 픽셀 최근접 축소, 동작별 hitbox는 시뮬레이션 치수 유지.
- **Execution Flow / Logic**:
  1. 작업 시 사용 가능한 `imagegen` 스킬/도구를 사용해 광산·몹·보스·수레의 신규 원본을 생성하고 결과를 실제로 검사한다. 공통 스타일은 어두운 버려진 광산, 제한된 적갈색·회색·광물 청록 팔레트, 선명한 픽셀 형태, 글자·격자·워터마크 없음. 각 시트는 셀 간 간격과 명확한 상태 자세를 요구한다. 미술 도구 사용이 불가능하면 생성했다고 쓰거나 타 출처를 임의 복사하지 말고 해당 Task를 미완료로 기록한다.
  2. 원본은 `public/assets/source/mine-*-original.png`에 보관하고 `pack-art.mjs`의 재현 가능한 규칙으로 출력한다. 셀 분리·비어 있지 않음·알파·프레임 경계를 기존 `sharp` 검증과 같은 방식으로 검증하고 필요한 경우 원본을 재생성한다. 배경은 불투명, 캐릭터·수레는 투명 배경이다.
  3. 적의 idle/chase/windup/attack/recovery/hurt/dead, 기계 intro/idle/windup/attack/dying, 벌레 intro/idle/windup/attack/transition/dying을 각 소유자별 clips로 등록한다. 상태마다 프레임을 사용하되 정확히 같은 모션을 반복해 위협 예고가 사라지지 않게 준비 프레임과 공격 프레임을 구별한다. 게임은 기존 숲 아트도 그대로 로딩한다.
  4. 실제 원본 생성 프롬프트, 사용한 참고 이미지, 최종 셀 규격 및 도구, 음원 작곡·권리 정보를 provenance에 추가한다. 원본·변환본·manifest가 누락되면 기존의 명시적인 로딩 실패 화면을 유지한다.

### I02. 화면, 경고 및 오디오
- Related Files:
  - `src/game/scenes/StageScene.js` :: `create`, `update`, `renderWorld`, `playEventSound` — 스테이지별 렌더링; modify
  - `src/game/render/EnemyView.js` :: `sync` — 적·활성 보스 표시; modify
  - `src/game/render/MineHazardView.js` :: `sync` — 수레·산성·균열·파형·낙석 표시; new
  - `src/game/audio/AudioManager.js` :: `playMusic`, `playSfx` — 곡 선택·신호; modify
  - `src/game/scenes/SettingsScene.js` 및 `docs/asset-provenance.md` — 출처 표시; modify
  - `test/audio-manager.test.js`, `test/animation-contract.test.js` — modify

#### Details
- **Signatures & Types**:
  ```ts
  type MusicName = 'forest'|'forest-boss'|'mine'|'mine-boss';
  class MineHazardView { constructor(scene:Phaser.Scene); sync(run:StageRun):void; destroy():void; }
  class AudioManager { playMusic(name:MusicName):boolean; pauseMusic():void; resumeMusic():void; }
  ```
- **Data & Schema Fields**: 실제 곡 선택 테이블은 `forest`와 `forest-boss`가 기존 `magic-forest.mp3`, `mine`과 `mine-boss`가 서로 다른 신규 곡을 가리킨다. 광산 탐험과 보스 트랙은 로컬에 저장·반복 재생 가능해야 한다. 신규 곡은 권리 명확한 자체 생성 음악 또는 사용 조건을 확인해 배포 가능한 곡을 사용하고 제목·제작자·라이선스·링크·변경 여부를 설정/문서에 표시한다. 출처가 불명확한 에셋은 사용하지 않는다.
- **Execution Flow / Logic**:
  1. `StageScene.create`는 `getStage(data.run.stageId)`를 사용한다. 배경·지면·발판을 해당 stage에 맞게 고른다. 광산 전체는 바닥, 적, 위험이 식별되는 밝기를 유지하고 플레이어 주변을 은은하게 더 밝게 한다. 시야를 가리는 검은 마스크를 두지 않는다. 카메라는 실제 월드 좌표와 일치한다.
  2. 새 `EnemyView`는 `kind`별 이미지·클립을 선택하고 현재 보스의 ID/kind가 바뀌면 이전 sprite/outline을 정리하고 새 텍스처를 만든다. HP 바는 하나만 표시하며 이름을 기계 → 벌레로 교체하고 각자의 현재/최대 HP를 사용한다. 보스 방향 화살표도 현재 보스 기준이다. 기계 등장 중 이동 가능, 벌레 등장 중 고정임을 화면 문구·모션으로 드러낸다.
  3. 수레가 생기기 60틱 전 해당 진입 방향에 보이는 화살표와 효과음을 1회 낸다. 충격파의 실제 판정과 동일한 높이/위치를 가진 시각 파형, 산성 액체와 지속 웅덩이, 바닥 균열·이동 흔적, 낙석 예고 및 위험 판정을 보여준다. 표시와 판정은 같은 시뮬레이션 데이터를 읽으며 프레임 기반으로 따로 짐작하지 않는다. 보스 드롭 물약은 별도 표시하고 소비 상태에 따라 숨긴다.
  4. 효과음은 기존 Web Audio 합성 방식에 `cartWarning`, `acid`, `machine`, `wormEmergence` 등을 추가한다. 새 음악으로 전환할 때 현재 audio src가 다르면 곡을 바꾸고 재생한다. 기존 `playMusic`은 이름만 저장하고 재생 중이면 그대로 리턴하므로 이 부분을 반드시 고친다. 동일한 `mine-boss` 요청에서는 currentTime과 재생을 끊지 않는다. 오디오 잠금·pause/resume·음량·재생 실패 알림을 유지하고 같은 곡의 중복 요청·전환 실패를 테스트한다.
  5. 모든 sprite·graphics·리스너·audio 교체 자원은 `SHUTDOWN`에서 정리한다. 기존 `StageScene`의 숲 전용 라벨·카메라·음악 분기를 선택한 stage와 현재 boss에 맞춘다.

### I03. 해금, 기록, 다음 스테이지와 확인
- Related Files:
  - `src/game/storage/saveStore.js` :: `recordCompletion` — 숲 완료 시 해금·다음 실행을 원자적으로 기록; modify
  - `src/game/storage/runCoordinator.js` :: `onClear` — stage ID별 처리; modify
  - `src/game/ui/menu.js`, `src/game/scenes/TitleScene.js`, `src/game/scenes/ResultScene.js` — 선택·결과·기록; modify
  - `test/save-store.test.js`, `test/run-coordinator.test.js`, `test/menu-state.test.js` — 데이터와 UI 의사결정; modify

#### Details
- **Signatures & Types**:
  ```ts
  function createNewRun(save:SaveV2,stageId:StageId):SaveV2;
  function menuState(save:SaveV2): {canContinue:boolean;hasRecords:boolean;unlockedStageIds:StageId[]};
  function recordCompletion(save:SaveV2,stageId:StageId,result:RecordEntry):SaveV2;
  // Scene data: {run:StageSnapshot,recovered?:boolean} 또는 {stageId:StageId,record:RecordEntry}
  ```
- **Execution Flow / Logic**:
  1. 숲 clear 이벤트는 `records['forest-1']`만 갱신하고 `mine-1`을 해금한다. 동일한 v2 저장 연산에 최대 체력·시작 위치의 새 광산 스냅샷을 `run`에 넣고 persist한 뒤 결과 화면으로 이동한다. 이후 새로고침·앱 종료·결과 화면의 처음 화면을 거쳐도 이어하기로 광산 시작이 가능하다. 광산 진입은 완료 화면의 `다음 스테이지` 버튼으로도 가능하다.
  2. `ResultScene`은 들어온 `stageId`의 기록을 표시한다. 숲에는 `다음 스테이지`와 `처음 화면`, 광산에는 `처음 화면`을 표시한다. `다음 스테이지`는 저장한 광산 run을 그대로 사용하고 중단 복구가 아닌 새 스테이지 시작이므로 조작 가능하게 시작한다. 반면 타이틀 `이어하기`는 저장된 run으로 일시정지 상태에서 시작한다.
  3. 제목의 `시작`은 해금된 스테이지 목록을 표시한다. 플레이어가 선택한 stage ID가 해금 목록에 없으면 시작하지 않는다. 다른 스테이지의 run이 있으면 진행 교체 확인을 요구하고 취소는 현재 run을 그대로 둔다. 같은 스테이지를 새로 시작할 때도 진행이 존재하면 기존의 새 도전 확인을 유지한다. 확인 후 `createNewRun`은 해당 stage의 새 스냅샷만 교체하며 해금·양쪽 기록·설정을 보존한다.
  4. 기록 화면에는 숲/광산 각각 best·recent 시간과 해당 사망 횟수를 보여주고 합산은 표시하지 않는다. 광산 클리어 후 기록 갱신 및 `run=null`; 해금·숲 기록·설정은 유지한다. 진행 저장 실패 시 기존 저장 경고와 재시도 동작을 유지하고 저장에 성공했다고 표현하지 않는다.
  5. 숲 결과의 자동 저장과 장면 종료 flush, `pagehide`, `finished`가 충돌해 광산 run을 숲으로 덮어쓰지 않는지 테스트한다. 설정·pause·제목 이동·재개에서 음악 이름과 스냅샷이 정확한 stage를 따른다.

## Acceptance Criteria
- [ ] 광산 배경·적·보스·수레·위험이 읽히며 실제 판정과 예고가 일치한다.
- [ ] 광산 탐험/보스 음악이 실제로 다르고 기계→벌레 전환에 보스 음악이 끊기지 않는다. 출처 및 설정을 확인할 수 있다.
- [ ] 숲 결과에서 광산이 해금되고 다음 스테이지 또는 종료 후 이어하기가 가능하다. 기록은 별도이며 현재 run 교체는 확인한다.
- [ ] 광산 에셋 원본과 패킹·출처, 리소스 로딩 실패·정리 동작, 기존 숲 장면을 검증한다.

## Validation
- `node scripts/pack-art.mjs` — 모든 원본에서 에셋이 오류 없이 재생성.
- `node --test test/assets.test.js test/animation-contract.test.js test/audio-manager.test.js test/save-store.test.js test/run-coordinator.test.js test/menu-state.test.js` — 신규 에셋·진행·음악 통과.
- `npm test` 및 `npm run build` — 전체 통과.
- `npm run dev` — 화면에서 숲 결과→광산 진입, 두 보스 라벨·예고·음악 전환을 실제 브라우저로 확인; 상세 증거는 T05에서 완성.

## Commit Message
```text
feat(mine): integrate stage presentation and progression

Plan: 2026-11-08-mine-second-stage
Phase: P01-mine-stage
Task: T04-presentation-progression

- Add mine artwork, visual cues and distinct music
- Unlock, select and record stages independently
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
