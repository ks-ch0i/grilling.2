import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const settings=readFileSync(new URL('../src/game/scenes/SettingsScene.js',import.meta.url),'utf8');
const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');
const overview=readFileSync(new URL('../docs/presentations/grill-me-project-overview.html',import.meta.url),'utf8')
  .replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[^"]+/g,'');

test('in-game settings explains the current controls and parry outcomes',()=>{
  assert.match(settings,/검 공격: 좌클릭/);
  assert.match(settings,/30틱 전 일반 베기/);
  assert.match(settings,/30틱 이후 준비되면 내려찍기/);
  assert.match(settings,/착지 후 바로 일반 공격 가능/);
  assert.match(settings,/발판이 있으면 내려가기, 없으면 점프/);
  assert.match(settings,/원거리 방패: Q 길게 누르기/);
  assert.match(settings,/근접 패링: 우클릭/);
  assert.match(settings,/입력 후 3초 대기/);
  assert.match(settings,/퍼펙트는 피해 없음/);
  assert.match(settings,/37틱≈0\.618초/);
  assert.match(settings,/23틱≈0\.382초/);
  assert.match(settings,/일반 패링[^\n]*반 칸/);
  assert.match(settings,/일반 패링은 작은 청록 섬광/);
  assert.match(settings,/퍼펙트 패링은 강한 섬광과 전용 효과음/);
  assert.match(settings,/방어 성공 후 1초 보호/);
});

test('README and project overview use the same current bindings and outcomes',()=>{
  for(const guide of [readme,overview]){
    assert.match(guide,/좌클릭|마우스 왼쪽/);
    assert.match(guide,/착지 후 (?:다음 입력부터 일반 공격 가능|바로 일반 공격 가능|즉시 일반 공격)/);
    assert.match(guide,/Q.*방패|방패.*Q/);
    assert.match(guide,/우클릭.*패링|패링.*우클릭/);
    assert.match(guide,/37틱/);
    assert.match(guide,/23틱/);
    assert.match(guide,/퍼펙트[^\n]*(피해|체력)[^\n]*(없음|손실 없음|줄지|줄지 않습니다)/);
    assert.match(guide,/일반[^\n]*(반 칸|0\.5)/);
  }
  assert.match(readme,/퍼펙트 패링[^\n]*전용 효과음[^\n]*강한 섬광/);
  assert.doesNotMatch(overview,/우클릭 유지/);
  assert.doesNotMatch(overview,/0\.25초/);
  assert.match(overview,/발판 아래로 · 그 외엔 점프/);
  assert.doesNotMatch(overview,/<span class="keycap">E<\/span><span>내려베기<\/span>/);
});
