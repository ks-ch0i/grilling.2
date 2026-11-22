import test from 'node:test';
import assert from 'node:assert/strict';
import {FOREST_STAGE} from '../src/game/content/forestStage.js';
import {MINE_STAGE} from '../src/game/content/mineStage.js';
import {ARENA_PLATFORM_PRESETS} from '../src/game/content/arenaPlatformPresets.js';
import {createStageRun,snapshotStageRun} from '../src/game/sim/stage.js';
import {freshSave} from '../src/game/storage/saveStore.js';
import {handleEasyDeath,handleEasyRoundClear,handleEasyStageClear,initializeEasyRun} from '../src/game/scenes/easySession.js';

class FakeElement {
  constructor(tagName){
    this.tagName=tagName.toUpperCase();this.children=[];this.listeners=new Map();this.attributes=new Map();this.disabled=false;this.hidden=false;this.parent=null;this.focused=false;this._className='';
    this.classList={add:(...names)=>{const classes=new Set(this._className.split(/\s+/).filter(Boolean));for(const name of names)classes.add(name);this._className=[...classes].join(' ');}};
  }
  set className(value){this._className=value;}
  get className(){return this._className;}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  replaceChildren(...nodes){for(const child of this.children)child.parent=null;this.children=[];this.append(...nodes);}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  addEventListener(type,listener){this.listeners.set(type,listener);}
  focus(){this.focused=true;}
  click(){if(!this.disabled)this.listeners.get('click')?.();}
  querySelector(selector){
    if(selector===':scope > p')return this.children.find(child=>child.tagName==='P')??null;
    if(selector!=='button:not(:disabled),input')return null;
    const pending=[...this.children];
    while(pending.length){const candidate=pending.shift();if(candidate.tagName==='BUTTON'&&!candidate.disabled||candidate.tagName==='INPUT')return candidate;pending.unshift(...candidate.children);}
    return null;
  }
  remove(){if(!this.parent)return;this.parent.children=this.parent.children.filter(child=>child!==this);this.parent=null;}
}

function withFakeDocument(run){
  const game=new FakeElement('main'),previousDocument=globalThis.document;
  globalThis.document={createElement:tag=>new FakeElement(tag),getElementById:id=>id==='game'?game:null};
  try{return run(game);}finally{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
}

function makeStore(save=freshSave()){
  let current=save,persistCalls=0;
  return {getSave:()=>current,setSave:value=>{current=value;},persist:()=>{persistCalls++;return {ok:true};},get persistCalls(){return persistCalls;}};
}

function makeScene({stage=FOREST_STAGE,round=1,save=freshSave()}={}){
  const hardRun=snapshotStageRun(createStageRun(FOREST_STAGE,{}, {seed:91}));
  save.run=hardRun;
  const store=makeStore(save),scene={store,mode:'easy',stage,run:createStageRun(stage,{}, {seed:43,startRound:round}),easyDeathHandled:false,easyResultHandled:false,easyDecisionOpen:false,easyDecisionMenu:null,easyCurrentRecord:null,easyBestRecord:null,paused:false,pauseCalls:0};
  scene.pauseEasyDecision=function(){this.pauseCalls++;this.easyDecisionOpen=true;this.paused=true;};
  scene.scene={start:(name,data)=>{scene.started={name,data};},restart:data=>{scene.restarted=data;}};
  return {scene,hardRun};
}

const buttons=menu=>menu.panel.children.filter(child=>child.tagName==='BUTTON');
const click=(menu,label)=>{const button=buttons(menu).find(item=>item.textContent===label);assert.ok(button,`missing button: ${label}`);button.click();};

test('Easy starts at an unlocked round with full health and leaves the saved Hard run untouched',()=>{
  const save=freshSave();save.easy.unlockedRoundByStage['forest-1']=4;
  const hardRun=snapshotStageRun(createStageRun(FOREST_STAGE,{}, {seed:100}));save.run=hardRun;
  const starts=[],scene={store:makeStore(save),scene:{start:(name,data)=>starts.push([name,data])}};
  assert.equal(initializeEasyRun(scene,{mode:'easy',stageId:'forest-1',round:4}),true);
  assert.equal(scene.run.round,4);assert.equal(scene.run.elapsedTicks,0);assert.equal(scene.run.player.hp,3);
  assert.equal(scene.run.terrainLayout.mode,'authored');
  assert.ok(ARENA_PLATFORM_PRESETS['forest-1'].some(preset=>preset.id===scene.run.terrainLayout.presetId));
  assert.equal(Object.hasOwn(scene.run,'mode'),false);assert.deepEqual(scene.store.getSave().run,hardRun);
});

test('locked Easy scene payloads return to title instead of starting a round',()=>{
  const scene={store:makeStore(freshSave()),scene:{started:null,start(name){this.started=name;}}};
  assert.equal(initializeEasyRun(scene,{mode:'easy',stageId:'forest-1',round:2}),false);
  assert.equal(scene.scene.started,'title');assert.equal(scene.run,undefined);
  scene.scene.started=null;
  assert.equal(initializeEasyRun(scene,{mode:'invalid',stageId:'forest-1',round:1}),false);
  assert.equal(scene.scene.started,'title');
});

test('Easy death increments that round only and Retry starts the same round without changing Hard data',()=>withFakeDocument(()=>{
  const {scene,hardRun}=makeScene();handleEasyDeath(scene);const menu=scene.easyDecisionMenu;
  handleEasyDeath(scene);
  assert.equal(scene.store.getSave().easy.roundDeaths['forest-1']['1'],1);assert.equal(scene.store.getSave().easy.roundDeaths['forest-1']['2'],0);assert.equal(scene.store.persistCalls,1);
  assert.deepEqual(scene.store.getSave().run,hardRun);assert.equal(scene.easyDecisionOpen,true);assert.equal(scene.paused,true);
  assert.deepEqual(buttons(menu).map(button=>button.textContent),['다시 시도','라운드 선택','홈']);
  click(menu,'라운드 선택');click(scene.easyDecisionMenu,'뒤로');
  assert.equal(scene.easyDecisionMenu.panel.children[0].textContent,'사망');assert.equal(scene.easyDecisionOpen,true);
  click(scene.easyDecisionMenu,'다시 시도');
  assert.deepEqual(scene.restarted,{mode:'easy',stageId:'forest-1',round:1});assert.equal(scene.easyDecisionOpen,false);
  assert.equal(scene.store.getSave().easy.roundDeaths['forest-1']['1'],1);assert.deepEqual(scene.store.getSave().run,hardRun);
}));

test('Easy round clear saves its timer and unlock before showing choices; selector Back restores the clear popup',()=>withFakeDocument(()=>{
  const {scene,hardRun}=makeScene();scene.run.elapsedTicks=300;
  handleEasyRoundClear(scene);const clearMenu=scene.easyDecisionMenu;
  const easy=scene.store.getSave().easy;
  assert.equal(scene.store.persistCalls,1);assert.equal(easy.unlockedRoundByStage['forest-1'],2);
  assert.deepEqual(easy.roundRecords['forest-1']['1'],{best:{elapsedTicks:300,deaths:0},recent:{elapsedTicks:300,deaths:0}});
  assert.deepEqual(buttons(clearMenu).map(button=>button.textContent),['라운드 선택','다음 라운드','홈']);
  handleEasyRoundClear(scene);assert.equal(scene.store.persistCalls,1);
  assert.equal(scene.easyDecisionOpen,true);assert.equal(scene.paused,true);assert.deepEqual(scene.store.getSave().run,hardRun);
  click(clearMenu,'라운드 선택');const selector=scene.easyDecisionMenu;
  assert.ok(selector.panel.children.some(child=>child.tagName==='H2'&&child.textContent==='이지 모드 라운드 선택'));
  click(selector,'뒤로');
  assert.deepEqual(buttons(scene.easyDecisionMenu).map(button=>button.textContent),['라운드 선택','다음 라운드','홈']);
  assert.equal(scene.easyDecisionOpen,true);assert.equal(scene.run.elapsedTicks,300);
  click(scene.easyDecisionMenu,'다음 라운드');
  assert.deepEqual(scene.restarted,{mode:'easy',stageId:'forest-1',round:2});assert.equal(scene.easyDecisionOpen,false);
  assert.deepEqual(scene.store.getSave().run,hardRun);
}));

test('Forest Round 8 unlocks Mine Round 1 and offers stage advance, selector, and Home',()=>withFakeDocument(()=>{
  const save=freshSave();save.easy.unlockedRoundByStage['forest-1']=8;
  const {scene}=makeScene({round:8,save});scene.run.outcome='clear';scene.run.elapsedTicks=900;
  handleEasyStageClear(scene);
  assert.equal(scene.store.getSave().easy.unlockedRoundByStage['mine-1'],1);
  assert.deepEqual(scene.store.getSave().easy.roundRecords['forest-1']['8'].recent,{elapsedTicks:900,deaths:0});
  assert.deepEqual(buttons(scene.easyDecisionMenu).map(button=>button.textContent),['다음 스테이지','스테이지/라운드 선택','홈']);
  click(scene.easyDecisionMenu,'다음 스테이지');
  assert.deepEqual(scene.restarted,{mode:'easy',stageId:'mine-1',round:1});
  assert.equal(initializeEasyRun(scene,scene.restarted),true);
  assert.equal(scene.run.terrainLayout.mode,'authored');
  assert.ok(ARENA_PLATFORM_PRESETS['mine-1'].some(preset=>preset.id===scene.run.terrainLayout.presetId));
}));

test('Mine Round 8 overall clear has no Next Stage action',()=>withFakeDocument(()=>{
  const save=freshSave();save.easy.unlockedRoundByStage['mine-1']=8;
  const {scene}=makeScene({stage:MINE_STAGE,round:8,save});scene.run.outcome='clear';scene.run.elapsedTicks=1200;
  handleEasyStageClear(scene);
  assert.deepEqual(buttons(scene.easyDecisionMenu).map(button=>button.textContent),['라운드 선택','홈']);
  assert.equal(scene.easyDecisionMenu.panel.children[0].textContent,'전체 클리어');
  click(scene.easyDecisionMenu,'라운드 선택');
  const selector=scene.easyDecisionMenu;
  const stageSwitch=selector.panel.children.find(child=>child.className==='challenge-tabs');
  const mine=stageSwitch.children.find(child=>child.attributes.get('data-choice')==='mine-1');
  assert.equal(mine.attributes.get('aria-pressed'),'true');
  assert.equal(selector.panel.attributes.get('data-stage-id'),'mine-1');
  assert.equal(scene.paused,true);
  click(selector,'뒤로');
  assert.equal(selector.root.parent,null);
  assert.equal(scene.easyDecisionMenu.panel.children[0].textContent,'전체 클리어');
  assert.equal(scene.easyDecisionOpen,true);assert.equal(scene.paused,true);
  assert.equal(scene.run.elapsedTicks,1200);assert.equal(scene.store.persistCalls,1);
}));

test('Hard scenes keep restoring their saved snapshot even if a startRound option is present',()=>{
  const saved=createStageRun(FOREST_STAGE,{}, {seed:101,startRound:6});saved.elapsedTicks=240;
  const scene={store:makeStore(freshSave()),scene:{start(){assert.fail('valid Hard snapshot should not route to title');}}};
  assert.equal(initializeEasyRun(scene,{mode:'hard',run:snapshotStageRun(saved)}),true);
  assert.equal(scene.run.round,6);assert.equal(scene.run.elapsedTicks,240);
});
