# Phase: P01 무작위 아레나와 전투 연결

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | 결정된 범위와 도달 가능성 규칙으로 런 지형을 생성하고 스냅샷 호환성을 추가한다. | [T01](./T01-random-platform-layout-and-snapshots.md) |
| T02 | `in_progress 🔵` | 런 지형을 플레이어·적 시뮬레이션, 적 생성, 스테이지 렌더링에 연결한다. | [T02](./T02-use-run-terrain-in-stage.md) |
| T03 | `pending` | 발판은 관통하고 바닥·화면 경계는 유지하는 원거리 공격 충돌을 구현한다. | [T03](./T03-ranged-attacks-pierce-platforms.md) |
| T04 | `pending` | 광산 벌레 보스 산성탄과 웅덩이의 판정·표시 크기를 조정한다. | [T04](./T04-enlarge-worm-acid-hazards.md) |

## Progress

- done: 1/4 (active: T02)

## Dependencies

- T01 defines and persists the run terrain layout.
- T02 consumes T01's terrain layout contract in movement, enemy placement, and rendering.
- T03 consumes T02's separate platform and floor geometry and preserves the platform support rule for ground waves.
- T04 uses T03's floor-only impact behavior for the worm's enlarged acid projectile and pool.
