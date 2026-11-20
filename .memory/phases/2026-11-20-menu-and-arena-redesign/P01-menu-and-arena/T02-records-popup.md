# Task: T02 Minimal Records Popup

## Status: done

## Goal

타이틀의 기록을 모드·스테이지 탭과 두 가지 기록 뷰로 바꿔, 한 스테이지의 최고·최근 성적을 한 화면에서 비교하게 한다.

## Decision Summary

- 이지/하드와 숲/광산을 독립적으로 전환한다. 이지는 8라운드 표, 하드는 스테이지 카드 2개이며 T01의 C 스타일을 공유한다.
- 실제 저장된 기록을 읽어서 표시하고 새 기록 집계나 저장은 추가하지 않는다.

## Implementation

### I01. 읽기 전용 기록 패널

- Related Files:
  - `src/game/ui/recordsPopup.js` :: `mountRecordsPopup` — 모드·스테이지별 기록 콘텐츠; new
  - `src/game/scenes/TitleScene.js` :: `showRecords` — 인라인 나열을 공용 UI 호출로 교체; modify
  - `src/game/ui/challengePanel.js` :: `mountChallengePanel`, `appendChoiceSwitch`, `setPanelStage` — T01의 패널/버튼 그룹 사용; read-only
  - `src/game/ui/menu.js` :: `formatTicks` — 기존 60틱/초 기준 MM:SS 표시; read-only
  - `src/game/storage/saveStore.js` :: `freshSave`, `recordEasyRoundCompletion`, `recordCompletion` — 기존 기록 형식의 출처; read-only
  - `src/game/sim/rounds.js` :: `ROUND_COUNT`, `isBossRound` — 8라운드 표와 보스 표시의 기준; read-only
  - `src/styles.css` :: `.challenge-records`, `.challenge-record-table`, `.challenge-record-cards` — 기록 전용 스타일; modify

#### Details

- **Signatures & Types**:
  ```typescript
  type RecordsMode = 'easy' | 'hard';
  type StageId = 'forest-1' | 'mine-1';
  type Result = { elapsedTicks: number; deaths: number };
  type RecordPair = { best: Result | null; recent: Result | null };
  mountRecordsPopup(options: {
    save: { records: Record<StageId, RecordPair>; easy: { roundRecords: Record<StageId, Record<string, RecordPair>> }};
    onBack: () => void;
  }): ReturnType<typeof mountMenu>;
  ```
- **Data & Schema Fields**:
  - `records[stageId]`는 하드, `easy.roundRecords[stageId][String(round)]`는 이지다. 각 항목은 `{elapsedTicks,deaths}`의 짝을 보존한다. 별도의 `totalDeaths`나 현재 하드 런의 사망 수를 가져와 덮어쓰지 않는다.
  - 열 때 기본 모드는 이지, 스테이지는 숲. 전환 상태는 현재 팝업 인스턴스에만 둔다. 광산이 잠긴 저장에서도 광산 기록 화면을 열 수 있다.
- **Execution Flow / Logic**:
  1. 저장소가 검증한 스냅샷을 입력으로 받는다. `onBack` 함수가 없으면 `TypeError`. 화면 데이터는 읽기 전용으로 사용하고 검증 로직을 복제하지 않는다.
  2. `mountChallengePanel('기록','',{titleScreen:true})`로 열고 패널에 `challenge-records`를 붙인다. 모드 그룹(이지, 하드) + 스테이지 그룹(숲, 광산) + 내용 영역 + 뒤로 버튼을 고정 순서로 배치한다. `appendChoiceSwitch(parent,{label,choices,value,onChange})`는 모드/스테이지를 변경할 때 각각 그 값만 갱신하며 탭 포커스를 보존한다. `setPanelStage(panel,stageId)`로 색을 바꾸고 내용만 교체한다.
  3. 이지에서는 접근 가능한 이름이 있는 실제 `table`을 사용한다. `thead`에 `라운드 / 최고 기록 / 최근 기록`, `tbody`에 01–08행, 행 헤더 `scope="row"`. 보스는 `isBossRound`로 판별하고 텍스트로 식별한다. 한 셀에 `formatTicks(elapsedTicks)`와 `사망 N회`를 표시한다. null은 `—`와 `기록 없음` 접근 이름을 사용하며 0틱, 0회는 실제 값으로 표시한다.
  4. 하드는 `최고 기록`, `최근 기록` 카드 2개를 보인다. 값은 같은 표시 함수를 사용하고 null이면 카드 안에서 `기록 없음`을 명시한다. 두 카드에 선택된 스테이지의 기록만 표시한다. 기록 텍스트는 DOM 노드와 `textContent`로 만들고 저장값으로 HTML을 조립하지 않는다.
  5. `TitleScene.showRecords()`는 기존 메뉴를 제거하고 `this.menu=mountRecordsPopup({save:this.store.getSave(),onBack:()=>this.showMain()})`으로 교체한다. 이 호출에서만 쓰였던 `formatTicks` 직접 임포트를 제거한다. `showMain`과 설정, 결과 팝업의 역사적 동작은 그대로 유지한다.
  6. 표는 3열에서 넘침이 없도록 시간과 사망 수를 좁은 화면에서는 위아래 줄로 감싼다. 헤더에는 열 경계와 보조 텍스트 대비를 주고 시간을 큰 tabular 숫자로 두며, 상단 버튼과 뒤로가 움직이지 않도록 내용 영역만 새로 만든다. 하드 카드 그리드 폭이 모자라면 1열로 줄인다. 320px 폭과 낮은 높이에서 가로 스크롤 없이 뒤로 버튼까지 도달할 수 있게 한다.

### I02. 기록 비교 회귀 검증

- Related Files:
  - `test/records-popup.test.js` :: 이지/하드와 숲/광산 전환, 정확한 기록 쌍, 빈 상태; new
  - `test/title-menu.test.js` :: 기존 타이틀 구조; read-only
  - `test/save-store.test.js` :: 저장·레코드 동작; read-only

#### Details

- 새 저장에서 숲 이지 8행과 각 열 빈 값, 광산 탭으로 이동 가능, 하드가 두 장의 빈 카드로 표시되는지 확인한다.
- 스테이지 및 모드마다 다른 기록을 준비한다. 이지 숲 한 라운드의 예: 최고 `{elapsedTicks:60,deaths:0}`, 최근 `{elapsedTicks:120,deaths:2}`. 하드 광산 값은 다른 두 기록을 주고 모드 전환이 선택한 광산을 보존하며 기존 콘텐츠가 사라지는지 확인한다.
- `0틱/0회`와 null의 렌더 차이, 최고/최근 기록과 사망 수 짝, 뒤로 콜백, 패널 제거 및 포커스를 확인한다. `structuredClone` 또는 동결된 입력으로 전환 전후 저장값이 그대로인지 확인한다.

## Acceptance Criteria

- [x] 화면에 선택한 모드·스테이지의 기록만 표시한다.
- [x] 이지 8행과 하드 두 카드의 최고/최근 시간 및 사망 횟수가 실제 저장과 일치한다.
- [x] 빈 값과 실제 0을 구분하고, 320px에서도 탭·표/카드·뒤로를 이용할 수 있다.
- [x] 타이틀 메인으로 복귀하고 기록 열기/탭 전환이 저장을 변경하지 않는다.

## Validation

- `node --test test/records-popup.test.js test/title-menu.test.js test/save-store.test.js` — 23개 통과.
- `npm.cmd run build` — Vite 빌드 성공, 기존 대형 번들 경고.
- `npm.cmd run dev` + Orca 브라우저 — 880px에서 빈 이지 8행과 하드 2카드, 320px에서 실제 00:00/사망 0회 및 예시 광산 기록의 최고·최근 쌍을 확인했다. Space/Enter로 탭을 전환하고 스테이지 선택 유지, 가로 넘침 없음, 뒤로 및 저장값 불변을 확인했다.

## Commit Message

```text
feat(menu): group records by mode and stage

Plan: 2026-11-20-menu-and-arena-redesign
Phase: P01-menu-and-arena
Task: T02-records-popup

- Add Easy round tables and Hard stage record cards
- Preserve paired best and recent times and death counts
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: see the commit that marks this blueprint done
