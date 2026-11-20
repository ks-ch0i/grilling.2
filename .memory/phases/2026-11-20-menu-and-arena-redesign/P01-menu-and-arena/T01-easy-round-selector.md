# Task: T01 Minimal Easy Round Selector

## Status: done

## Goal

타이틀과 이지 전투 후 팝업에서 숲·광산 탭, 스테이지별 4×2 라운드 타일, 한 번 누르면 시작하는 C 미니멀 선택기를 제공한다.

## Decision Summary

- 숲·광산 탭은 항상 접근 가능하다. 현재 탭의 8개 라운드만 표시하고, 해금·클리어·보스 정보를 텍스트로 구분한다.
- 타이틀은 숲으로 열고 전투 후에는 현재 스테이지로 연다. 기존 선택 및 뒤로 가기 동작을 유지한다.

## Implementation

### I01. 공용 패널과 선택 버튼 그룹

- Related Files:
  - `src/game/ui/challengePanel.js` :: `mountChallengePanel`, `appendChoiceSwitch`, `setPanelStage` — T01과 T02가 공유하는 팝업 및 선택 버튼; new
  - `src/game/ui/menu.js` :: `mountMenu` — `root,panel,button,focus,hide,show,remove`를 가진 기존 핸들 재사용; read-only
  - `src/styles.css` :: `.challenge-overlay`, `.challenge-panel`, `.challenge-tabs` — C 시안의 패널과 탭 스타일; modify

#### Details

- **Signatures & Types**:
  ```typescript
  type StageId = 'forest-1' | 'mine-1';
  type Choice = { value: string; label: string };
  mountChallengePanel(title: string, subtitle?: string, options?: { titleScreen?: boolean }): ReturnType<typeof mountMenu>;
  setPanelStage(panel: HTMLElement, stageId: StageId): void;
  appendChoiceSwitch(parent: HTMLElement, options: {
    label: string; choices: readonly Choice[]; value: string;
    onChange: (value: string) => void;
  }): { root: HTMLElement; setValue: (value: string) => void };
  ```
- **Data & Schema Fields**:
  - 공용 DOM 토큰: 루트 `challenge-overlay`, 패널 `challenge-panel`, 선택 그룹 `challenge-tabs`와 `role="group"` / `aria-label`, 버튼 `data-choice`와 `aria-pressed`, 패널 `data-stage-id`.
  - `titleScreen` 기본값 false. true일 때 기존 `{variant:'title',layout:'submenu'}`를 사용해 타이틀 배경을 유지한다. 기존 메뉴 핸들을 그대로 반환한다.
- **Execution Flow / Logic**:
  1. `mountMenu` 호출 후 공용 클래스 두 개만 추가한다. `setPanelStage`는 패널 속성을 갱신하며 허용 ID 외 값은 `TypeError`.
  2. 선택 버튼은 `type="button"`을 사용한다. `setValue`는 유효 값인지 검사하고 선택 상태만 동기화한다. 같은 버튼 클릭은 무시하고 변경 클릭은 속성을 갱신한 뒤 `onChange`를 한 번 호출한다. 탭 키로 각 버튼에 접근하고 Enter/Space로 활성화하는 브라우저 기본 동작을 사용한다. 전환 과정에서 그룹 버튼을 재생성하지 않는다.
  3. CSS는 파일 끝에서 `.game-overlay.challenge-overlay`, `.game-panel.challenge-panel`에 한정한다. 오버레이는 가운데 정렬, 여백 12px, 최대 높이 안에서만 스크롤되는 패널로 구성한다. 타이틀 하위 메뉴의 `position:absolute/top/right/transform`과 제목 오른쪽 정렬을 명시적으로 덮어쓰고 제목·본문을 왼쪽 정렬한다.
  4. 패널 폭 `min(560px, 100%)`, 높이 최대 100%, 가로 패딩 12–24px, 반경 10px. C 시안 기준 패널 `#171b21`, 표면 `#21262e`, 본문 `#f6f7f9`, 보조 `#b7bfca`, 구분선 `#353b44`, 숲 포인트 `#b8dcc9`, 광산 `#edd3a4`. 기존 타이틀 버튼의 `::before`, 색 및 텍스트 그림자를 공용 패널 내부에서 제거하고, 눌림 상태와 별도로 키보드 포커스 윤곽을 보여 준다. 다른 팝업에 적용하지 않는다.

### I02. 라운드 그리드와 기존 진입 연결

- Related Files:
  - `src/game/ui/easyRoundSelector.js` :: `easyRoundChoices`, `mountEasyRoundSelector` — 진행도 파생 및 스테이지별 타일; modify
  - `src/game/sim/rounds.js` :: `ROUND_COUNT`, `isBossRound` — 라운드 수와 보스 규칙의 기준; read-only
  - `src/game/scenes/TitleScene.js` :: `showEasySelector` — 타이틀이 기존 콜백으로 시작/뒤로를 처리; read-only
  - `src/game/scenes/easySession.js` :: `showEasyRoundSelector` — 현재 스테이지로 열도록 옵션 전달; modify
  - `src/styles.css` :: `.challenge-round-grid`, `.challenge-round-tile` — 4열 그리드, 상태, 포커스, 반응형; modify

#### Details

- **Signatures & Types**:
  ```typescript
  mountEasyRoundSelector(options: {
    save: SaveV4; onSelect: (stageId: StageId, round: number) => void;
    onBack: () => void; titleScreen?: boolean; initialStageId?: StageId;
  }): ReturnType<typeof mountMenu>;
  ```
- **Data & Schema Fields**:
  - 기존 `easyRoundChoices(save)`의 `{stageId,label,unlocked,rounds:[{round,unlocked}]}` 계약과 전체 v4 진행도 확인을 유지한다.
  - 타일 상태 우선순위: `!choice.unlocked → 잠금`, `best !== null → 클리어`, 나머지 `도전 가능`. 기록은 `save.easy.roundRecords[stageId][String(round)].best`. `isBossRound(stageId, round)`가 true인 타일에 별도 `보스` 레이블을 둔다.
- **Execution Flow / Logic**:
  1. 기존 콜백 및 진행도 검증을 먼저 하고 `initialStageId`(기본 숲)의 유효성을 확인한다. 잘못된 입력에 DOM을 추가하지 않는다.
  2. `이지 모드 라운드 선택` 헤더 아래 숲·광산 버튼 그룹을 둔다. 선택한 스테이지 이름과 클리어 수, `.challenge-round-grid`, 마지막 `뒤로` 버튼 순서로 구성한다.
  3. 탭 변경 때 기존 그리드의 자식만 교체한다. 숫자는 `01`–`08`, 상태를 독립 텍스트로 내보내고 접근 가능한 이름은 예를 들어 `5라운드, 보스, 잠금`. 실사용 가능한 타일만 tabbable이며 잠금 타일은 native `disabled`다. 두 스테이지 선택 버튼은 모두 활성화해 광산이 잠겨 있어도 상태를 확인할 수 있게 한다.
  4. 타일 클릭 시 기존 `handled` 플래그를 콜백 전에 설정하고 `onSelect(stageId, round)`를 한 번 호출한다. 뒤로도 같은 가드로 `onBack()`을 한 번 호출한다. 타이틀의 뒤로는 모드 선택, 전투 중 뒤로는 직전 결과 팝업으로 돌아간다. 전투 후 호출부에 `initialStageId:scene.stage.id`를 넘긴다. 팝업 열기와 탭 변경은 게임을 재개하거나 저장하지 않는다.
  5. `repeat(4,minmax(0,1fr))`로 작은 화면에서도 4열을 유지한다. 번호는 tabular 숫자를 사용하고 시안 C처럼 서브 텍스트보다 크게 표시한다. 타일 최소 높이 60px, 간격 4–8px. 폭 320px에서 `잠금`, `보스`, `도전 가능`이 잘리지 않도록 상태와 보스가 필요 시 각 줄을 쓴다. 화면 높이가 낮으면 패널 내부를 스크롤한다.

### I03. 회귀 검증 범위

- Related Files:
  - `test/easy-round-selector.test.js` :: 선택기 계약과 Fake DOM; modify
  - `test/easy-mode.test.js` :: 전투 후 뒤로, 시작 스테이지 탭, 기존 진행 기록 확인; modify
  - `test/title-menu.test.js` :: 일반 패널 및 타이틀 메뉴 뼈대; read-only

#### Details

- 이전 17개 세로 버튼 단언을 교체한다. 한 스테이지 타일 8개, 탭 2개, 뒤로 1개, 보스 5·7·8, 신규 세이브 숲 R1만 활성, 광산 탭 선택 가능/8개 잠금, 숲에서 R8 클리어 후 광산 R1 선택, 콜백 중복 방지와 패널 제거를 확인한다.
- Fake DOM에서 필요한 `classList.add`와 `replaceChildren`만 실제 DOM 규칙대로 지원한다. 기존 테스트의 버튼 텍스트 기반 조회는 상태 노드 분리 후에도 `뒤로` 등 기존 결과 팝업의 버튼을 찾을 수 있어야 한다.
- 광산 전투 후 열면 광산 버튼이 선택되고, 뒤로 가면 시뮬레이션 중지 상태를 유지한 채 결과 팝업이 복구되는지를 확인한다.

## Acceptance Criteria

- [x] 타이틀과 전투 후 진입 모두 숲·광산 탭/4×2 타일의 C 스타일이다.
- [x] 상태·보스를 글자로 식별하고 해금된 타일만 한 번에 실행되며 기존 뒤로 동작이 유지된다.
- [x] 키보드와 폭 320px 화면에서 접근할 수 있고 타이틀 메인 및 기존 결과 팝업 스타일이 보존된다.

## Validation

- `node --test test/easy-round-selector.test.js test/easy-mode.test.js test/title-menu.test.js` — 17개 통과.
- `npm.cmd run build` — Vite 빌드 성공, 기존 대형 번들 경고.
- `npm.cmd run dev` + Orca 브라우저 — 타이틀→시작→이지, 폭 320px에서 4열·2행/가로 넘침 없음, Space로 잠긴 광산 탭 열기, Enter로 숲 R1 즉시 진입을 확인했다. 별도 포트의 검증 세션에서 적을 처치한 상태를 만들어 실제 라운드 클리어 이벤트, 다음 라운드 해금, 선택기→뒤로와 일시정지 유지를 확인했다.

## Commit Message

```text
feat(menu): redesign the Easy round selector

Plan: 2026-11-20-menu-and-arena-redesign
Phase: P01-menu-and-arena
Task: T01-easy-round-selector

- Add a shared minimal panel and accessible choice groups
- Show one stage of round tiles with lock, clear, and boss states
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: see the commit that marks this blueprint done
