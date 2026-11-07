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
| `characters/hero/attacks.png` | 32×32 | 8×3 원본 자세 중 첫 행의 8방향 공격 사용 | 발 중앙 |
| `characters/hero/dive.png` | 32×32 | 2×2, 수직 강하 자세 포함 | 발 중앙 |
| `characters/hero/sword.png` | 32×12 | 우향 검, 조준각으로 회전 | 손잡이 근처 `(0.16,0.5)` |
| `characters/soldier/poses.png` | 40×40 | 4×4 병사 상태 | 발 중앙 |
| `characters/wisp/poses.png` | 32×32 | 4×4 망령 상태 | 하단 중앙 |
| `characters/boar/poses.png` | 48×32 | 4×4 멧돼지 상태 | 발 중앙 |
| `characters/boss/poses.png` | 112×112 | 4×2 고목 보스 상태 | 뿌리 중앙 |
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

이미지 원본은 육안으로 확인했으며 투명 시트의 실제 알파와 각 최종 셀을 자동 검사한다. `docs/verification/T04/`에 브라우저 화면 캡처를 보존한다. 공격 조작 변경 후 Chrome 자동 입력 완주에서는 모든 적과 두 단계 보스를 처치하고 127.2초 및 사망 0회를 기록했다. 브라우저에서 음원 로딩, 파형 출력, 재생 시간 진행, 일시정지 및 재개는 확인했으나 사람의 실제 청취와 직접 조작에 의한 최종 인수는 별도로 필요하다.
