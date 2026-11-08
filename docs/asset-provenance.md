# Pixel Action 에셋 출처와 제작 기록

확인일: 2026-11-07. 게임은 기존 Knight Run의 이미지·음원을 사용하지 않는다.

## 신규 이미지 원본

아래 원본은 이 프로젝트를 위해 내장 `image_gen.imagegen` 도구로 생성했다. 원본은 `public/assets/source/`에 보존한다. 참조 이미지는 동일 캐릭터 또는 팔레트의 스타일 참조이며, 외부 작품을 입력하지 않았다. 투명 배경을 요청한 원본의 실제 알파 채널을 검사했다. `forest-original.png`는 배경 자체이므로 불투명하다.

| 원본 파일 | 프롬프트 핵심 | 참조 |
|---|---|---|
| `hero-original.png` | 고딕 잔혹 동화의 낡은 적갈색 망토 검사, 4×4 이동·피격·사망 자세, 검 제외 | 없음 |
| `hero-directions-original.png` | 같은 검사, 오른쪽부터 시계 방향 8방향 신체, 4×2 | hero |
| `hero-walk-original.png` | 같은 검사의 8방향 걷기, 방향별 두 포즈, 8×2 | hero directions |
| `hero-attacks-original.png` | 같은 검사, 8방향 × 3타의 서로 다른 팔 자세, 검 제외 | hero directions |
| `hero-dive-original.png` | 같은 검사, 점프·수직 강하·착지·회복 2×2 | hero |
| `soldier-original.png` | 나무 갑옷과 나무 검의 병사, 대기·이동·예고·공격·피격·쓰러짐 4×4 | hero 스타일 |
| `wisp-original.png` | 숲 망령, 부유·이동·시전·발사·피격·소멸 4×4 | hero 스타일 |
| `boar-original.png` | 어두운 털과 엄니의 멧돼지, 대기·걷기·준비·돌진·피격·쓰러짐 4×4 | hero 스타일 |
| `boar-spaced-original.png` | 위 멧돼지를 넓은 투명 셀 간격으로 재생성 | boar |
| `boss-original.png` | 뒤틀린 뿌리와 가지 팔의 타락 고목, 8개 보스 자세 | hero 스타일 |
| `boss-spaced-original.png` | 위 보스를 셀 중앙에 배치하고 프레임 간격을 넓혀 재생성 | boss |
| `forest-original.png` | 달빛과 안개가 있는 고딕 숲 횡스크롤 배경, 글자·인물 없음 | hero 팔레트 |
| `terrain-ui-original.png` | 이끼 지형·체크포인트·회복병·빈/찬 하트 4×2 | forest 스타일 |
| `terrain-ui-spaced-original.png` | 위 지형·UI 아이템을 넓은 투명 간격으로 재생성 | terrain/UI |
| `effects-original.png` | 검 궤적·명중·구르기 먼지·내려베기·회복·발사체·뿌리 효과 4×2 | hero 스타일 |
| `sword-original.png` | 왼쪽 손잡이, 오른쪽 날끝의 가로 방향 검 한 자루 | 없음 |

프롬프트 공통 조건: 선명한 저해상도 픽셀 아트, 제한된 적갈색·회색·이끼색 팔레트, 동일한 크기와 기준점, 글자·워터마크·격자 없음. 원본 생성 후 육안으로 형태와 셀 분리를 검사했다. 셀 경계에 닿는 보스·멧돼지·지형 시트는 넓은 간격으로 재생성해 최종 포장에 사용했다.

## 프레임과 기준점

`npm ci` 후 `node scripts/pack-art.mjs`로 원본에서 최종 PNG를 재생성한다. 스크립트는 원본의 알파를 검사하고 셀 경계 침범을 거부하며, 투명 영역을 자른 뒤 공통 비율과 발 기준점을 유지해 최근접 이웃으로 축소한다. 알파 128 미만을 투명 처리해 흐린 가장자리를 제거한다. 시뮬레이션 충돌 크기는 이미지 크기와 별도다.

| 출력 경로 | 셀 크기 | 셀/용도 | 원점 |
|---|---:|---|---|
| `characters/hero/actions.png` | 32×32 | 4×4 이동·점프·구르기·피격·죽음 | 발 중앙 `(0.5,1)` |
| `characters/hero/directions.png` | 32×32 | 4×2, 시계 방향 8방향 대기 | 발 중앙 |
| `characters/hero/walk.png` | 32×32 | 8×2, 8방향별 걷기 2프레임 | 발 중앙 |
| `characters/hero/attacks.png` | 32×32 | 8방향별 3프레임을 준비·휘두름·복귀에 사용 | 발 중앙 |
| `characters/hero/dive.png` | 32×32 | 2×2, 수직 강하 자세 포함 | 발 중앙 |
| `characters/hero/sword.png` | 32×12 | 우향 검, 조준각으로 회전 | 손잡이 근처 `(0.16,0.5)` |
| `characters/soldier/poses.png` | 40×40 | 4×4 병사 상태 | 발 중앙 |
| `characters/wisp/poses.png` | 32×32 | 4×4 망령 상태 | 하단 중앙 |
| `characters/boar/poses.png` | 48×32 | 4×4 멧돼지 상태 | 발 중앙 |
| `characters/boss/poses.png` | 112×112 | 6×4 숲 수호자 공격·전환·사망 포즈 24개 | 뿌리 중앙 |
| `world/forest/objects.png` | 64×64 | 4×2 지형·체크포인트·아이템·하트 | 용도별 |
| `effects/effects.png` | 48×48 | 4×2 궤적·명중·발사체 등 | 중심 |
| `world/forest/backdrop.png` | 640×304 | 숲 배경의 상단을 잘라 축소 | 화면 왼쪽 위 |
| `world/forest/ground.png`, `platform.png` | 64×56, 64×16 | 지형 셀에서 추출한 반복 텍스처 | 충돌 사각형 왼쪽 위 |

`src/game/assets/manifest.js`는 각 파일·프레임·애니메이션의 프레임 속도·반복·원점을 선언한다. `test/assets.test.js`는 실제 PNG를 디코딩해 알파·프레임 개수·빈 셀·경계 여백과 손상 입력을 검사한다.

## 음원과 사용 조건

- 곡: **Magic Forest**, Kevin MacLeod (incompetech.com), ISRC `USUAN1600044`.
- 작곡가의 [원본 곡 페이지](https://www.incompetech.com/music/royalty-free/index.html?isrc=USUAN1600044)에는 해당 곡과 CC BY 4.0 출처 표기가 명시되어 있다. [작곡가의 라이선스 안내](https://incompetech.com/music/royalty-free/licenses/)도 무료 Creative Commons 사용 시 출처 표시를 요구한다.
- [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)은 저작자 표시, 라이선스 링크와 변경 여부 표시를 조건으로 개인·상업 목적의 공유 및 수정을 허용한다. 라이선스 조건을 지키는 한 부여된 자유는 철회되지 않는다.
- [작곡가의 원본 MP3](https://incompetech.com/music/royalty-free/mp3-royaltyfree/Magic%20Forest.mp3)를 `public/assets/audio/music/magic-forest.mp3`에 오프라인 저장했다. 오디오 자체를 편집하지 않았으며 숲과 보스 구간에서 같은 파일을 사용한다. SHA-256: `0e8f92a3dfb5e71398502478d6d3be14b705b0dfc0afabccf5831bc741592f55`.
- 게임 설정 화면과 이 문서에 제목·저작자·라이선스를 표시한다. 별도 외부 웹 폰트는 포함하지 않으며 시스템 글꼴을 사용한다.
- 효과음 13종은 `src/game/audio/AudioManager.js`의 발진기 파형·주파수·길이·재생 간격으로 직접 합성한다. 원본 음원 파일이나 외부 효과음을 사용하지 않는다. 저장된 음악·효과음 음량과 흔들림 설정을 적용한다.

## 검증과 제한

이미지 원본은 육안으로 확인했으며 투명 시트의 실제 알파와 각 최종 셀을 자동 검사한다. `docs/verification/T04/`와 `docs/verification/combat-polish-2026-11-07/`에 브라우저 화면을 보존한다. 마지막 변경 후 Chrome 자동 입력 완주 기록은 181.37초, 사망 1회, 브라우저 오류 0건이다. 사망 후 체크포인트 복구로 재생성된 앞 구간 적 5마리는 클리어 시 남았다. 브라우저에서 음원 로딩, 파형 출력, 재생 시간 진행, 일시정지 및 재개는 확인했으나 최종 버전의 사람 직접 완주와 실제 청취·난이도 평가는 확인되지 않았다. 사용자의 마무리 요청에 따라 이 한계를 기록하고 T04를 종료한다.

## 광산 스테이지 신규 에셋 — 2026-11-08

내장 `image_gen.imagegen` 도구를 사용해 이 프로젝트용 픽셀 아트를 생성했다. 프롬프트 공통 조건은 버려진 지하 광산, 고딕 판타지, 회색·갈색·청록 팔레트, 선명한 픽셀, 글자·워터마크 없음이다. 생성 원본은 `public/assets/source/`에 보존하고 `node scripts/pack-art.mjs`로 최종 파일을 재생성한다.

| 원본 | 생성 요청과 참고 |
|---|---|
| `mine-backdrop-original.png` | 무너진 갱도, 목재 지지대, 레일, 장비와 등불이 있는 어두운 광산의 횡스크롤 배경 |
| `mine-terrain-original.png` | 위쪽 표면과 균열이 있는 회갈색 광산 지면 타일 |
| `mine-golem-original.png` | 암석과 청록 광물로 구성된 골렘, 대기·이동·내려치기·피격·사망 4×4 프레임 |
| `mine-insect-original.png` | 산성 기관을 가진 광산 벌레, 대기·발사·피격·사망 4×4 프레임 |
| `mine-bat-original.png` | 광물이 붙은 박쥐, 비행·급강하·피격·사망 4×4 프레임 |
| `mine-machine-original.png` | 낡은 드릴 채굴 기계, 가동·공격·파괴 4×2 프레임 |
| `mine-machine-attack-original.png` | 드릴 돌진·낙석·충격파·광물 분출 준비와 공격을 담은 6×4 프레임 | 사용자 제공 광산 드릴 거인 콘셉트 이미지 |
| `mine-mineral-original.png` | 투명 배경의 청록색 광물 투사체 1×1 | 없음 |
| `mine-worm-original.png` | 광물에 감염된 거대 벌레, 등장·산성액·꼬리·굴착 4×2 프레임 |
| `mine-worm-spaced-original.png` | 위 벌레 원본을 참조해 각 프레임 내부 여백을 늘린 수정본. 초기 원본이 셀 경계에 닿아 최종 패킹에는 이 수정본을 사용 |
| `mine-cart-original.png` | 바퀴와 광물이 보이는 낡은 광산 수레 |

## 숲 수호자 공격 애니메이션 — 2026-11-08

내장 `image_gen.imagegen`을 사용해 기존 `boss-spaced-original.png`의 나무 수호자 외형을 참고한 `boss-attack-spaced-original.png`를 생성했다. 원본은 1536×1024 투명 PNG이며 6×4 격자의 24개 포즈를 담는다. 포즈 순서는 idle(0–1), 등장(2–3), 가지 휘두르기 준비/공격(4–8), 뿌리 공격 준비/공격(9–12), 내려치기 준비/공격(13–17), 페이즈 전환(18–20), 사망(21–23)이다. `node scripts/pack-art.mjs`는 투명 여백을 확인해 각 포즈를 112×112 런타임 셀로 재패킹한다.

광산 이미지의 외부 참조 작품은 사용하지 않았다. 캐릭터 출력 셀은 골렘 48×48, 벌레·박쥐 40×40, 기계 112×112, 거대 벌레 128×112이며 모두 발 중앙을 기준으로 한다. 수레는 48×32, 배경은 640×304, 지면과 발판은 각각 64×56 및 64×16이다. 알파·셀 경계·프레임 존재는 자동 검사한다.

광산 탐험곡 `mine-exploration.wav`와 보스곡 `mine-boss.wav`는 `scripts/generate-mine-music.mjs`의 음계와 발진 파형으로 이 프로젝트를 위해 자체 합성한 원본이다. 외부 샘플이나 곡을 사용하지 않는다. 두 곡 모두 22,050Hz 모노 PCM, 16초 반복이며 스크립트로 재생성한다. 설정 화면에도 출처를 표시한다.

## 광산 기계 공격 애니메이션 — 2026-11-08

`mine-machine-attack-original.png`는 사용자 제공 광산 드릴 거인 콘셉트를 외형 참고로 삼아 내장 `image_gen.imagegen`으로 생성한 1536×1024 투명 이미지다. 6×4 격자의 포즈는 등장(0–1), 대기(2–3), 돌진 준비/공격(4–7), 낙석 준비/공격(8–11), 충격파 준비/공격(12–15), 광물 분출 준비/공격(16–20), 피격(21), 사망(22–23) 순이다. `mine-mineral-original.png`는 별도 투명 투사체 이미지다. 패커는 기계 포즈를 112×112, 광물을 16×16 런타임 프레임으로 재패킹한다. 이전 `mine-machine-original.png`는 원본 기록으로 보존하고 런타임에는 사용하지 않는다.
