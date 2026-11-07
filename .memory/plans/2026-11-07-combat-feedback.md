# Plan: 전투 피드백 우선 개선

## Goal
확정된 결정에 따라 내려찍기 하강과 착지 보호, 화면 밖 보스 방향 표시, 일반 공격 준비 표시를 구현한다. 기존 단발 공격·자유 조준·보스 등장 연출·낙사 규칙을 유지하고 세 개선을 각기 검증한다.

## Decisions and scope
- [확정된 결정](../decisions/2026-11-07-combat-feedback.md)의 D01~D04를 따른다.
- 휘두르기 애니메이션, 피격 후 분리, 기술 재사용 표시, 적 배치·밸런스 변경은 범위 밖이다.
- 기존 [첫 스테이지 T04](../phases/2026-11-07-pixel-action-first-stage/P01-first-stage/T04-art-audio-acceptance.md)는 미완료로 보존한다. 이 계획 완료 후 기존 T04의 실제 사람 완주·청취 인수로 복귀한다. 자동 플레이만으로 인수 완료 처리하지 않는다.
- 기존 T04의 수정 및 신규 자산은 진행 중 스냅샷 `f3e0b6f`에 별도로 보존했다. 이 스냅샷은 T04 인수 완료를 뜻하지 않는다. 세 Task는 스냅샷 위에서 각각 분리·검증·커밋했다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 내려찍기 보호, 보스 방향, 공격 준비 표시 | [P01](../phases/2026-11-07-combat-feedback/P01-combat-feedback/phase.md) |
