# 보스 에셋 생성·패킹 기록

- Mode: built-in `image_gen.imagegen`, transparent_background=true. CLI/API fallback을 사용하지 않았다.
- References: 기존 `public/assets/characters/{boss,machine,worm}/poses.png`를 파일로 관찰하고 각 보스 참조로 사용했다.
- Raw generated output root: `C:\Users\USER\.codex\generated_images\01a1b489-b744-7712-9451-1ae5eb72b4f6`.
- 생성 파일은 프로젝트의 아래 원화로 복사했다. 가변 출력 크기는 nearest 기반의 고정 격자로 정규화했으며 셀별 trim·재중앙 정렬은 사용하지 않았다. 외부 시트는 동일한 여백 변환으로 core 안에 배치했다.

## Prompt set
| 파일 | 요청한 최종 프롬프트의 내용 |
|---|---|
| source/boss-body-v2-original.png | 참조 숲 수호자의 외형·갈색 목질·자주색 잎·발 위치를 유지한 투명6×4/24프레임. 왼쪽 기준 가지팔 준비/휘두르기, 큰 팔 접지/유지/움찔, 한 팔 내려찍기. 긴 외부 물체·원거리 뿌리는 본체에 넣지 않음 |
| source/mine-machine-body-v2-original.png | 같은 청동 궤도 채굴기·드릴·집게·청록 광물 유지. 투명6×4, 드릴 가속/돌진·낙석 유발·집게 지면 타격·붉은 발사부·광물 발사 반동. 원거리 물체는 외부 시트로 분리 |
| source/mine-worm-body-v2-original.png | 같은 회갈색 갑각·청록 광물·입 유지. 투명6×4, 입 부풀기와 짧은 점액 분사·잠복/돌출·꼬리 뿌리부·기어 돌진. 기존 긴 산성 빔과 긴 꼬리 궤적을 본체에서 제거 |
| source/boss-forest-fx-original.png | 투명4×4. 줄별4프레임: 왼쪽 가지팔/짧은 잔상, 여러 갈래 활성 뿌리, 회수 뿌리, 한 팔 내려찍기/나무·흙 파편. 몸통·UI·글자 없이 오른쪽 접점 유지 |
| source/boss-machine-fx-original.png | 투명4×4. 왼쪽 주황 반달 충격파, 회갈색 낙석, +X 방향 청록 결정과 짧은 빛 꼬리, 천장 먼지/잔돌. 재편집에서 체크무늬·흰 배경·회색 비네팅 제거 및 모든 반달 프레임의 선명한 핵심 유지 |
| source/boss-worm-fx-original.png | 투명4×4. 왼쪽 갑각 꼬리와 청록 짧은 잔상, +X 연두 점액과 방울, 기포 웅덩이, 지면 균열/흙더미/돌출 파편. 본체 없이 core와 접점 고정 |
| source/worm-entrance-fx-original.png | 투명4×2. 상단 바닥 파괴·흙먼지·상승하는 큰 검은 벌레 실루엣, 얼굴/눈/갑각 세부 없음. 하단은 벌레 없이 가라앉는 먼지·바닥 파편. 지면 접점 고정 |

## Saved runtime paths
- `public/assets/characters/boss/poses.png`
- `public/assets/characters/machine/poses.png`
- `public/assets/characters/worm/poses.png`
- `public/assets/effects/boss/forest.png`
- `public/assets/effects/boss/machine.png`
- `public/assets/effects/boss/worm.png`
- `public/assets/effects/boss/worm-entrance.png`

## Verification and limits
- 실제 PNG의 형상·프레임 순서·투명도를 파일로 관찰했다. 자동 검사로 프레임 수, 알파, 비어 있지 않은 셀, 보존 프레임의 픽셀 동일, 표시 좌표 및 재사용·제거를 확인했다.
- 실제 게임 조작·새 버전 청취를 수행하지 않았다. 생성 원화의 스타일은 참조를 따르지만 물리적으로 보이는 타격감의 최종 평가는 사람 플레이와 구분한다.
- 소스 그림의 거의 투명한 매팅 잔여 RGB는 패킹에서 alpha<8만 투명 검정으로 정규화한다. 가시적인 반투명 잔상은 유지한다.
