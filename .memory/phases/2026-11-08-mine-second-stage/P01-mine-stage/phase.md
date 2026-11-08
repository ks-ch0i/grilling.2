# Phase: P01 광산 스테이지

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `pending` | 체크포인트 제거와 숲의 저장·복구 | [T01](./T01-run-lifecycle.md) |
| T02 | `pending` | 광산 지형·일반 적·수레 시뮬레이션 | [T02](./T02-mine-encounters.md) |
| T03 | `pending` | 채굴 기계와 거대 벌레 연속 보스 | [T03](./T03-mine-bosses.md) |
| T04 | `pending` | 에셋·오디오·화면·스테이지 진행 통합 | [T04](./T04-presentation-progression.md) |
| T05 | `pending` | 전체 진행·저장 복구와 체감 검증 | [T05](./T05-integration-acceptance.md) |

## Progress
- done: 0/5 (active: T01)

## 규칙
- 고정 시뮬레이션 틱은 초당 60회, 위치 단위는 게임 픽셀이다. 타이머가 0으로 되돌아가도 저장 주기는 독립 카운터로 유지한다.
- 각 Task의 코드는 그 Task의 검증을 통과한 후 커밋한다. 다음 작업은 앞 Task가 남긴 실제 인터페이스에 맞추되, 확정 결정을 축소하거나 미완성 기능을 완료로 표시하지 않는다.
