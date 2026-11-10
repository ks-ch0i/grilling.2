# Current Context

## Active Plan
[보스 공격 및 등장 에셋 재구성](./plans/2026-11-10-boss-attack-assets.md)

## Active Phase
[P01 보스 공격·등장 에셋 연결](./phases/2026-11-10-boss-attack-assets/P01-asset-presentation/phase.md)

## Active Task
[T01 공격 에셋 원화·패킹·공통 스프라이트 계약](./phases/2026-11-10-boss-attack-assets/P01-asset-presentation/T01-asset-pipeline-and-sheets.md)

## Status
- 계획 및 4개 상세 청사진 생성 완료. done: 0/4. T01 구현 시작 준비 완료.
- 이번 `/memory-plan`에서는 `.memory/` 문서만 작성했다. 게임 코드·원화 제작·자산 패킹·테스트·빌드는 실행하지 않았다.
- 확정 결정: [공격 및 등장 에셋 D01~D19](./decisions/2026-11-10-boss-attack-assets.md), [공격 방식 검토](./decisions/2026-11-10-boss-attack-method-review.md).
- 범위는 숲·기계·벌레 보스의 공격 자세와 외부 공격 에셋이다. 기본 외형·색감·게임상 크기를 유지하며 플레이어 피격 표현은 현행 유지한다.
- 뿌리는 큰 팔 접지 뒤 1페이즈 60틱에 한 번, 2페이즈 30틱·60틱에 두 번 발생한다. 사전 바닥 예고를 제거하고 본체가 회복 상태여도 뿌리의 표시 수명을 유지한다.
- 벌레 등장은 기존 기계 사망 완료 후 240틱이다. 96틱 돌출/포효, 120틱 암전, 144틱 본체 공개, 240틱 전투 전환을 공통 타임라인으로 연결한다.
- 사용자는 에이전트 직접 플레이 대신 로직 확인을 지시했다. 검증은 실제 PNG 파일 관찰과 자동 검사·빌드로 구성한다. 새 버전의 사람 플레이·청취 완료를 임의로 주장하지 않는다. 기존 사용자의 화면·소리 정상 보고는 이전 버전의 관찰이다.
- 이전 포인터와 프로젝트 맥락은 [계획 전 current 원본](./2026-11-10-previous-current.md)에 보존했다. 이전 가시성 계획 T04는 임의로 완료 처리하지 않았다.
- 기존에 수정돼 있던 이전 T03·phase.md 및 결정 문서를 덮어쓰거나 무관하게 커밋하지 않는다. 새 실행은 Task별 변경과 검증 결과를 구분한다.
- 광산 보스의 체력·공격 선택·RNG·물약40% 단일 롤·피해 규칙과 개발 전용 연습 기능은 기존 기준이다. 과거 타이틀 복귀 원인 조사는 재개하지 않는다. 이전 빌드의 번들 용량 경고와 관리자 인증 구현은 이번 Task 범위에 넣지 않았다.

## Next Step (IMPORTANT)
T01 청사진을 읽고 기존 보스 PNG 3종을 관찰·기준선으로 보존한 뒤, 실제 원화와 `scripts/pack-art.mjs`, `src/game/assets/manifest.js`, 공통 FX 계약을 함께 구현한다. T01 → T02 → T03 → T04 순서이며 각 파일에 정확한 입력·출력·검증·커밋 메시지가 있다. `/memory-execute` 또는 'current 보고 이어서 해줘' 요청에서 실행을 시작한다.
