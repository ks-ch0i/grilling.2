# Plan: Home Records Layout

## Goal
홈의 기록 화면에서 회사 순위와 내 기록을 한 화면에 보여준다. 이지의 여덟 라운드 기록을 한 번에 훑고, 라운드를 선택하면 개인 기록표를 유지한 채 해당 회사 순위를 확인할 수 있다. 하드에서는 두 영역 모두 선택한 스테이지의 기록을 보여준다.

## Confirmed decisions
- [Home Records Layout](../decisions/2026-11-24-home-records-layout.md)

## Source baseline
- 계획 기준은 `feature/gameplay-round-safety`의 `7981cf601416148f5e3e438c193dc31507f2f2e0`이다.
- 기존 포인터는 완료된 Parry and Dive Controls 계획을 가리킨다. 구현 이력은 기존 계획·단계 파일에 남긴다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done ✅` | 홈 기록 창에 회사 순위와 내 기록을 함께 배치하고, 선택·조회·좁은 화면·결과 화면 진입을 검증한다. | [P01](../phases/2026-11-24-home-records-layout/P01-home-records-layout/phase.md) |

## Scope
- 홈 기록 창의 DOM, 스타일, 집중 회귀 검증이 대상이다. 이지·하드 결과 화면은 기존 순위 진입 및 복귀 경로를 사용한다.
- 회사 순위 응답, 정렬, 계정 권한, 기존 개인 저장 구조를 재사용한다. 공동 순위의 표시 경계 정책과 푸시·배포는 별도 범위다.
