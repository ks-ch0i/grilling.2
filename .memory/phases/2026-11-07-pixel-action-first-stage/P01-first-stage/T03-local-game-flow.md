# Task: T03 타이틀·일시정지·자동 저장과 기록

## Status: done

## Goal
타이틀에서 새 도전·이어하기·기록·설정을 사용하고, 일반 모드 스테이지의 체크포인트와 소비된 회복 아이템·사망 횟수·시간이 브라우저 재실행 후 일관되게 복원되도록 한다.

## Decision Summary
- 선행 T01은 독립 Phaser/Vite 게임과 60Hz 플레이어, T02는 `forest-1`·일반 적 3종·2단계 보스·체크포인트 1개와 `StageScene.exportCheckpointData()/restoreCheckpointData(data)`, stage 이벤트를 제공한다.
- 자동 저장 한 칸, 최근 기록과 **최단 시간** 최고 기록, 도전 중 누적 시간(사망 재도전 포함, 일시정지·종료 중 제외), 하트 3칸·회복 아이템 소비 유지. 백업/복구 파일, 서버·랭킹·계정, 하드 모드, 추가 스테이지는 첫 버전 밖이다.
- PC 웹, 조작 A/D·Space·좌클릭·Shift·E·Esc. 이야기 도입과 인게임 튜토리얼은 넣지 않고 메뉴의 조작 설명만 제공한다.

## Implementation

### I01. 로컬 저장 스키마와 유효성
- Related Files:
  - `src/game/storage/saveStore.js` :: `parseSave`, `loadSave`, `writeSave`, `freshSave`, `recordCompletion`; new
  - `test/save-store.test.js`; new

#### Details
- 브라우저 namespace는 `pixel-action.save.v1`; Knight Run의 키·계정·API에 접근하지 않는다. `localStorage`에 JSON 문자열 하나만 원자적으로 `setItem`한다. 기본값:
  ```ts
  type Checkpoint='start'|'mid';
  type Run={stageId:'forest-1',checkpoint:Checkpoint,consumedPickupIds:string[],elapsedTicks:number,deaths:number};
  type Record={elapsedTicks:number,deaths:number};
  type Save={version:1,run:Run|null,best:Record|null,recent:Record|null,
    settings:{musicVolume:number,sfxVolume:number,screenShake:boolean}};
  const defaults:Save={version:1,run:null,best:null,recent:null,
    settings:{musicVolume:0.5,sfxVolume:0.7,screenShake:true}};
  ```
- `freshSave():Save`, `parseSave(raw:string|null):{ok:true,save:Save}|{ok:false,reason:'invalid'|'unsupported-version'}`, `loadSave(storage:Storage):LoadResult`, `writeSave(storage:Storage,save:Save):{ok:boolean,reason?:'unavailable'|'invalid'}`, `recordCompletion(save:Save,record:Record):Save`. 진짜 localStorage 대신 주입 storage를 테스트한다. 완료 시 `recent=record`, `best`가 없거나 새 elapsedTicks가 **더 작을 때만** best 갱신하며 동점이면 기존 best 유지; 두 기록 각각의 사망 횟수와 시간이 함께 남고 `run=null`.
- strict validation: v1 정확한 객체 shape, finite한 정수 elapsedTicks/deaths >=0, stageId 및 checkpoint enum, consumed ids는 T02 목록 내 유일한 문자열, record의 두 숫자는 안전한 정수, volume 0..1 finite·shake boolean. null은 저장 없음의 정상 상태, JSON syntax 오류/타입·범위 위반과 미래 version은 오류다. 오염된 데이터는 자동 덮어쓰지 않는다. 읽기 금지/용량/쓰기 실패는 예외를 catch해 결과로 반환하고 현재 게임은 메모리에서 계속할 수 있도록 경고와 재시도 수단을 제공한다. 실패한 저장을 성공처럼 표시하지 않는다.
- 새 게임은 `run={stageId:'forest-1',checkpoint:'start',consumedPickupIds:[],elapsedTicks:0,deaths:0}`로 초기화하면서 기존 best/recent/settings는 보존한다. 진행 중인 run을 새로 시작할 때 기존 진행이 초기화됨을 화면에 표시하고 명시적 재시작 동작을 제공한다. 기록 삭제·백업 파일 UI는 추가하지 않는다.

### I02. 스테이지 저장·부활·시간 경계
- Related Files:
  - `src/game/scenes/StageScene.js` :: `exportCheckpointData`, `restoreCheckpointData`, 이벤트 구독; modify
  - `src/game/storage/runCoordinator.js` :: `createRunCoordinator`; new
  - `test/run-coordinator.test.js`, `test/stage-lifecycle.test.js`; new/modify

#### Details
- `createRunCoordinator({store, now?, onStorageError?})`는 T02의 `stage:checkpoint|pickup|death|clear` 이벤트와 `exportCheckpointData`를 구독한다. 이벤트 저장은 상태 변경 **이후** `checkpoint,consumedPickupIds,elapsedTicks,deaths`를 같은 save 객체로 commit; 초당 한 번과 `visibilitychange(hidden)`, `pagehide`, pause→title에서 마지막 snapshot을 flush한다. 무한 이벤트 구독을 막고 scene shutdown에서 모두 해제한다. 급작스러운 프로세스 강제 종료 시 마지막 주기 뒤 최대 1초가 손실될 수 있음을 기록한다.
- `elapsedTicks`는 플레이 중 60Hz tick을 기준으로 시작→승리까지 증가한다. 적 공격 준비·보스 연출·죽음/부활 애니메이션 및 반복 도전 시간은 포함한다. Esc pause와 `document.hidden` 상태, 타이틀/설정 체류 및 브라우저가 닫힌 시간은 제외한다. PC가 백그라운드에서 돌아온 뒤 누산된 큰 delta가 tick에 더해지지 않게 reset한다. 표시 시 `Math.floor(elapsedTicks/60)`으로 mm:ss를 만들되 저장 및 비교는 정수 tick으로 한다.
- 죽음은 사망 수를 정확히 한 번 증가시킨 뒤 체크포인트 위치, HP 3, 모든 적·보스·투사체 초기 상태로 부활한다. `consumedPickupIds`는 절대로 비우지 않는다. 게임을 닫았다 이어하기를 해도 마지막 checkpoint에서 동일 소비 목록과 사망 수·누적 시간으로 시작한다. 종료 직전 저장 실패 시 오류 UI를 통해 사용자에게 알리고, 이어하기가 안전히 저장됐다고 말하지 않는다.
- clear 이벤트는 정확히 한 번만 `recordCompletion`을 실행하고 타이머를 멈춘다. 결과화면은 이번 클리어 시간과 사망 횟수, 최고 기록과 타이틀 복귀를 표시한다. 재시작/씬 전환 시 listener와 타이머가 누적돼 사망 수/시간/결과가 두 번 기록되지 않게 idempotence guard를 둔다.

### I03. 타이틀·설정·일시정지 UI
- Related Files:
  - `src/game/scenes/TitleScene.js`, `src/game/scenes/SettingsScene.js`, `src/game/scenes/ResultScene.js` — 메뉴와 기록; new
  - `src/game/ui/menu.js`, `src/game/config.js`, `src/main.js`; new/modify
  - `src/game/scenes/StageScene.js` — Esc overlay와 저장 경계; modify
  - `test/menu-state.test.js`; new

#### Details
- 타이틀 메뉴 **시작·이어하기·기록·설정**. 시작은 새 run이며 이전 최고·최근 기록을 보존한다. 이어하기는 검증된 `run`이 있을 때만 활성화하고 클릭하면 저장된 checkpoint에 복귀한다. 기록은 최고·최근을 각각 mm:ss와 사망 횟수로 표시하고 기록이 없으면 빈 상태 표시. 설정에서 조작법 A/D, Space, 좌클릭, Shift, E, Esc를 확인한다. 첫 스테이지 진입 시 서사·조작 튜토리얼은 띄우지 않는다.
- Esc는 플레이 ↔ 일시정지 토글이고 pause는 키·마우스 누름과 공격 버퍼, 고정 tick·물리·적·보스·기록 시간을 정지시킨다. 메뉴는 **재개·설정·처음 화면**을 제공한다. 게임 포커스를 잃어도 자동 pause하고 재개는 명시적 입력으로 한다. 설정에서 music/sfx 0..1과 screenShake on/off를 보존하고, 전체화면은 사용자 버튼 동작에서 `document.documentElement.requestFullscreen()` / `document.exitFullscreen()`을 호출한다. 거부·미지원 시 오류 표시 후 게임은 계속되며 전체화면 상태는 브라우저의 `fullscreenchange`로 읽는다.
- UI는 PC 키보드/마우스로 사용 가능하게 포커스 순서·명확한 레이블을 제공하고, 설정을 닫으면 원래 타이틀 또는 pause로 돌아간다. 사용 중인 씬 이외에 입력이 전달되지 않도록 overlay가 입력을 차단한다. HUD에는 하트, 스테이지, 보스 HP(등장 시)만 있고 남은 적 수는 없다.

## Acceptance Criteria
- [x] 새 게임·이어하기·기록·설정·Esc pause가 실제 브라우저에서 사용 가능하다.
- [x] 브라우저를 새로고침/종료 후 같은 checkpoint와 소비 아이템·사망 수·시간을 복구한다. 모든 적은 복귀 때 재생성된다.
- [x] 최고/최근 기록은 한 도전의 시간과 사망 횟수가 섞이지 않고 최단 시간 기준이다.
- [x] pause·창 숨김·종료 중 시간은 제외되고 사망/재도전 시간은 누적된다.
- [x] 저장 장애·손상·미지원 스키마는 진행 중인 데이터를 조용히 덮지 않고 명확히 알린다.

## Validation
- `npm.cmd test` — 저장 검증·storage 오류·동점 기록·checkpoint/consumed ids·누적 시간/pause/clear 중복 테스트와 기존 테스트 통과.
- `npm.cmd run build`; `git diff --check`.
- PC 브라우저에서 체크포인트→회복 아이템 소비→사망→새로고침→이어하기→보스 클리어·기록 확인, Esc·탭 이동·전체화면·음량 저장과 localStorage 금지 상태를 검증한다. 재실행 결과를 기록한다.

## Commit Message
```text
feat(game): add local checkpoint saves and menu flow

Plan: 2026-11-07-pixel-action-first-stage
Phase: P01-first-stage
Task: T03-local-game-flow

- Persist checkpoint, consumed pickups, attempt time and records
- Add title, pause, settings and result screens
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 이 청사진을 포함한 구현 커밋

- 검증: 자동 테스트 39개, 프로덕션 빌드와 공백 검사 통과.
- 브라우저 자동 조작으로 체크포인트, 회복 소비, 사망, 새로고침, 이어하기 및 실제 보스 클리어와 기록을 확인했다.
- 별도 브라우저 프로세스를 종료하고 다시 열어 소비 아이템과 사망 수, 시간, 적 재생성을 확인했다.
- 저장 차단·손상·미지원 버전, 일시정지와 숨김 시간, 설정 저장, 새 게임 확인, 일반 Chrome 전체화면 진입·종료를 확인했다.
- 강제 종료 시 마지막 주기 저장 뒤 최대 1초의 진행 시간이 손실될 수 있다.
- 빌드에는 Phaser 번들 크기 경고가 남아 있다.
