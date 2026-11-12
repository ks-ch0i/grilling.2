# Phase: P01 Camera Follow

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | Implement bounded camera target calculations and unit tests. | [T01](./T01-camera-target-math.md) |
| T02 | `done ✅` | Integrate dead-zone following, vertical camera bounds, boss intro framing, and parallax in the stage scene. | [T02](./T02-stage-camera-integration.md) |

## Progress
- done: 2/2

## Dependencies
- T02 uses the pure target function created and tested by T01.
- T01: pure bounded camera target function added; focused tests passed 7/7.
- T01 commit: `a2ac425`.
- T02: `StageScene` now uses the dead-zone target, allows upward camera overscan, preserves boss-intro framing, and moves the background vertically; focused tests passed 7/7, full suite passed 142/142, and build passed with the existing large-bundle warning.
- T02 commit: `5177e36`.
- Follow-up tuning: set the zone to 30% width × 150 px height so floor jumps stay inside; the current focused camera suite passes 8/8.
