# Task: T01 공격 에셋 원화·패킹·공통 스프라이트 계약

## Status: done

## Goal
세 보스의 외형을 보존한 공격 프레임과 독립 외부 공격 PNG를 실제로 제작·등록하고, 후속 Task가 피해 영역과 틱만 전달해 표시할 수 있는 공통 계약을 완성한다. 이미지가 없는 텍스처를 등록하거나 코드 도형을 새 원화 대신 사용하지 않는다.

## Decision Summary
- 픽셀 아트·투명 배경·본체 게임상 크기를 유지한다. 자세는 변경 가능하며 긴 팔·꼬리·원거리 공격은 본체 프레임과 분리한다.
- 먼저 실제 원화와 패킹 출력을 함께 완성한다. 이 Task는 뿌리 시간·등장 시간·피해 규칙을 변경하지 않는다. 이후 T02~T04가 새 외부 에셋을 게임 상태에 연결한다.

## Implementation

### I01. 기준선 보존과 원화 제작
- Related Files:
  - `public/assets/characters/boss/poses.png`, `public/assets/characters/machine/poses.png`, `public/assets/characters/worm/poses.png` — 현재 외형·발 위치·고정 프레임 기준; read-only until packing
  - `public/assets/source/boss-base-poses-v1.png`, `mine-machine-base-poses-v1.png`, `mine-worm-base-poses-v1.png` — 위 런타임 시트의 최초 원본 복사; new
  - `public/assets/source/boss-body-v2-original.png`, `mine-machine-body-v2-original.png`, `mine-worm-body-v2-original.png` — 6열×4행 본체 편집 원화; new
  - `public/assets/source/boss-forest-fx-original.png`, `boss-machine-fx-original.png`, `boss-worm-fx-original.png` — 4열×4행 외부 효과 원화; new
  - `public/assets/source/worm-entrance-fx-original.png` — 4열×2행 등장 효과 원화; new

#### Details
- **Signatures & Types**: 원화 제작은 함수 구현이 아니라 이미지 작업이다. 실행 때 `imagegen` 스킬을 읽고 기존 로컬 참조 이미지를 먼저 관찰한 뒤 이미지 생성·편집 도구로 제작한다. 결과는 위 정확한 파일명으로 보관한다.
- **Data & Schema Fields**:
  - 기준선 시트는 최초 한 번만 복사하고 이후 패킹에서 덮어쓰지 않는다. 이미 있으면 PNG 치수와 프레임 수를 확인하고 재사용한다.
  - 숲·기계 런타임 본체는 112×112, 24프레임(672×448). 벌레는 128×112, 24프레임(768×448).
  - 본체는 기존 머리·몸통·갑각·드릴·궤도·청록 광물의 디자인, 색, 발 위치를 따른다. 편집 프레임의 공통 발 기준선과 몸통 크기는 고정한다. 공격 사거리만큼 몸통을 확대하지 않는다.
  - 본체 원화의 나머지 셀도 읽을 수 있는 그림이어야 하지만, 아래 보존 프레임은 패킹에서 기준선의 정확한 픽셀로 복원한다.

| 본체 | 교체 프레임과 정확한 의미 | 기준선에서 보존 |
|---|---|---|
| 숲 `boss` | 4~5 가지팔 당기기; 6~8 휘두르기; 9 팔 크게 들기; 10 바닥 찌르기 진행; 11 팔을 꽂은 유지 자세; 12 힘을 주며 움찔; 13~14 한 팔 높이 들기; 15~17 한 팔 내려찍기 | 0~3, 18~23 |
| `machine` | 4~5 드릴 가속·시각적 차체 젖힘; 6~7 돌진; 8~9 천장 낙석 유발 준비; 10~11 실행; 12~13 집게 높이 들기; 14~15 지면 타격; 16~18 붉은 발사부와 미세 떨림 준비; 19~20 분출 동작 | 0~3, 21~23 |
| `worm` | 4~5 입 부풀기·액체 흘림; 6~7 짧은 입 주변 분사; 8~9 지면 잠복; 10~11 돌출; 12~13 몸 비틀기; 14~15 꼬리 뿌리부 휘두르기; 18~19 낮은 돌진 준비; 20~21 기어 돌진 | 0~3, 16~17, 22~23 |

- 본체 공격 원화는 기본적으로 왼쪽을 향한다. 숲도 공격 프레임을 왼쪽 기준으로 통일한다. 후속 렌더러가 실제 공격 방향으로 뒤집는다. 숲의 보존 idle·intro·전환·사망 프레임은 기존 방향을 유지한다.
- 몸통과 연결될 짧은 팔·꼬리 뿌리부만 본체에 둔다. 긴 가지팔·꼬리, 공중 광물·낙석, 긴 산성 빔을 본체 셀에 그려 넣지 않는다. 특히 현재 벌레 6번 프레임처럼 긴 분사줄기가 이미 있는 그림을 그대로 재사용해 별도 투사체와 중복하지 않는다.
- 회전 비행 아이콘인 광물과 산성액은 +X를 앞쪽으로 그린다. 빛 꼬리·점액 방울은 반대쪽에 두며, 후속 렌더러는 atan2(vy,vx)만으로 방향을 맞춘다.

| 외부 시트 | 프레임 배치 | 내용과 접점 |
|---|---|---|
| forest | 0~3 가지팔; 4~7 활성 뿌리; 8~11 뿌리 회수; 12~15 내려찍기 팔·흙·나무 파편 | 가지·내려찍기는 왼쪽 공격 기본. 본체 접점은 core의 오른쪽 가장자리. 뿌리는 아래에서 발생·회수 |
| machine | 0~3 충격파; 4~7 낙석; 8~11 광물; 12~15 천장 작은 돌·먼지 | 충격파는 왼쪽 진행의 주황 반달과 약한 뒤쪽 먼지. 낙석은 회갈색. 광물은 청록 결정과 짧은 빛 꼬리 |
| worm | 0~3 갑각 꼬리; 4~7 산성액; 8~11 산성 웅덩이; 12~13 잠복 흔적·균열; 14~15 돌출·흙 파편 | 꼬리는 왼쪽 공격이며 본체 접점은 core 오른쪽. 점액은 연두색·불규칙한 방울. 웅덩이는 기포와 명확한 가장자리 |
| entrance | 0~3 바닥 파괴·먼지·큰 검은 벌레 실루엣; 4~7 암전 후 바닥 파편·먼지 가라앉기 | 전반은 얼굴·광물·갑각 세부가 안 보이는 검은 실루엣. 후반에는 벌레 본체를 그리지 않아 기존 본체와 중복하지 않음 |

- **Execution Flow / Logic**:
  1. Precondition & Validation: 사용자 인터뷰의 전체 보스 범위와 플레이어 피격 제외를 적용한다. 현재 시트 3종을 파일로 관찰하고 기준선 PNG를 보존한다.
  2. Core Processing: 참조 이미지를 사용해 본체 편집 3장, 외부 효과 3장, 등장 효과 1장 총 7개 원화를 제작한다. 격자·프레임 순서·투명 간격을 프롬프트에 명시한다. 각 셀 중심·바닥 기준선을 고정한다.
  3. Error & Exception Handling: 원화가 불투명하거나 프레임이 합쳐졌으면 해당 원화를 다시 편집한다. 빈 셀·도형 대체·누락 파일을 정상 자산으로 처리하지 않는다. 생성 도구를 사용할 수 없으면 필요한 파일명을 기록하고 이 Task를 미완료로 둔다.
  4. State Transition & Return: 실제 PNG와 패킹 결과를 연락 시트 및 개별 프레임 파일로 관찰한다. AI의 원화와 런타임 결과를 모두 확인하고 관찰 결과를 이 Task Progress에 기록한다. 직접 게임 플레이는 하지 않는다.

### I02. 앵커를 보존하는 결정적 패킹과 등록
- Related Files:
  - `scripts/pack-art.mjs` :: `makeAtlas`, `specs` — 기존 패킹과 신규 고정 격자 패킹 연결; modify
  - `public/assets/characters/{boss,machine,worm}/poses.png` — 본체 출력; modify
  - `public/assets/effects/boss/forest.png`, `machine.png`, `worm.png`, `worm-entrance.png` — 신규 출력; new
  - `src/game/assets/manifest.js` :: `ASSETS`, `ANIMATIONS`, `preloadAssets`, `validateAssets` — 실제 생성 파일 등록; modify

#### Details
- **Signatures & Types**:
  ```typescript
  type FixedGridSpec = {
    source: string; dest: string; cols: number; rows: number;
    frameWidth: number; frameHeight: number;
    baseline?: string; replaceFrames?: readonly number[];
  };
  makeFixedGrid(spec: FixedGridSpec): Promise<void>;
  ```
- **Data & Schema Fields**:
  - 세 외부 공격 시트: 4×4, 런타임 셀 128×128, 시트 512×512, count=16. 각각 texture `boss-forest-fx`, `boss-machine-fx`, `boss-worm-fx`.
  - 등장 시트: 4×2, 런타임 셀 256×192, 시트 1024×384, count=8. texture `worm-entrance-fx`.
  - 공격 효과의 고정 core는 `{x:16,y:16,w:96,h:96}`다. 고대비 공격 물체는 core 안에 두고, 약한 잔상·먼지에만 바깥 여백을 사용한다. 회전하는 광물·점액의 고대비 핵심은 core 중앙의 반지름 48 원 안에 둔다.
  - 등장 효과의 지면 접점은 셀 중앙 아래 `{x:128,y:176}`다. 런타임 표시 원점은 이 접점이며, 후속 T04가 게임 지면에 맞춘다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: source 파일, 양수 정수 격자, 너비/열·높이/행의 정수 나눗셈, 예상 프레임 수, 투명 테두리를 검사한다. 누락·잘못된 치수는 파일명/셀 번호를 포함한 Error로 중단한다.
  2. Core Processing: 신규 시트는 원본의 고정 격자 전체 셀을 잘라 `nearest`로 고정 셀 크기에 맞춘다. 셀별 trim·바운딩 박스 재중앙 정렬을 하지 않는다. 프레임 간 기준선과 core 위치가 움직이면 안 된다. 알파는 유지하고 셀 가장자리 1px는 완전 투명하게 한다.
  3. 본체 3종만 기존 `specs`의 원래 바운딩 박스 패킹 대상에서 제외한다. 새 편집 셀을 고정 격자로 패킹하고, 보존 프레임은 기준선 시트의 같은 칸 픽셀로 합성한다. 다른 영웅·일반 적·배경·광차·기존 `mine-mineral` 출력은 기존 알고리즘을 그대로 사용한다.
  4. Error & Exception Handling: 출력 전 입력 전체를 검증한다. 새 원화가 없는데 이전 시트나 임시 도형으로 조용히 성공시키지 않는다. 반복 실행에서 기준선 이미지를 새 출력으로 다시 캡처하지 않는다.
  5. State Transition & Return: 패킹 두 번의 출력 바이트 또는 픽셀 해시가 같다. 보존 본체 프레임 픽셀은 기준선과 완전히 같다. `ASSETS`에 실제 4개 외부 시트를 등록하고 기존 본체의 key·count·프레임 의미는 보존한다. 루트용 `boss.rootHold`(11), `boss.rootPulse`(12) clip 별칭을 추가하고 기존 clip은 유지한다.

### I03. 틱 기반 효과 프레임과 스프라이트 표시 계약
- Related Files:
  - `src/game/assets/bossFx.js` — FX clip 메타데이터와 순수 프레임/좌표 변환; new
  - `src/game/render/AttackSpriteLayer.js` — ID 기반 표시 객체 수명; new
  - `test/boss-fx.test.js`, `test/attack-sprite-layer.test.js` — 좌표·프레임·제거·정리 검증; new
  - `test/assets.test.js`, `test/animation-contract.test.js` — 실제 PNG 계약·보존 프레임 검사; modify

#### Details
- **Signatures & Types**:
  ```typescript
  type Rect = {x:number;y:number;w:number;h:number};
  type FxItem = {id:string;texture:string;frame:number;x:number;y:number;
    width:number;height:number;flipX:boolean;rotation:number;alpha:number;depth:number};
  export const BOSS_FX_CLIPS: Readonly<Record<string, {
    texture:string;frames:readonly number[];frameWidth:number;frameHeight:number;
    core:Rect|null;loop:boolean;periodTicks:number;anchor?:{x:number;y:number};
  }>>;
  export function sampleFxFrame(key:string,ageTicks:number,durationTicks?:number):number;
  export function fxItem(key:string,id:string,rect:Rect,ageTicks:number,
    durationTicks?:number,options?:{flipX?:boolean;rotation?:number;alpha?:number;depth?:number}):FxItem;
  export class AttackSpriteLayer {
    constructor(scene:object); sync(items:readonly FxItem[]):void; destroy():void;
  }
  ```
- **Data & Schema Fields**:
  - registry keys: `forest.branch`=0~3/12틱, `forest.rootActive`=4~7/12틱, `forest.rootRetract`=8~11/12틱, `forest.slam`=12~15/12틱.
  - `machine.wave`=0~3/12틱 loop, `machine.rock`=4~7/16틱 loop, `machine.mineral`=8~11/12틱 loop, `machine.ceiling`=12~15/60틱.
  - `worm.tail`=0~3/18틱, `worm.acid`=4~7/12틱 loop, `worm.pool`=8~11/24틱 loop, `worm.burrowWarning`=12~13/16틱 loop, `worm.burrowBurst`=14~15/18틱.
  - `entrance.burst`=0~3/24틱, `entrance.settle`=4~7/96틱, canvas 256×192. 두 등장 clip은 core=null, anchor=(128,176)으로 두므로 `fxItem`으로 호출하지 않고 T04가 직접 FxItem을 만든다.
  - `FxItem`에는 엔진 객체·피해량·난수·독립 실시간 타이머가 없다. `AttackSpriteLayer`는 내부 `Map<string, sprite>`만 가지며 저장 데이터에 들어가지 않는다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 알려진 key, 유한한 값, `ageTicks>=0`, `durationTicks>0`, `rect.w/h>0`을 검사한다. 잘못된 key나 core=null clip을 fxItem으로 호출하면 TypeError, 잘못된 수치는 RangeError다. sampleFxFrame은 core=null인 등장 clip에도 사용 가능하다.
  2. Core Processing: 프레임은 `floor(age*frameCount/duration)`으로 구한다. loop는 duration 모듈로, 일회 clip은 마지막 프레임에 고정한다. `scaleX=rect.w/core.w`, `scaleY=rect.h/core.h`; 표시 크기는 canvas 크기에 각 scale을 곱한다. core가 canvas 중앙에 있어 표시 중심은 rect 중심이다. 기본 alpha=1, rotation=0, depth=4.4다.
  3. Layer는 각 ID에 스프라이트 하나를 재사용하고 origin=(.5,.5), texture/frame/position/displaySize/flip/rotation/alpha/depth를 매 sync에 적용한다. 입력에 사라진 ID는 destroy한다. 다른 소유 레이어의 객체를 건드리지 않는다. `destroy()`는 중복 호출해도 안전하다.
  4. Error & Exception Handling: 등록 텍스처가 없으면 명시적 Error로 실패한다. 자산 누락을 임시 삼각형·경고 상자로 숨기지 않는다. 표시 계층은 run을 mutate하거나 피해 이벤트를 발생시키지 않는다.
  5. State Transition & Return: 일시정지된 같은 입력에는 같은 frame·좌표를 표시하고, 복구로 경과 틱이 줄어도 이전 실시간 타이머를 사용하지 않는다.

## Acceptance Criteria
- [x] 7개 실제 원화, 3개 보존 기준선, 3개 본체 출력, 4개 외부 효과 출력이 존재한다.
- [x] 본체 비공격 보존 프레임과 발 위치·크기가 유지되고, 외부 물체가 본체에 중복으로 구워져 있지 않다.
- [x] 새 패킹의 두 번 실행 결과가 같고, 모든 PNG의 투명 테두리·프레임 수·비어 있지 않은 셀을 검사한다.
- [x] 프레임 경계·좌우 뒤집기·core→피해 Rect 변환·삭제/재생성·destroy를 검증한다.
- [x] 기존 영웅·일반 적·광차·광산 광물의 출력 픽셀을 불필요하게 바꾸지 않는다.
- [x] 실제 파일 관찰과 자동 검증을 구분해 기록하며 게임 직접 플레이를 하지 않는다.

## Validation
- `node scripts/pack-art.mjs` — 실제 PNG 패킹, 재실행 해시 동일 확인.
- `node --test test/assets.test.js test/animation-contract.test.js test/boss-fx.test.js test/attack-sprite-layer.test.js` — 실제 이미지·공통 계약 검사 통과.
- `npm.cmd run build` — 새 텍스처 등록을 포함한 빌드 통과. 기존 번들 경고는 관찰값으로 기록한다.

## Commit Message
```text
feat(assets): add anchored boss attack sprite sheets

Plan: 2026-11-10-boss-attack-assets
Phase: P01-asset-presentation
Task: T01-asset-pipeline-and-sheets

- Preserve boss identity and fixed-frame body baselines
- Add separate attack sheets and deterministic sprite contracts
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in phase.md after commit
- Built-in imagegen으로 원화 7개를 제작했다. 기계 FX의 배경 혼입은 재편집으로 제거했다. 생성기의 가변 캔버스를 셀 내부 상대 좌표를 유지하는 고정 격자로 정규화했으며, 원본 생성 결과는 기본 생성 폴더에 보존했다.
- 런타임 PNG 7종을 직접 파일로 관찰했다. 본체 보존 프레임 픽셀 동일, 투명 테두리·셀 수 검사와 패킹 재실행 SHA256 동일을 확인했다. 알파 1~4의 매팅 잔여색은 가시 반투명 효과를 유지하며 정리했다.
- 지정 집중 검사 13/13 통과. 프로덕션 빌드 통과, 기존 약1,458KB 번들 경고 유지. 게임 직접 플레이는 하지 않았다.
