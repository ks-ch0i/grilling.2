# Plan: 라운드 기반 게임 진행

## Goal

숲과 광산의 횡스크롤 진행을 스테이지별 고정 아레나와 8라운드로 바꾼다. 몬스터 수·종류, 보스 페이즈, 라운드 회복, 사망·기록, 결과 화면, 저장·이어하기가 확정 결정과 일치해야 한다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `complete ✅` | 고정 아레나, 라운드 시뮬레이션, 장면 UI, 저장 및 결과 흐름을 연결한다. | [P01](../phases/2026-11-16-round-based-progression/P01-round-based-gameplay/phase.md) |

## Scope Notes

- 결정 근거: ../decisions/2026-11-16-round-based-gameplay.md
- 숲·광산의 기존 시각 테마, 보스, 적 종류, 광산 카트 위험요소는 유지한다.
- 라운드 선택기는 개발 전용으로 유지하고 새 저장 구조에 맞춰 호환한다. 플레이어용 임의 라운드 선택 기능은 추가하지 않는다.
- 카메라 프레이밍 선택과 dead-zone 코드 정리는 [별도 계획](./2026-11-16-camera-framing-decision.md)에서 다룬다. 이 라운드 계획에서는 카메라 방향이나 helper/test를 변경하지 않는다.
