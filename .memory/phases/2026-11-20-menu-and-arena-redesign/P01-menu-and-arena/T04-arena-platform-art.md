# Task: T04 Arena Platform Art and Rendering

## Status: done

## Goal

6개 수작업 배치의 발판을 각 스테이지에 맞는 18개의 개별 도트 조형물로 교체하고, 실제 착지 높이와 그림의 윗면을 정확히 맞춘다.

## Decision Summary

- 배치마다 머리·중간·끝 조각을 반복하지 않고 발판 하나에 완성된 스프라이트 한 장을 사용한다. 숲·광산의 자연물/작업 시설/폐허 테마 모두 구현한다.
- authored 배치에만 새 스프라이트를 사용한다. 저장된 레거시 배치와 바닥은 기존 렌더링을 이용한다.

## Implementation

### I01. 도트 조형물과 픽셀 정렬 패킹

- Related Files:
  - `public/assets/source/forest-arena-platforms-original.png`, `public/assets/source/mine-arena-platforms-original.png` :: 단계별 3×3 원본 시트; new
  - `public/assets/world/forest/arena-platforms.png`, `public/assets/world/mine/arena-platforms.png` :: 원본에서 생성한 런타임 시트; new
  - `src/game/content/arenaPlatformPresets.js` :: `ARENA_PLATFORM_PRESETS` — 스테이지별 배열 순서와 접촉 높이; read-only
  - `scripts/pack-art.mjs` :: `packAlignedArenaPlatformSheet` — 원본 셀과 접촉행 검증 및 배포 PNG 생성; modify
  - `docs/asset-provenance.md` :: 소재 기준, 도구, 원본/출력/재생성 명령; modify

#### Details

- **Signatures & Types**:
  ```typescript
  type StageId = 'forest-1' | 'mine-1';
  packAlignedArenaPlatformSheet(stageId: StageId, sourcePath: string, outputPath: string): Promise<void>;
  ```
- **Data & Schema Fields**:
  - 시트당 3열 × 3행, 셀 116×36, 전체 348×108 RGBA PNG. 행은 배치 순서, 열은 발판 순서, 프레임 번호는 `row*3+col`. 외곽 1픽셀은 완전 투명. 원본은 실제 사용할 정렬을 끝낸 투명 도트 시트다.
  - 카탈로그에서 `top=min(...topProfile)`을 계산한다. 해당 셀에서 실제 발판 로컬 X=0은 열 1이다. 각 `localX` 0..`w-1`에 대해 셀 좌표 `(localX+1,topProfile[Math.floor(localX/16)]-top+1)`가 첫 완전 불투명 픽셀이다. 그 위쪽과 발판 가로 바깥에는 불투명 픽셀이 없어야 한다. 각 열의 접촉행은 통나무·돌·작업대의 실제 상단색으로 그린다.
  - 발판 본체의 깊이는 착지선 기준 최대 24픽셀, 다층 배치의 위 발판은 최대 20픽셀. 장식·덩굴·지지대는 이 한계 안에서 아래로 늘어뜨리고 바닥부터 이어지는 장애물처럼 보이지 않게 한다. 외곽은 완전 투명 또는 불투명 알파만 쓰고 투명한 하단 공간을 남겨 검은 직사각형이 남지 않게 한다.

| Stage | 행(배치 ID) | 열 0 | 열 1 | 열 2 |
| :--- | :--- | :--- | :--- | :--- |
| 숲 | 0 forest-creek-v1 | 드러난 뿌리와 흙 | 굵은 이끼 통나무 | 가로로 뻗은 가지 |
| 숲 | 1 forest-terrace-v1 | 넓은 통나무, 좌측 이륙 공간 | 뿌리가 감싼 얇은 석조 선반 | 흙 밑으로 뻗은 뿌리 |
| 숲 | 2 forest-ruins-v1 | 짧고 휘어진 가지 | 넓은 이끼 석조 유적 | 갈라진 그루터기·통나무 |
| 광산 | 0 mine-rails-v1 | 침목이 드러난 단절된 레일 | 목재 작업대 | 광맥이 드러난 층진 바위 |
| 광산 | 1 mine-lift-v1 | 깎인 광맥 선반 | 얇은 철제 리프트 선반 | 목재 지지대 아래의 넓은 채굴 작업대 |
| 광산 | 2 mine-catwalk-v1 | 낮은 목재 발판 | 철제 레일과 침목이 붙은 통로 | 짧은 철제 캣워크와 버팀쇠 |

- **Execution Flow / Logic**:
  1. 숲 배경과 기존 맵의 녹색·황갈색, 광산 배경의 암회색·갈색과 황동색·광맥 하이라이트를 참고한다. 1배 월드 픽셀과 실제 게임 확대 모두에서 소재·상단·하단 실루엣이 읽히게 도트 아트를 만들고, 실루엣을 복제한 색상 변형만으로 9장을 채우지 않는다.
  2. 패커에서 카탈로그를 임포트하고 `sharp`로 PNG 형식/크기/알파/경계 및 위 규칙을 확인한다. 셀/열을 검증하다 불일치하면 스테이지, 배치 ID, 발판 인덱스, 셀 좌표를 포함한 오류를 던지고 잘못된 파일을 출력하지 않는다. 검사 완료된 이미지의 위치/크기를 수정하지 않고 PNG로 출력한다. 기존 `makeAtlas`는 알파 bbox를 잘라 중앙/바닥에 재배치하므로 새 시트에는 사용하지 않는다.
  3. 기존 전체 명령 `node scripts/pack-art.mjs`에서 새 패킹을 호출한다. `--arena-platforms-only` 지정 시 기존 셀 패킹/배경 추출은 생략하고 새 시트만 다시 생성한다. 소스 시트와 런타임 시트를 모두 포함하고, 문서에 실제 제작 방식 및 두 명령을 기록한다. 이전 런타임 PNG는 구형 런을 위해 보존한다.

### I02. Phaser 텍스처와 정확한 원점으로 그리기

- Related Files:
  - `src/game/assets/manifest.js` :: `ASSETS`, `preloadAssets`, `validateAssets` — 새 시트 등록; modify
  - `src/game/render/platforms.js` :: `authoredPlatformPlacements`, `terrainLayoutSignature` — 프레임과 원점의 순수 계산; modify
  - `src/game/scenes/StageScene.js` :: `syncTerrainViews` — authored 레이아웃 선택 렌더링; modify

#### Details

- **Signatures & Types**:
  ```typescript
  type AuthoredPlacement = { x: number; y: number; texture: 'forest-arena-platforms' | 'mine-arena-platforms'; frame: number };
  authoredPlatformPlacements(stageId: StageId, layout: AuthoredLayout): AuthoredPlacement[];
  terrainLayoutSignature(layout: AuthoredLayout | LegacyLayout, floor: Rect): string;
  ```
- **Execution Flow / Logic**:
  1. manifest에 `forest-arena-platforms` → `/assets/world/forest/arena-platforms.png`, `mine-arena-platforms` → `/assets/world/mine/arena-platforms.png`를 각각 프레임 116×36, count 9로 추가한다. 기존 텍스처 등록과 검증 방식을 사용한다.
  2. `authoredPlatformPlacements`는 `layout.mode==='authored'`와 stageId+저장된 presetId의 인덱스를 확인하고, 배열 순으로 `{x:platform.x-1,y:Math.min(...platform.topProfile)-1,texture,frame:presetIndex*3+platformIndex}`를 반환한다. 없는 배치/잘못된 모드는 `TypeError`; 다른 그림으로 대체하지 않는다. 함수는 원본 데이터를 바꾸지 않는다.
  3. `terrainLayoutSignature`는 기존 모드·바닥·프로필·variant에 authored일 때만 presetId를 포함한다. `syncTerrainViews`의 기존 바닥을 그린 직후 authored 분기를 열어 각 placement당 이미지 한 장을 `setOrigin(0,0).setDepth(-5)`로 추가한다. 새 그림 밑에 16×32 불투명 보정 사각형·윗줄을 그리거나 스프라이트를 반듯하게 늘이지 않는다. `terrainSignature`를 반영하고 기존 분기를 건너뛴다.
  4. `random` 프로필은 현재 16×32 모듈, 구형 무작위 및 고정 사각형은 현재 타일 이미지를 사용한다. 재시작/이어하기로 시그니처가 바뀌면 기존 텍스처 뷰를 파괴하고 다시 만들며 시그니처가 같으면 재사용한다.
  5. 새 이미지는 시각화 전용이다. 플레이어·적·발판 높이·체크포인트·카메라·타격과 관련된 시뮬레이션 입력을 그래픽 기준으로 옮기지 않는다.

### I03. 에셋·화면·이어하기 검증

- Related Files:
  - `test/assets.test.js` :: manifest, 셀 크기·알파, 시트 앵커; modify
  - `test/platform-rendering.test.js` :: 프레임, 정렬, 시그니처, 기존 렌더러; modify
  - `test/stage-lifecycle.test.js`, `test/save-store.test.js` :: 배치 복원 결과; read-only

#### Details

- 두 원본과 두 런타임 PNG의 348×108, 9개 프레임, 외곽 투명, 셀 내부의 실제 픽셀과 16픽셀별 첫 불투명 윗행을 검사한다. 원본/런타임의 앵커 위치가 일치해야 한다.
- T03의 6개 배치를 불러와 각 3개 placement의 텍스처, 프레임 0–8 범위와 정확한 `x/y`를 검증한다. 같은 레이아웃/바닥은 같은 시그니처를 가지며 presetId가 달라지면 다시 그린다. 기존 모듈 프레임/Rect 시그니처의 의미는 보존한다.
- 브라우저 리뷰는 별도 테스트 프로필에서 6개 배치를 순회한다. 필요하면 Vite 개발 서버 모듈에서 `createStageRun(stage,{}, {seed})`와 `snapshotStageRun`을 임포트해 테스트 저장 `freshSave()`의 run에 넣고 다시 로드해 하드 이어하기로 호출한다. seed `0`, `251`, `1112`는 각각 0·1·2행이다. 실제 사용자의 저장 및 UI에는 디버그 조작을 추가하지 않는다. 각 배치를 확대해 보행 높이, 하단 빈 공간, 다층 가시성을 확인한다. 구형 프로필과 사각형으로 복원해서 빈 발판도 없는지 확인한다.

## Acceptance Criteria

- [x] 숲·광산별로 9개 도트 조형물이 실제 게임에 표시되고 단계마다 구별된다.
- [x] 발판 모양의 윗면은 이동 충돌 표면과 일치하며, 위/아래 층 모두에서 착지와 공격을 읽을 수 있다.
- [x] 두 시트 모두 독립 패킹 명령으로 재생성 가능하고, 예전 저장의 발판도 화면에 표시된다.

## Validation

- `node scripts/pack-art.mjs --arena-platforms-only` — 런타임 PNG 2개 생성. 원본 복사본을 둔 임시 폴더에서 전체 패킹 명령도 성공했다.
- `node --test test/assets.test.js test/platform-rendering.test.js test/stage-lifecycle.test.js test/save-store.test.js` — 39개 통과. 전체 `npm.cmd test` 203개 및 `npm.cmd run build` 성공, 기존 Vite 번들 크기 경고.
- 격리 Orca 브라우저에서 하드 이어하기로 숲·광산 스테이지를 열었다. 6개 새 배치를 각각 그려 스크린샷을 확인하고, 프레임 0–8과 원점·스케일, 캐시 재사용을 검사했다. 두 스테이지의 옛 프로필·사각형 저장은 기존 텍스처를 표시했다.
- 브라우저 테스트 입력으로 두 다층 배치에서 바닥→아래→위→아래에 착지했다. 숲의 뿌리 공격 예고·발동은 아래·위 층의 표면과 일치했다.

## Commit Message

```text
feat(art): draw dedicated arena platform sprites

Plan: 2026-11-20-menu-and-arena-redesign
Phase: P01-menu-and-arena
Task: T04-arena-platform-art

- Add stage platform silhouettes aligned to the authored surfaces
- Render a whole structure per platform and retain legacy textures
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: see the commit that marks this blueprint done
