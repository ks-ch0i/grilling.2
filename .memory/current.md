# Current Context

## Active Plan
[전투 모션·피격 반응·적 배치 개선](./plans/2026-11-07-combat-polish-and-encounters.md)

## Active Phase
[P01 전투 모션과 전투 배치](./phases/2026-11-07-combat-polish-and-encounters/P01-combat-polish/phase.md)

## Active Task
[T01 자유 조준 공격 모션](./phases/2026-11-07-combat-polish-and-encounters/P01-combat-polish/T01-attack-animation.md)

## Status
- 2026-11-07 확정된 전투 모션·피격 반응·적 배치 계획을 생성했다. T01은 구현 시작 전이다. 구르기·내려찍기 재사용 표시는 현행 유지한다.
- 전투 피드백 T01~T03을 각각 구현·검증·커밋해 [전투 피드백 Phase](./phases/2026-11-07-combat-feedback/P01-combat-feedback/phase.md)를 완료했다. 커밋은 `ce4dfb0`, `ef1f3d2`, `19e390a`다.
- 이전 첫 스테이지 구현은 `f3e0b6f`에 별도로 보존했다. 이 커밋은 진행 중인 작업의 스냅샷이며 T04의 사람 인수 완료를 뜻하지 않는다.
- [첫 스테이지 T04](./phases/2026-11-07-pixel-action-first-stage/P01-first-stage/T04-art-audio-acceptance.md)는 `in_progress`로 유지한다. 사람의 직접 완주·청취·난이도 인수를 계속한다.
- 2026-11-07 수정 후 전체 테스트 62개와 빌드 통과, Chrome 자동 입력 완주 127.15초·사망 0회·브라우저 오류 없음. 자동 입력은 사람의 직접 완주와 실제 청취·난이도 인수를 대체하지 않는다. 증거는 `docs/verification/combat-feedback-2026-11-07/`에 있다.
- 보스 근처에서 타이틀로 돌아간 원인은 미확정이다. 재로드 체크포인트 복구는 이미 추가했으며 사용자의 재확인에서 재발하지 않았다.
- 콤보 및 방향 고정은 제거되어 있고, 내려찍기 판정은 62×31 게임 픽셀이다. 보스 등장 중 플레이어 이동을 허용하고 등장 안내와 두 대상 카메라를 사용한다.

## Next Step (IMPORTANT)
T01 청사진을 읽고 `src/game/assets/manifest.js`, `src/game/assets/animation.js`, `src/game/render/PlayerView.js`의 기존 8방향 공격 프레임과 검 휘두름을 구현·검증한다. T01~T03 완료 후 첫 스테이지 T04로 복귀해 사람이 완주하며 조작감·소리·난이도를 직접 확인한다. 그 결과 없이 T04를 완료로 표시하지 않는다.
