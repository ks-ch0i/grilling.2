# Task: T04 보스 공격 시각 인수 확인

## Status: pending

## Goal
모든 보스 변경의 자동 회귀와 플레이 화면을 확인해 위험 표시가 실제 판정·회피 타이밍과 일치하는지 기록한다.

## Decision Summary
- 구현 중에는 자동 테스트와 빌드를 실행한다. 마지막으로 개발용 라운드 선택에서 숲 수호자, 채굴 기계, 거대 벌레를 직접 플레이한다.
- 기존 공격은 기존 시간·범위·피해를 유지한다. 광물 공격은 60틱 준비, 5~7개, 60틱 비행이며 한 광물은 한 번만 피해를 준다.

## Implementation

### I01. 자동 회귀 검사와 회귀 기록
- Related Files:
  - `test/boss.test.js` — 숲 공격 주기·페이즈 시간; read-only unless a regression is found
  - `test/mine-boss.test.js` — mine boss 공격 선택, 광물 피해, 저장 복구; read-only unless a regression is found
  - `test/assets.test.js`, `test/animation-contract.test.js`, `test/audio-manager.test.js` — 포즈·효과음 계약; read-only unless a regression is found
  - `.memory/phases/2026-11-08-boss-attack-clarity/P01-boss-presentation/phase.md` — 완료 상태와 관찰; modify

#### Details
- **Execution Flow / Logic**:
  1. `npm test`를 실행해 전체 Node 테스트를 통과시킨다. 광물 수·seed·직격/착탄 중복·hazard snapshot, mine boss selector, phase/audio 매핑의 실패를 확인한다.
  2. `npm run build`를 실행한다. 프레임 수·잘못된 클립·누락 에셋으로 인한 Vite 또는 texture 준비 실패가 없어야 한다.
  3. 실패가 있으면 원인이 된 T01–T03 task의 구현을 수정하고 그 Task의 검증을 다시 실행한다. 이 Task에서 새 공격 규칙이나 시각 규칙을 임의로 바꾸지 않는다.

### I02. 브라우저 수동 플레이
- Related Files:
  - `src/game/dev/roundSelector.js` :: `createPracticeRun`, `isRoundSelectorEnabled` — 개발용 시작점; read-only
  - `src/game/scenes/TitleScene.js` — 라운드 선택 메뉴; read-only
  - `docs/round-selector.md` — 로컬 보스 시작 방법; read-only
  - `.memory/phases/2026-11-08-boss-attack-clarity/P01-boss-presentation/phase.md` — 브라우저 관찰·미확인 사항; modify

#### Details
- **Execution Flow / Logic**:
  1. `npm run dev -- --host 127.0.0.1`로 로컬 게임을 연다. 개발용 선택 메뉴에서 숲 보스, 기계 보스, 벌레 보스를 각각 시작한다. T04가 라운드 메뉴 이름을 바꿨으면 `docs/round-selector.md`의 현재 레이블을 사용한다.
  2. 숲에서 가지 휘두르기, 뿌리, 내려찍기, 페이즈 전환을 보고 예고와 피해 구역이 일치하는지 확인한다. 페이즈 전환 중 계속 움직일 수 있고 짧은 포효가 한 번만 나는지 확인한다.
  3. 기계에서 가까운 거리의 반복 드릴 돌진, 원거리 충격파·낙석·광물 분출을 확인한다. 드릴 휘두르기가 나타나지 않아야 한다. 광물 공격은 붉은 준비 신호 후 발사되고, 광물 5~7개가 무작위 간격으로 플레이어 주변을 향해 1초간 날아야 한다. 짧은 점프와 긴 점프의 기존 충격파 회피 차이를 확인한다.
  4. 웜에서 산성 발사·웅덩이, 땅속 흔적·별도 돌출 예고, 꼬리 휘두르기, 2페이즈 기어 돌진을 확인한다. 전환 중 맵이 어두워져도 플레이어와 보스가 보이고 플레이어가 움직일 수 있어야 한다.
  5. 광물 하나에 공중에서 맞으면 그 광물이 사라지고, 같은 광물이 착탄으로 다시 맞히지 않아야 한다. 피하지 않았을 때 착탄 효과와 피해는 순간 발생하고 위험 영역이 남지 않아야 한다. 가능한 경우 피해 전후의 하트와 기존 45틱 무적 시간을 확인한다.
  6. 각 보스 화면을 캡처하거나 관찰 기록을 phase progress에 남긴다. 사람이 직접 확인하지 못한 경우 자동 통과와 구분해 `미확인`으로 적는다. 게임 플레이가 끝난 뒤 개발 서버를 종료한다.
- **Error & Exception Handling**: 게임이 타이틀로 예기치 않게 돌아가거나 콘솔 오류가 발생하면 해당 증거와 발생 재현 단계를 기록하고 이 Task를 완료로 표시하지 않는다. 이번 계획은 과거 타이틀 복귀 원인 조사 범위를 새로 열지 않는다.

## Acceptance Criteria
- [ ] `npm test` 전체 통과.
- [ ] `npm run build` 통과.
- [ ] 세 보스의 공격별 예고·실제 피해 영역·회피 타이밍을 브라우저에서 확인하고 관찰을 기록한다.
- [ ] 기계의 근접 반복 드릴 돌진, 원거리 3종 선택, 광물 1회 피해, 벌레 전환 중 이동·소등·포효를 확인한다.
- [ ] 자동 검사와 사람의 직접 화면 확인 여부를 구분해 완료 상태를 기록한다.

## Validation
- `npm test` — 프로젝트의 모든 `test/*.test.js` 통과.
- `npm run build` — Vite production build 통과.
- `npm run dev -- --host 127.0.0.1` — 세 보스 라운드 선택 및 위 수동 검증 완료.

## Commit Message
```text
test(boss): verify attack clarity and player response

Plan: 2026-11-08-boss-attack-clarity
Phase: P01-boss-presentation
Task: T04-boss-visual-acceptance

- Verify boss attack cues against gameplay hit regions
- Record automatic and hands-on acceptance evidence
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
