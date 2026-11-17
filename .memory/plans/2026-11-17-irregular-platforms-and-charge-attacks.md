# Plan: Irregular Platforms, Charge Attacks, and Root Targeting

## Goal

Replace newly generated rectangular platforms with saved, themed, one-way surface profiles that ground actors can traverse without jumping. Let the Forest boar, Mine Machine, and phase-two Worm charge through platforms, and make every Forest Guardian root strike target the supporting surface beneath the player. Preserve active rectangular saves and the existing eight-round and damage rules.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Generate and simulate irregular platform surfaces, add matching Forest/Mine art, then connect charge and root attacks to those surfaces. | [P01](../phases/2026-11-17-irregular-platforms-and-charge-attacks/P01-irregular-platforms-and-combat/phase.md) |

## Scope Notes

- Decisions: [irregular platforms, charge attacks, and root targeting](../decisions/2026-11-17-irregular-platforms-and-charge-attacks.md).
- Do not add standalone walk-up hills. A generated platform is a 16-pixel modular one-way surface; its top may change by at most 4 pixels between adjacent modules and 16 pixels across the whole platform.
- Generate 2–4 platforms uniformly per fresh attempt in both stages. Keep each top sample in y=248–288 and retain the existing width weighting: 80% from 32/48/64 pixels and 20% from 80/96/112 pixels.
- Keep each generated layout, top profile, and art selection through rounds, boss encounters, and save/restore. Preserve runs with older rectangle-only layouts until their attempt ends.
- Existing Forest/Mine floor and arena boundaries remain. Ranged attacks keep piercing platforms; player melee remains blocked by platform tops.
- Do not change boss schedules, damage, invulnerability, jump physics, or unrelated camera behavior.

## Dependencies

- T02 depends on T01's `ProfiledPlatform` and `terrainLayout` contracts.
- T03 and T04 depend on T01's saved surface lookup; T03 also uses T01's ground-enemy movement behavior.
