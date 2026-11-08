# Task: T05 전체 진행과 체감 검증

## Status: pending

## Goal
숲 클리어부터 광산의 두 보스 처치까지 저장·사망·화면·음악이 이어지는지 검증하고, 확인한 사실과 직접 플레이가 필요한 항목을 분리해 남긴다.

## Decision Summary
- 이 Task는 계획된 기능의 검증과 필요한 범위 내 수치 조정이다. 기존에 재발하지 않은 타이틀 복귀의 원인 조사나 새로운 콘텐츠 추가는 범위에 넣지 않는다.
- 목표 2~5분은 숙련된 사람의 실제 플레이 기준이다. 자동 입력 시간은 참고 자료이지 사람의 클리어 시간·조작감·청취 평가가 아니다.

## Implementation

### I01. 전체 게임 상태와 저장 경계 검사
- Related Files:
  - `test/mine-integration.test.js` :: stage progression / save roundtrip scenarios — new
  - `test/save-store.test.js`, `test/stage-lifecycle.test.js` — 회귀 사례 보강; modify if needed
  - `src/game/sim/`, `src/game/storage/` — 확인된 결함과 확정 사양 이내 밸런스 보정; modify if needed

#### Details
- **Signatures & Types**:
  ```ts
  // node:test를 사용해 기존 공개 API로 게임 실행과 실제 직렬화를 검증한다.
  type Expected = {stageId:'forest-1'|'mine-1'; elapsedTicks:number; deaths:number};
  function roundTrip(save:SaveV2):SaveV2; // writeSave → loadSave, 메모리 Storage 사용
  ```
- **Data & Schema Fields**: 양쪽 stage별 `best/recent`, `unlockedStageIds`, `run`, 설정; 광산 수레 구역·타이머·유효 카트, 적·투사체·웅덩이, 기계/벌레 상태·좌표·체력·페이즈·경고·남은 시간, 드롭 결정과 소비, 플레이어 입력에 영향을 주는 상태를 비교한다.
- **Execution Flow / Logic**:
  1. 새 저장 → 숲 완료 → 결과와 광산 해금/시작 대기 스냅샷이 같은 저장에 있는지 → JSON 왕복 → 광산 선택·시작 → 광산 완료 → 개별 기록·해금 보존을 검증한다. 결과 화면 또는 종료 중 flush가 광산 대기 상태를 덮어쓰지 않는지 검사한다.
  2. 숲·광산 사망 후 전체 적과 아이템 복구, 누적 사망과 시간 0을 확인한다. 광산은 주입된 결정적 난수로 사망 때 수레 구역 재배정, 이어하기 때 동일 구역 보존을 확인한다. 구역 후보가 낭떠러지와 경기장에 생겨도 유효해야 한다.
  3. 산성액 비행/웅덩이, 수레 경고/진행/재등장 대기, 기계 돌진, 물약 추첨 직후, 벌레 등장 중 및 2페이즈 두 번째 돌출 경고 중 각각 저장→복원→같은 입력을 진행해 다음 상태와 이벤트가 일치하는지 확인한다. 저장 중 미지원·손상·읽기/쓰기 실패일 때 원본 보존과 경고를 확인한다.
  4. 적·기계·벌레·수레와 충격파의 일반 1하트 피해, 피격 무적, 일반 공격 피해, 낙사 즉시 사망을 구분한다. 기계 충격파는 실제 짧은 점프 실패·긴 점프 성공을 확인한다. 광산 보스 등장 중 외의 사용자 입력 불필요 정지가 새로 생기지 않는지 확인한다.

### I02. 브라우저 플레이·접근성·음향 확인
- Related Files:
  - `docs/verification/mine-stage-2026-11-08/` :: 검증 기록·화면 — new
  - `src/game/scenes/StageScene.js`, `src/game/render/`, `src/game/audio/`, `src/game/content/mineStage.js` — 실제 발견한 결함·수치 조정; modify if needed
  - `docs/asset-provenance.md` — 최종 에셋·음원 출처 검증; modify if needed

#### Details
- **Execution Flow / Logic**:
  1. `npm run dev`로 `http://127.0.0.1:5173/`을 열고 브라우저 오류와 네트워크 로딩 오류를 기록한다. 새 저장 시작, 숲 클리어 결과→광산, 제목 복귀 후 이어하기, 잠금/해금 선택, 다른 진행 덮어쓰기의 확인과 취소, 각 기록 화면을 점검한다. 기존 v1 저장을 테스트하는 경우 별도 테스트용 프로필/저장소를 이용해 사용자의 현재 진행을 지우지 않는다.
  2. 광산에서 골렘 양 방향 120px 파형과 낭떠러지·벽 종료, 벌레 포물선과 웅덩이 2초, 박쥐 고정 목표, 수레 진입 전 시각/음향 경고·파괴·10초 재생성, 5개 구역, 기본 회복 3개를 확인한다. 허용된 테스트 설정으로 특정 장면에 접근할 때 그 사실을 기록하고 자연 플레이 증거로 표시하지 않는다.
  3. 기계의 네 공격·고저 점프 회피·처치 후 40% 물약을 결정적 시험으로 검증한다. 벌레의 3초 등장과 이동/피해 제한, 각 경고와 고정 목표, 벌레 2페이즈·4초 웅덩이, 하나의 HP 바와 처치 후 결과를 확인한다. 보스 음악이 전환 없이 이어지는지 재생 상태/currentTime 및 가능한 실제 청취로 나누어 기록한다.
  4. 이어하기와 브라우저 새로고침이 일시정지로 시작하고, 재개 전 HP·카운터·수레·투사체·보스가 진행되지 않는지 확인한다. 백그라운드/포커스 손실, 일시정지 설정 열기, 화면 크기 변경에서 텍스트·신호·게임 영역이 식별되는지 확인한다.
  5. 자동 입력으로 전체 클리어를 시도하고 출발/종료 시각·게임 내 기록·사망 수·입력 방식·콘솔 오류를 기록한다. 도구 제약 또는 성공 실패가 있으면 그대로 기록한다. 사람이 직접 플레이하지 않았다면 2~5분 목표의 사람 기준 달성 및 실제 조작감·청취 평가는 `미확인`으로 표기한다. 사람에게 별도 확인을 요청할 수 있으나 자동 테스트로 이를 대체했다고 쓰지 않는다.
  6. 문제를 수정하면 해당 시나리오와 관련 자동 테스트를 다시 실행한다. 조정은 사용자가 정한 120px·체력·2/4초·600틱·40%·180틱 같은 확정 수치를 유지하고 명시하지 않은 속도·배치·색상에 한정한다. 새로운 게임 규칙이 필요한 경우 임의로 바꾸지 말고 사용자와 결정한다.
  7. 검증 기록에 실행 환경, 명령과 결과, 대표 장면 스크린샷 경로, 자동/직접 플레이 구분, 오류 및 미확인 사항을 남긴다. 기존의 재발하지 않은 타이틀 복귀는 개발 중 업데이트가 원인일 가능성이라는 사용자의 관찰만 기록하며 확정 원인처럼 단정하지 않는다.

## Acceptance Criteria
- [ ] 두 스테이지의 진행·사망·기록·저장 복구·오류 처리에 대한 자동 통합 검증이 통과한다.
- [ ] 광산 일반 전투, 두 보스, 수레·웅덩이의 화면과 복구를 브라우저에서 확인하거나 도구 제약을 정확히 기록한다.
- [ ] 자동 입력 결과와 사람 직접 플레이·청취 확인 여부를 구분해 `docs/verification/mine-stage-2026-11-08/`에 남긴다.
- [ ] 사용자에게 알리지 않은 추가 콘텐츠나 이전 문제 조사로 범위를 확장하지 않는다.

## Validation
- `node --test test/mine-integration.test.js` — 통합 저장·진행·전투 시나리오 통과.
- `npm test` — 전체 테스트 통과.
- `npm run build` — 빌드 통과. 기존 대형 번들 경고가 있으면 기록한다.
- `npm run dev` — 브라우저 시나리오 실행 및 검증 기록 작성. 2~5분 사람 기준 달성은 실제 확인 전 미확인으로 표시.

## Commit Message
```text
test(mine): verify stage progression and restored encounters

Plan: 2026-11-08-mine-second-stage
Phase: P01-mine-stage
Task: T05-integration-acceptance

- Verify stage records, transitions and in-combat recovery
- Record browser evidence and outstanding human checks
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
