# Task: T01 Home Records Dashboard

## Status: done

## Goal
홈의 `기록`에서 회사 순위와 내 기록을 함께 보고, 이지에서는 8라운드의 개인 기록표를 유지하며 한 라운드씩 회사 순위를 바꿀 수 있다. 이지와 하드의 클리어 결과에서 해당 순위로 진입하고 결과로 복귀하는 기존 흐름도 유지한다.

## Decision Summary
- 넓은 화면은 회사 순위 왼쪽·내 기록 오른쪽, 좁은 화면은 내 기록 위·회사 순위 아래다. 첫 진입은 이지·숲·01라운드다.
- 개인 기록은 기존 저장을, 회사 상위 10명과 10위 밖 내 순위는 기존 조회와 렌더러를 사용한다. 결과 화면용 진입과 홈 배치를 공용 창의 진입 옵션으로 구분한다.

## Implementation

### I01. 홈 진입과 개인 기록 선택

- Related Files:
  - `src/game/ui/recordsPopup.js` :: `mountRecordsPopup`, `easyTable`, `hardCards`, `recordValue` — 홈 분기와 공용 개인 기록 렌더링; modify
  - `src/game/ui/challengePanel.js` :: `mountChallengePanel`, `setPanelStage`, `appendChoiceSwitch` — 기존 창, 스테이지 색, 선택 버튼; read-only
  - `src/game/ui/menu.js` :: `formatTicks`, `mountMenu`, `mountAccountStatus` — 시간 표기, 포커스, 정리 콜백; read-only
  - `src/game/scenes/TitleScene.js` :: `showRecords` — 홈 진입; read-only
  - `src/game/scenes/ResultScene.js` :: `openCompanyBoard` — 하드 결과 진입; read-only
  - `src/game/scenes/easySession.js` :: 결과 창의 `회사 순위 보기` — 이지 결과 진입; read-only

#### Details
- **Signatures & Types**:
  ```typescript
  type StageId = 'forest-1' | 'mine-1';
  type Mode = 'easy' | 'hard';
  type Round = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  type Challenge = { mode: 'easy'; stageId: StageId; round: Round }
    | { mode: 'hard'; stageId: StageId };
  type Result = { elapsedTicks: number; deaths: number };
  type RecordPair = { best: Result | null; recent: Result | null };
  // JSDoc 계약으로 사용한다. 기존 JavaScript 내보내기는 그대로 둔다.
  function mountRecordsPopup(options: {
    save: Save; onBack: () => void; store?: RecordsStore | null;
    initialChallenge?: Challenge | null; titleScreen?: boolean;
  }): ReturnType<typeof mountChallengePanel>;
  ```
- **Data & Schema Fields**:
  - `Save.easy.roundRecords[stageId][String(round)]` 및 `Save.records[stageId]`에서 `RecordPair`를 읽는다. `null`과 실제 0값을 구분하고, `formatTicks(elapsedTicks)` 및 같은 결과의 사망 수를 함께 렌더링한다. 저장 데이터는 읽기 전용이다.
  - 홈 창 로컬 상태는 `mode='easy'`, `stageId='forest-1'`, `selectedRound=1`로 초기화한다. 같은 창에서 스테이지나 모드를 바꿔도 선택 라운드 번호는 보존하고, 하드 조회에는 라운드를 전송하지 않는다. 창을 닫고 다시 열면 기본값으로 시작한다.
- **Execution Flow / Logic**:
  1. 기존 `onBack` 함수 유효성 검사를 유지한다. `titleScreen === true`이고 `initialChallenge === null`인 진입에 홈 전용 구성을 적용한다. 기존 `showBoard`, `기록으로`, `뒤로`를 사용하는 결과 진입은 기존 분기에 둔다. 하드 결과는 `{ mode:'hard', stageId }`, 이지 결과는 `{ mode:'easy', stageId, round }`를 그대로 전달한다.
  2. 홈은 `mountChallengePanel('기록','',{titleScreen:true})`의 창을 사용한다. 공통 이지·하드 및 숲·광산 버튼 그룹을 위에 두고 `setPanelStage`로 색을 적용한다. 홈에만 `challenge-records-home` 클래스를 추가한다. `challenge-records-layout`의 DOM에는 `challenge-records-personal`을 먼저, `challenge-records-company`를 나중에 넣는다. 두 구역에 각각 `내 기록`, `회사 순위` 제목을 표시한다. 기존 메뉴와 알림 정리 방식 및 홈 복귀 콜백을 사용한다.
  3. 이지는 기존 `easyTable`의 라운드와 최고·최근 열만 표시한다. 홈 라운드 번호는 `type=button`인 실제 버튼이며 접근 가능한 이름은 `01라운드 회사 순위` 형식으로 지정한다. 선택 버튼에 `aria-pressed="true"`를 설정하고, 행에 선택 표시를 적용해 색 없이도 선택을 알 수 있게 한다. 보스 표시는 기존 `isBossRound`를 사용한다. 홈에서 개인 기록이 비어 있어도 라운드 버튼은 동작한다. 하드는 기존 두 카드를 재사용한다. 기존 결과 경로가 사용하는 `보기` 열·카드 버튼의 동작은 보존한다.
  4. 모드·스테이지를 바꾸면 개인 기록을 바꾸고 해당 순위를 조회한다. 이지 라운드 버튼을 누르면 선택 표시와 회사 제목·목록만 갱신한다. 표와 버튼 요소를 제거하지 않아 포커스와 스크롤이 유지된다. 같은 선택을 다시 누르면 재조회하지 않는다. 전체 창 포커스 설정은 첫 진입에만 한다.
  5. `뒤로`는 `menu.remove()` 뒤 `onBack()`을 한 번 호출한다. 프로그램에서 창을 제거하면 순위 정리 콜백만 실행한다.

### I02. 회사 순위 조회와 응답 순서

- Related Files:
  - `src/game/ui/recordsPopup.js` :: 홈 회사 순위 전환과 정리; modify
  - `src/game/ui/companyLeaderboard.js` :: `mountCompanyLeaderboard`, `renderBoard` — 조회 지연, 정리, 상태·표 표시; read-only
  - `src/game/storage/appStore.js`, `src/game/storage/cloudSaveClient.js` :: `syncNow`, `getLeaderboard` — 기존 동기화·캐시; read-only
  - `api/src/leaderboard/service.js` :: `rankBoard` — 서버의 상위 행과 내 기록 계약; read-only

#### Details
- **Signatures & Types**:
  ```typescript
  type BoardEntry = Result & { rank: number; displayName: string };
  type CompanyBoard = { totalParticipants: number; entries: BoardEntry[];
    me: BoardEntry | null; stale: boolean; boardId: string };
  type RecordsStore = {
    getLeaderboard?: (challenge: Challenge) => Promise<CompanyBoard>;
    syncNow?: () => Promise<unknown>;
  };
  // 기존 mountCompanyLeaderboard({parent, challenge, getLeaderboard})는
  // {element: HTMLElement, remove(): void}를 반환한다.
  ```
- **Data & Schema Fields**: `entries`는 기존 최대 10개 행이다. `me.rank > 10`일 때 렌더러가 같은 표 아래에 내 행을 추가한다. 순위 비교는 클리어 시간, 다음으로 사망 횟수의 오름차순이다. 회사 이름은 기존 표시 이름을 사용한다.
- **Execution Flow / Logic**:
  1. 홈 회사 구역에 현재 조건 안내를 표시한다. 예시는 `숲 · 이지 · 01라운드`, `광산 · 하드`다. `store.getLeaderboard`가 없는 로컬 실행에서는 같은 영역에 `회사 순위를 사용할 수 없습니다.`를 표시한다. 내 기록은 즉시 표시한다.
  2. 회사 구역에 현재 조건의 렌더러 하나만 마운트한다. 이지는 `{ mode, stageId, round:selectedRound }`, 하드는 `{ mode, stageId }`를 전달한다. 새 조건으로 이동하기 전에 이전 렌더러를 제거해 기존 140ms 타이머를 취소한다. 창 제거 시에도 같은 정리를 실행한다.
  3. 순위 조회 콜백의 첫 단계는 기존 `await store.syncNow?.()`다. 각 마운트에 고유한 요청 세대 번호를 캡처해 대기 종료 시점에 현재 세대와 다르면 GET을 시작하지 않는다. 이때의 콜백 종료는 제거된 렌더러가 흡수하므로 사용자에게 오류가 표시되지 않는다. 이미 시작한 GET의 응답이나 오류는 렌더러의 `disposed` 검사로 무시한다. 재시도는 같은 조건의 렌더러 안에서 실행한다.
  4. 조회 중·빈 결과·저장된 순위 안내·오류와 재시도는 회사 구역 안에만 나타난다. 오른쪽 표와 하드 카드는 회사 조회 생명주기와 독립적으로 렌더링한다.

### I03. 홈 전용 스타일

- Related Files:
  - `src/styles.css` :: `.game-panel.challenge-panel.challenge-records-home`, `.challenge-records-layout`, `.challenge-record-round-choice` — 넓은 창, 간격, 선택·포커스; modify

#### Details
- 홈 창 폭은 `min(960px, 100%)`로 지정한다. 기존 창의 높이 제한과 스크롤을 유지한다. 스타일은 기존 회사 순위 스타일 뒤에 두고 홈 전용 클래스로 묶는다.
- 넓은 화면에는 `grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)`, 간격 16px, 회사·개인 순서의 이름 있는 그리드 영역을 쓴다. 너비 760px 이하에는 한 열로 바꾸고 DOM 순서대로 개인·회사를 쌓는다. 탭, 표, 구역에 최소 너비 때문에 가로로 밀리는 내용이 없어야 한다. 이름은 표 안에서 줄바꿈하고 숫자는 기존 자리폭을 유지한다. 너비 420px 이하는 기존 표 간격 축소 규칙도 재사용한다.
- 기존 `--challenge-surface`, `--challenge-line`, `--challenge-muted`, `--challenge-accent`를 사용한다. 어두운 바탕에 영역 제목, 여백, 가는 구분선을 쓰고 화려한 장식을 추가하지 않는다. 라운드 버튼은 다른 일반 버튼처럼 전체 행을 덮지 않게 지정하고, 선택 상태와 `:focus-visible`을 구분한다. 기존 공유 CSS에 있는 개인 표 마지막 열의 72px/56px 제한은 지금의 회사 순위 버튼을 위한 값이므로 홈의 최고·최근 두 셀에만 균형 잡힌 폭을 덮어쓴다.

### I04. 집중 회귀 검증

- Related Files:
  - `test/records-popup.test.js` :: 개인 표·카드, 회사 조회 선택, 생명주기, 결과 복귀; modify
  - `test/easy-mode.test.js`, `test/easy-round-selector.test.js` :: 인접 결과·선택 회귀; read-only

#### Details
- 기존 fake DOM을 사용한다. 테스트 계층에서 클래스나 `aria-label`로 개인 표와 회사 표를 각각 찾는다. `mountMenu.focus()`가 사용하는 현재 셀렉터 `button:not(:disabled):not(.account-sign-out),input`도 fake DOM에서 지원한다. 비동기 테스트는 테스트 바디와 teardown이 끝날 때까지 각 테스트의 `globalThis.document`를 유지하고, 실제 요청 대신 스토어 스텁과 제어 가능한 Promise 또는 Node 모의 타이머를 사용한다.
- 홈 첫 호출의 인자가 이지·숲·01인지, 모드·스테이지 선택이 일치하는지 확인한다. 빈 라운드의 버튼도 동작하고 행 선택 뒤 개인 표와 버튼이 같은 요소로 남는지 확인한다. 하드 요청에는 `round`가 없고 최초 홈 재진입은 기본값으로 돌아온다. 기록의 시간과 사망 수, 0값, 빈 기록, 보스 표기와 저장 데이터 보존을 검사한다.
- 05라운드 응답을 지연한 채 07라운드 선택 후 먼저 완료하고 나서 05 응답을 완료한다. 07 제목과 순위가 그대로인지 확인한다. 동기화 대기 중 선택 변경·닫기 뒤 오래된 조건의 GET이 시작되지 않는 경우도 확인한다. 성공·빈 순위·오래된 값·실패 후 같은 조건 재시도를 스텁으로 확인하고, 모두 내 기록에 영향을 주지 않는지 검사한다. 11위 내 기록은 회사 영역에만 표시한다.
- 이지와 하드 각각 `titleScreen:false`, `initialChallenge`를 전달해 즉시 올바른 순위를 조회하는지 확인한다. 결과용 `기록으로` 이후의 기존 뒤로 콜백을 확인한다. 홈 버튼과 창 제거도 각각 검증한다.
- 브라우저에서 1280×800, 760px, 390×844를 확인한다. 홈 진입, 숫자 버튼 Tab/Enter, 긴 회사 표시 이름, 순위 10명과 별도 내 행, 빈 기록, 오류 상태를 로컬에서 확인한다. 회사 데이터가 연결되지 않은 로컬 환경이면 개인 기록과 안내를 실화면에서 확인하고, 회사 응답·전환은 스텁 검증과 구분해 적는다.

## Acceptance Criteria
- [x] 홈 첫 진입에 왼쪽 회사 순위와 오른쪽 내 기록이 열리고 기본값은 이지·숲·01라운드다.
- [x] 이지 라운드 변경 시 내 8행 표와 키보드 포커스가 유지되며 회사 순위 제목·목록만 바뀐다.
- [x] 하드는 선택한 스테이지의 순위와 개인 최고·최근 카드가 맞고, 결과 화면의 이지·하드 순위 진입과 복귀가 기존과 같다.
- [x] 좁은 화면에서 내 기록이 위에 표시되고 두 영역에 가로 스크롤이 생기지 않는다.
- [x] 이전 조회가 늦게 응답해도 현재 순위를 덮지 않으며, 조회가 실패해도 개인 기록은 사용할 수 있다.

## Validation
- `node --test test/records-popup.test.js test/easy-mode.test.js test/easy-round-selector.test.js` — 홈과 기존 결과·선택 경로의 집중 검증이 통과한다.
- `npm run build` — Vite 프로덕션 빌드가 완료된다.
- `npm run dev` — 로컬 홈에서 I04의 화면 폭과 조작을 확인한다.
- `git diff --check` — 공백 오류가 없다.

### 실행 결과
- `test/records-popup.test.js` 단독 실행은 8개 모두 통과했다. 홈 레이아웃, 8라운드 유지, 낡은 동기화 대기 중 GET 방지, 11위 내 순위 표시, 이지·하드 결과 진입과 복귀를 확인했다.
- 지정한 세 테스트 파일을 함께 실행하면 기록 창 관련 테스트는 통과하지만, `test/easy-mode.test.js`와 `test/easy-round-selector.test.js`에서 8개가 `Invalid Easy progress`로 실패했다. 원인은 기존 `src/game/ui/easyRoundSelector.js`의 `validEasyProgress`가 `save.version === 6`만 받으면서 현재 `freshSave()`는 version 7을 반환하는 불일치다. 이 검증기는 이번 Task에서 read-only였으므로 수정하지 않았다.
- `npm run build` 통과. Phaser 청크가 500 kB 권고를 넘는 기존 크기 경고가 출력됐다.
- Orca 브라우저에서 홈 기록을 1280×800, 760×800, 390×844로 확인했다. 데스크톱 좌우, 좁은 화면 상하 순서와 07라운드 선택 후 버튼 포커스 유지, 가로 넘침이 없음을 확인했다.

## Commit Message
```text
feat(ui): show company rankings beside personal records

Plan: 2026-11-24-home-records-layout
Phase: P01-home-records-layout
Task: T01-home-records-dashboard

- Compare home records and the selected company ranking in one view
- Keep result-screen entry and return behavior and cover ranked view transitions
```

## Progress
- [x] 구현 완료
- [x] 기록 창 회귀 검증, 빌드, 브라우저 크기 확인 완료
- commit: pending
