# Task: T02 화면 밖 보스 방향 표시

## Status: done

## Goal
보스 등장 연출이 끝나 플레이어 추적 카메라로 돌아가도, 보스가 화면 밖에 있으면 어느 쪽에 있는지 화면 가장자리 화살표로 알린다.

## Decision Summary
- 확정된 `.memory/decisions/2026-11-07-combat-feedback.md` D03: 보스전에는 플레이어 추적 카메라와 화면 밖 보스 방향 화살표를 사용하고 보스가 보이면 숨긴다. 기존 등장 연출의 두 대상 카메라와 메시지는 유지한다.
- 게임 내부 화면은 640×360이고 보스는 `x,y,w,h` 월드 좌표다. `StageScene.renderWorld`는 intro 외에 플레이어 중심+방향 60px로 카메라를 부드럽게 이동한다.
- 이 Task 착수 시 기존 T04 수정 및 자산이 미커밋일 수 있다. `git status --short`와 `git diff`로 기준을 확인하고 기존 변경을 보존하며 이 Task의 변경만 분리한다. 분리 불가능하면 미커밋 상태와 이유를 보고한다. T01 완료 여부는 이 기능의 로직에 영향이 없다.

## Implementation

### I01. 화면 기준 판정과 화살표
- Related Files:
  - `src/game/render/bossDirection.js` :: `bossDirection` — Phaser 없는 화면 밖 판정; new
  - `src/game/scenes/StageScene.js` :: `create`, `renderWorld`, shutdown — 화면 고정 화살표 렌더; modify
  - `src/game/sim/boss.js` :: `createBoss`, `stepBoss` — 상태 확인; read-only

#### Details
- **Signatures & Types**:
  ```typescript
  type Boss = { x: number; y: number; w: number; h: number; state: string };
  type Viewport = { scrollX: number; width: number };
  function bossDirection(boss: Boss, viewport: Viewport): 'left' | 'right' | null;
  ```
- **Data & Schema Fields**: 화면 표시 전용 `bossDirection` graphics 객체 하나, 씬 생성 시 초기화하고 `setScrollFactor(0).setDepth(11)` 적용. 저장·시뮬레이션 데이터는 변경하지 않는다. 판정은 보스 사각형 `[x,x+w]`와 화면 월드 구간 `[scrollX,scrollX+width]`를 비교한다.
- **Execution Flow / Logic**:
  1. `boss.state`가 `dormant` 또는 `dead`면 null. `intro`, `windup`, `attack`, `recovery`, `transition`, `dying`에서는 실제 화면 기준으로 판단한다. 보스의 오른쪽 끝이 화면 왼쪽 경계 이하이면 left, 보스의 왼쪽 끝이 화면 오른쪽 경계 이상이면 right; 조금이라도 보이면 null이다.
  2. `renderWorld`에서 기존 카메라 `scrollX` 갱신 후 `bossDirection(boss,{scrollX:cam.scrollX,width:640})`을 호출한다. 보스가 오른쪽이면 화면 x=626, 왼쪽이면 x=14에 10×12px 크기의 해당 방향 삼각형을 밝은 금색 `0xffdf9e`, 어두운 외곽 `0x392a29`로 그린다. y는 `clamp(round(boss.y+boss.h/2-cam.scrollY),72,280)`로 정해 HUD 및 화면 밖을 피한다. null이면 graphics를 비운다.
  3. 객체는 월드 좌표에 끌려가지 않아야 하고 새 씬 시작이나 종료 시 중복되지 않아야 한다. 기존 카메라 target, 스크롤 보간, zoom, 등장 메시지, 보스 HP 바, 보스 조작/피해/상태는 변경하지 않는다.
  4. 예외/경계: 화면 경계에 정확히 맞닿아 면적이 0이면 화면 밖으로 간주한다. `run.outcome` 또는 새 씬 전환 중 낡은 화살표가 남지 않게 한다. 640×360 가상 좌표를 사용하므로 CSS 확대 크기와 무관하다.

### I02. 판정 및 화면 검증
- Related Files:
  - `test/boss-direction.test.js` :: `bossDirection` 테스트; new
#### Details
- 왼쪽·오른쪽·일부만 보임·완전 보임·정확히 경계·스크롤 이동·dormant/dead·transition/dying을 표로 검증한다. 순수 함수 테스트는 Phaser나 브라우저 없이 실행된다.
- 브라우저에서 기존 intro 중 보스와 플레이어가 나타나는지, intro 후 움직이지 않을 때 오른쪽 화살표가 나오는지, 보스 쪽으로 이동해 일부가 보이면 사라지는지 확인한다. 반대 방향은 순수 테스트 또는 좌우 반대 장면으로 확인한다. 콘솔 오류와 HUD 겹침도 확인한다.

## Acceptance Criteria
- [x] 보스가 화면 밖에 있을 때만 정확한 좌우 방향 화살표가 화면 가장자리에 표시된다.
- [x] 등장 연출, 플레이어 추적, 조작 및 보스 HP 표시는 유지된다.
- [x] 화면 스크롤과 씬 전환 뒤 화살표가 엉뚱한 위치에 남지 않는다.

## Validation
- `node --test test/boss-direction.test.js test/stage-lifecycle.test.js` — 좌표 경계 및 보스 상태 회귀 통과.
- `npm.cmd test` — 전체 테스트 통과.
- `npm.cmd run build` — Vite 빌드 성공.
- `git diff --check` — 공백 오류 없음. 브라우저 확인 방법과 자동/사람 조작 여부를 기록한다.

## Commit Message
```text
feat(ui): indicate offscreen boss direction

Plan: 2026-11-07-combat-feedback
Phase: P01-combat-feedback
Task: T02-boss-direction

- Show an edge arrow when the boss leaves the viewport
- Preserve the boss introduction and player-follow camera
```

## Progress
- [x] 구현 완료
- [x] 검증 통과: 전체 테스트 57개, 빌드, Chrome에서 테스트 상태를 설정해 등장 중 표시 없음·화면 밖 표시·재진입 시 숨김 확인. 브라우저 오류 없음.
- commit: ef1f3d2
