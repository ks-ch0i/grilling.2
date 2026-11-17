# Phase: P01 Irregular Platforms and Combat

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | Generate and persist valid one-way platform profiles; let players and ground enemies follow their tops. | [T01](./T01-profiled-platform-layouts-and-movement.md) |
| T02 | `done ✅` | Create and render modular Forest-root and Mine-rock platform sprites. | [T02](./T02-themed-platform-art-and-rendering.md) |
| T03 | `done ✅` | Start the Forest boar on the floor and allow all three explicit charge attacks to pass through platforms. | [T03](./T03-charge-platform-piercing.md) |
| T04 | `done ✅` | Place Forest Guardian root warnings and hits on the selected platform or floor surface. | [T04](./T04-forest-root-surface-targeting.md) |

## Progress

- done: 4/4

## Dependencies

- T01 establishes the saved profile schema and one-way movement used by all later tasks.
- T02 renders T01's profiles and module variants without changing simulation geometry.
- T03 and T04 use the shared surface lookup from T01; T03 changes only charge behavior and boar placement, while T04 changes only Forest Guardian root targeting.
