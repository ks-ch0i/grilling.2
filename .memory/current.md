# Current Context

## Active Plan
[보스 공격 가시성 개선](./plans/2026-11-08-boss-attack-clarity.md)

## Active Phase
[P01 보스 연출](./phases/2026-11-08-boss-attack-clarity/P01-boss-presentation/phase.md)

## Active Task
[T03 벌레 공격 모션](./phases/2026-11-08-boss-attack-clarity/P01-boss-presentation/T03-worm-attack-motion.md)

## Status
- 광산 계획 T01 저장·복구 `7267a9e`, T02 광산 일반 전투 `a17e65a`, T03 연속 보스 `5a2e73c`, T04 화면·흐름·음악 통합, T05 전체 진행·저장 복구와 체감 검증까지 완료했다. T05 커밋은 `c593df9`다.
- 보스 가시성 계획 T01 숲 수호자 `8788f7d`, T02 기계 광물 공격 `e6b34c7`을 완료했다. T02의 패킹, 지정 테스트 35개, 프로덕션 빌드가 통과했다. 번들은 1,455KB로 Vite의 500KB 초과 경고가 있다.
- 사용자 추가 요청에 따라 개발 서버에서 숲·광산 시작 및 숲/기계/벌레 보스를 자유롭게 연습한다. 연습 기록은 저장하지 않는다. 배포 빌드에서 비활성화하며, 향후 관리자 인증·권한과 기능 ON/OFF는 서버 검증을 갖춘 뒤 연결해야 한다. 자세한 사용법은 [라운드 선택](../docs/round-selector.md).
- T04 검증: `node scripts/pack-art.mjs`, 집중 테스트 21개, 전체 테스트 100개, `npm.cmd run build` 통과. 빌드에는 기존 500KB 초과 번들 경고가 있다. Orca 내부 브라우저의 `http://127.0.0.1:5173/`에서 개발용 라운드 메뉴, 광산 시작 화면, 기계 보스 연습 HUD와 일시정지를 확인했다. 광산 음악 두 파일은 브라우저에서 각각 HTTP 206으로 응답했고 `.audio-warning`은 없으며 콘솔에 Vite/Phaser 시작 로그 외 오류가 없었다. 실제 청취 평가는 이 실행 환경에서 확인할 수 없어 T05에서 사용자 확인 필요 항목으로 남긴다.
- 기존 숲 구현과 인수 상태는 [이전 계획](./plans/2026-11-07-pixel-action-first-stage.md), [T04 완료 기록](./phases/2026-11-07-pixel-action-first-stage/P01-first-stage/T04-art-audio-acceptance.md)에 보존돼 있다. 사람이 최종 숲 버전을 직접 완주하며 청취·난이도를 평가한 결과는 확인되지 않았다.
- 과거 보스 근처 타이틀 복귀는 재발하지 않았으며 사용자는 개발 중 업데이트로 인한 현상일 가능성을 보고했다. 원인은 확정되지 않았고 별도 조사는 이 계획에 포함하지 않는다.
- 사용자가 이 게임의 기존 v1 진행·기록·설정을 새 저장 적용 때 별도 안내 없이 초기화하도록 명시했다. 손상·미래 버전 및 다른 앱 데이터는 보존한다.

## Next Step (IMPORTANT)
보스 가시성 계획 T02를 `e6b34c7`로 완료·커밋했다. 이어 T03 청사진을 읽고 거대 벌레의 공격별 모션과 페이즈 전환 맵 소등을 구현한다. 세 보스의 최종 브라우저 플레이와 실제 청취는 T04에서 확인한다.
