# Plan: 전투 모션·피격 반응·적 배치 개선

## Goal
[확정 결정](../decisions/2026-11-07-combat-polish-and-encounters.md)에 따라 기존 공격 속도와 자유 조준을 유지하면서 몸·검의 휘두름을 표시하고, 피격 시 적과 안전하게 분리하며, 일반 적 9마리를 두 쌍과 다섯 단독 전투로 재배치한다.

## Scope and continuity
- 구르기·내려찍기의 재사용 표시는 변경하지 않는다. 신규 기술 UI·적 추가·스테이지 길이 변경·보스 타이틀 복귀 원인 조사는 범위 밖이다.
- 기존 첫 스테이지 [T04](../phases/2026-11-07-pixel-action-first-stage/P01-first-stage/T04-art-audio-acceptance.md)는 사람의 완주·청취·난이도 인수 대기로 `in_progress`다. 이 계획 이후 해당 작업으로 복귀하며 자동 플레이나 사용자의 일반적인 호평을 최종 인수로 간주하지 않는다.
- 첫 스테이지 구현은 `f3e0b6f`, 이전 전투 개선은 `ce4dfb0`, `ef1f3d2`, `19e390a`에 있다. 이 계획과 결정은 `8aaacec`, 세 구현은 `14a1c01`, `588a98f`, `795f07c`에 각각 보존했다. 첫 스테이지 T04의 사람 인수는 아직 남아 있다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 공격 모션, 피격 이동·분리, 두 동시 전투 배치 | [P01](../phases/2026-11-07-combat-polish-and-encounters/P01-combat-polish/phase.md) |
