# Pixel Action

Phaser 4와 Vite로 만든 2D 횡스크롤 픽셀 액션 게임입니다.

## 게임 소개

- **숲:** 숲의 적과 수호자를 상대합니다. 숲을 클리어하면 광산 스테이지가 해금됩니다.
- **광산:** 채굴 기계 보스와 싸운 뒤 거대 벌레와 이어서 전투합니다.
- 진행 중인 도전, 스테이지 해금, 최근·최고 기록은 현재 브라우저에 저장됩니다.

## 조작

| 동작 | 조작 |
| --- | --- |
| 이동 | `A` / `D` |
| 점프 | `Space` |
| 조준 | 마우스 포인터 |
| 공격 | 마우스 왼쪽 버튼 |
| 구르기 | `Shift` |
| 내려베기 | `E` |
| 일시정지 / 재개 | `Esc` |

설정에서 음악 음량, 효과음 음량, 화면 흔들림을 조절할 수 있습니다. 전체화면 전환도 지원합니다. 음악 음량·효과음 음량·화면 흔들림 설정은 브라우저에 저장되고, 전체화면 상태는 저장하지 않습니다.

## 개발 환경 시작하기

### 요구 사항

- Node.js `>=22.12.0`
- npm

### 설치 및 실행

```bash
npm ci
npm run dev
```

Vite가 터미널에 표시한 로컬 주소를 브라우저에서 여세요. 개발 서버는 `127.0.0.1`에서 실행됩니다.

### 주요 명령

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 로컬 개발 서버 시작 |
| `npm test` | Node.js 테스트 실행 (`node --test test/*.test.js`) |
| `npm run build` | Vite 프로덕션 빌드 |

## 시스템 구성

`src/main.js`에서 Phaser 게임을 시작합니다. Phaser 화면과 게임 규칙은 다음 폴더에 나뉘어 있습니다.

| 경로 | 역할 |
| --- | --- |
| `src/game/scenes/` | 제목, 스테이지, 설정, 결과 화면과 화면 전환 |
| `src/game/sim/` | 플레이어·적·보스·전투·스테이지 진행 규칙 |
| `src/game/render/` | 게임 상태를 Phaser 화면과 효과로 표현 |
| `src/game/content/` | 숲·광산 스테이지 정의 |
| `src/game/assets/` | 런타임 에셋과 애니메이션 선언 |
| `src/game/input/` | 키보드와 마우스 입력 처리 |
| `src/game/audio/` | 배경음·효과음 재생 |
| `src/game/storage/` | 브라우저 저장, 진행 복구, 기록 관리 |
| `src/game/dev/` | 개발용 라운드 선택 |
| `public/assets/source/` | 에셋 생성에 사용하는 원본 이미지 |
| `public/assets/` | 게임에서 읽는 이미지와 오디오 파일 |
| `scripts/` | 런타임 이미지와 광산 음악 생성 스크립트 |
| `test/` | Node.js 테스트 |
| `docs/` | 에셋 출처와 개발 기능 안내 |

## 에셋 다시 생성하기

의존성을 설치한 뒤 원본 이미지와 스크립트에서 런타임 파일을 다시 만들 수 있습니다.

```bash
node scripts/pack-art.mjs
node scripts/generate-mine-music.mjs
```

`pack-art.mjs`는 `public/assets/source/`의 이미지를 패킹해 `public/assets/` 아래 런타임 PNG 파일을 생성하거나 갱신합니다. `generate-mine-music.mjs`는 다음 광산 음악 WAV 파일을 생성하거나 갱신합니다.

- `public/assets/audio/music/mine-exploration.wav`
- `public/assets/audio/music/mine-boss.wav`

## 검증

### 자동 검사

```bash
npm test
npm run build
```

`npm test`는 Node.js 테스트 러너를 사용합니다. 이 저장소에는 브라우저 E2E 자동화 명령이 없으므로, 실제 화면 흐름은 아래 점검표로 확인합니다.

### 브라우저 점검표

1. `npm run dev`로 개발 서버를 시작하고 제목 화면이 열리는지 확인합니다.
2. 숲 스테이지를 시작해 이동, 점프, 마우스 공격, 구르기, 내려베기, 일시정지·재개와 설정 화면을 확인합니다.
3. 개발용 라운드 선택에서 숲 보스와 광산 보스를 확인하고, 광산 기계 보스 이후 거대 벌레가 등장하는지 확인합니다. 연습 기록은 저장되지 않습니다.
4. 일반 진행으로 숲을 클리어해 광산이 해금되는지, 기록과 이어하기가 동작하는지 확인합니다.

개발 서버 제목 화면의 **라운드 선택 (개발용)** 메뉴는 개발 모드에서만 제공됩니다. 메뉴를 숨기려면 개발 서버를 시작하기 전에 `VITE_DEV_ROUND_SELECTOR=false`를 설정하세요. 전체 안내는 [개발용 라운드 선택](docs/round-selector.md)을 참고하세요.

## 에셋 출처

숲 배경음 **[Magic Forest](https://www.incompetech.com/music/royalty-free/index.html?isrc=USUAN1600044)**는 Kevin MacLeod의 곡이며 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 라이선스에 따라 사용합니다. 원본 이미지와 음악의 전체 출처 및 제작 기록은 [에셋 출처와 제작 기록](docs/asset-provenance.md)에서 확인할 수 있습니다.
