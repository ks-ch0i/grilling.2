# Phase: P01 보스 공격 가시성

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | 숲 수호자 공격 모션·효과와 공통 보스 전환 포효음 | [T01](./T01-forest-guardian-motion.md) |
| T02 | `done ✅` | 기계 외형·공격 애니메이션과 광물 분출 시뮬레이션·표시 | [T02](./T02-machine-mineral-attack.md) |
| T03 | `done ✅` | 벌레의 공격별 모션과 페이즈 전환 맵 소등 | [T03](./T03-worm-attack-motion.md) |
| T04 | `in_progress 🔵` | 자동 회귀 검사와 세 보스 브라우저 플레이 확인 | [T04](./T04-boss-visual-acceptance.md) |

## Progress
- done: 3/4 (active: T04)
- T01: 24-frame sheet, attack-specific poses/effects and transition roar; packing and 14 focused tests passed, build passed with the existing large-bundle warning. Browser loaded the new sheet and rendered the boss; attack playback remains for T04.
- T02: 24-frame machine sheet, attack-specific poses, deterministic mineral spray and one-hit collision; pack-art, 35 focused tests and production build passed. Commit `e6b34c7`.
- T03: 24-frame worm sheet, attack-specific poses/effects, 30-tick blackout and mobile transition; pack-art, 21 focused tests and production build passed. Commit `8eb7f2d`.

## 규칙
- 시뮬레이션은 초당 60틱이다. 애니메이션과 그래픽은 `run.boss.telegraphs`, `run.boss.hitboxes`, `run.hazards` 및 보스 상태·경과 틱에서 계산하고 별도의 프레임 타이머로 피해 판정을 만들지 않는다.
- 각 공격의 기존 준비·활성·회복 시간과 충돌 치수는 바꾸지 않는다. 새 광물 분출만 청사진에 지정한 60틱 준비와 60틱 비행을 사용한다.
- `EnemyView`의 일반 적 경고는 이번 범위가 아니다. 보스의 노란 경고 사각형과 빨간 히트박스 사각형만 공격별 시각 효과로 대체한다.
- 매 Task의 자산 패킹, 지정 테스트, 빌드를 통과한 뒤 커밋한다. 최종 T04에서 전체 `npm test`, `npm run build`와 실제 화면을 확인한다.
