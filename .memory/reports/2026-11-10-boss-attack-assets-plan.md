---
lang: ko
title: 보스 공격·등장 에셋 작업 계획
subtitle: 2026-11-10 · 단일 Phase · 4개 Task
cols: 2
---
계획과 상세 청사진을 생성하고 current.md를 T01로 연결했습니다. 이번에는 계획 문서만 작성했습니다.

## A 생성한 구조
| 순서 | 관찰 가능한 결과 | 주요 파일 |
|---|---|---|
| T01 | 실제 본체 원화와 외부 효과 시트, 고정 앵커 패킹 | pack-art.mjs, manifest.js, bossFx.js, AttackSpriteLayer.js, PNG |
| T02 | 숲 공격과 접지 기준 뿌리, 두 번째 뿌리 표시·저장 호환 | boss.js, stage.js, animation.js, EnemyView.js, forestAttackPresentation.js |
| T03 | 기계·벌레의 공격과 보스 소유 투사체 표시 | MineHazardView.js, EnemyView.js, bossEffects.js, mineAttackPresentation.js |
| T04 | 4초 벌레 등장·포효·복구·연습 시작과 전체 회귀 검증 | wormIntro.js, WormIntroView.js, StageScene.js, roundSelector.js, eventSounds.js |

문서 위치: `.memory/plans/2026-11-10-boss-attack-assets.md`

청사진 위치: `.memory/phases/2026-11-10-boss-attack-assets/P01-asset-presentation/`

## B 작업을 나눈 이유
- 실제 파일 없이 텍스처를 등록하면 로딩과 자산 검사가 실패합니다. T01에 원화·패킹·등록·공통 표시 계약을 묶었습니다.
- 숲 뿌리는 공격 시간과 저장 형식을 함께 바꿉니다. 표시만 수정하면 복구와 두 번째 공격이 어긋나므로 T02에서 함께 처리합니다.
- 기계와 벌레는 같은 hazard 렌더러를 씁니다. T03으로 묶어 같은 분기를 두 번 재구성하지 않습니다.
- 등장 단계는 화면·소리·연습 시작점을 연결합니다. T04에서 연결과 전체 회귀를 마무리합니다.

## C 청사진에 명시한 회귀 방지
- 기존 패킹은 그림의 바운딩 박스로 크기를 다시 맞춥니다. 외부 팔까지 한 시트에 넣으면 본체 크기가 달라져, 기준선 보존과 외부 에셋 분리를 명시했습니다.
- 두 번째 뿌리는 회복 상태에 발생합니다. 본체가 공격 중일 때만 그리는 조건을 없애 각 뿌리 수명을 따르도록 했습니다.
- 저장은 필드를 엄격히 검사합니다. rootEffects 추가 시 이전 저장 보충과 새 필드 검증을 함께 명시했습니다.
- 벌레 등장은 96틱 돌출·포효, 120틱 암전, 144틱 공개, 240틱 전투입니다. 복구 후 포효 중복과 조기 본체 노출을 검사합니다.
- 직접 게임 플레이는 검증 절차에 넣지 않았습니다. 실제 PNG 관찰과 자동 검사·빌드로 확인하며 사람의 체감 확인을 별도로 기록합니다.

## D 다음 실행과 별도 범위
`/memory-execute` 또는 'current 보고 이어서 해줘' 요청에서 T01부터 시작합니다. 이전 current는 `.memory/2026-11-10-previous-current.md`에 보존했습니다.

코드상 잠복 준비 중에도 벌레 본체 접촉 피해가 있습니다. 완전히 감추는 잠복 연출에는 접촉 판정 변경도 필요할 수 있습니다. 이번 계획은 판정을 유지하며, 변경 포함 여부는 별도 선택 사항입니다.

이전 빌드의 번들 용량 경고와 관리자 인증은 별도 범위입니다. 새 Task로 늘리지 않았습니다.
