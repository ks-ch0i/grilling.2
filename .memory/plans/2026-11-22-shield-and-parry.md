# Plan: Shield and Parry

## Goal

Add a shield and a timed parry to the existing stage combat. The player can reduce ranged and melee damage through separate inputs, while half-heart damage, clear directional rules, saved cooldowns, and readable character feedback keep the defense bounded.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Implement defense rules, save compatibility, sprite assets, and in-game presentation | [P01](../phases/2026-11-22-shield-and-parry/P01-shield-parry/phase.md) |

## Task Order and Dependencies

1. T01 implements input, simulation, attack classification, half-heart damage, and v5 save migration.
2. T02 creates only the shield/parry sprite files; it does not edit production code.
3. T03 depends on T01 and T02 and connects the sprites, health display, effects, sounds, and controls.

## Out of Scope

- Parry does not interrupt or stagger enemies or bosses.
- No HUD cooldown indicator, cooldown-ready cue, or failed-cooldown-input cue is added.
- Contact, acid pools, mine carts, and pit damage cannot be defended.
