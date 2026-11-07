# Current Context

## Active Plan
[Pixel Action 첫 스테이지](./plans/2026-11-07-pixel-action-first-stage.md)

## Active Phase
[P01 첫 스테이지](./phases/2026-11-07-pixel-action-first-stage/P01-first-stage/phase.md)

## Active Task
[T04 신규 도트 이미지·애니메이션·사운드와 최종 실플레이](./phases/2026-11-07-pixel-action-first-stage/P01-first-stage/T04-art-audio-acceptance.md)

## Status
- T01 공격 모션 구현·검증·커밋 `14a1c01`: 전체 테스트 64개와 빌드 통과, Chrome 자동 입력으로 8방향×3단계 확인. 구르기·내려찍기 재사용 표시는 현행 유지한다.
- T02 피격 밀려남 구현·검증·커밋 `588a98f`: 전체 테스트 72개와 빌드 통과, Chrome 테스트 상태 설정으로 좌우·공중·벽·낙사·두 적 접촉 확인.
- T03 적 배치 구현·검증·커밋 `795f07c`: 전체 테스트 74개, 빌드 통과, 자동 입력 보스 완주 181.37초·사망 1회·브라우저 오류 없음. 체크포인트 사망 복구 후 앞 구간 적 5마리가 재생성되어 클리어 시 남아 있었다. [전투 모션·배치 Phase](./phases/2026-11-07-combat-polish-and-encounters/P01-combat-polish/phase.md)는 완료다.
- 전투 피드백 T01~T03을 각각 구현·검증·커밋해 [전투 피드백 Phase](./phases/2026-11-07-combat-feedback/P01-combat-feedback/phase.md)를 완료했다. 커밋은 `ce4dfb0`, `ef1f3d2`, `19e390a`다.
- 이전 첫 스테이지 구현은 `f3e0b6f`에 별도로 보존했다. 이 커밋은 진행 중인 작업의 스냅샷이며 T04의 사람 인수 완료를 뜻하지 않는다.
- [첫 스테이지 T04](./phases/2026-11-07-pixel-action-first-stage/P01-first-stage/T04-art-audio-acceptance.md)는 `in_progress`로 유지한다. 사람의 직접 완주·청취·난이도 인수를 계속한다.
- 자동 입력은 사람의 직접 완주와 실제 청취·난이도 인수를 대체하지 않는다. 새 작업의 증거는 `docs/verification/combat-polish-2026-11-07/`에 있다.
- 보스 근처에서 타이틀로 돌아간 원인은 미확정이다. 재로드 체크포인트 복구는 이미 추가했으며 사용자의 재확인에서 재발하지 않았다.
- 콤보 및 방향 고정은 제거되어 있고, 내려찍기 판정은 62×31 게임 픽셀이다. 보스 등장 중 플레이어 이동을 허용하고 등장 안내와 두 대상 카메라를 사용한다.

## Next Step (IMPORTANT)
첫 스테이지 T04를 계속한다. 사람이 수정된 게임을 완주하며 조작감·소리·난이도를 직접 확인하고, 그 결과 없이 T04를 완료로 표시하지 않는다.
