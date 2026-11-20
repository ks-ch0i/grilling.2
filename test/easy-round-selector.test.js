import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSave,recordEasyRoundCompletion} from '../src/game/storage/saveStore.js';
import {easyRoundChoices,mountEasyRoundSelector} from '../src/game/ui/easyRoundSelector.js';

class FakeElement {
  constructor(tagName){this.tagName=tagName.toUpperCase();this.children=[];this.attributes=new Map();this.listeners=new Map();this.className='';this.textContent='';this.disabled=false;this.hidden=false;this.parent=null;
    this.classList={add:(...names)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...names])].join(' ');}};
  }
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  replaceChildren(...nodes){for(const child of this.children)child.parent=null;this.children=[];this.append(...nodes);}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  addEventListener(type,listener){this.listeners.set(type,listener);}
  focus(){this.focused=true;}
  click(){if(!this.disabled)this.listeners.get('click')?.();}
  querySelector(selector){
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
const descendants=root=>root.children.flatMap(child=>[child,...descendants(child)]);
const buttons=menu=>descendants(menu.panel).filter(node=>node.tagName==='BUTTON');
const tabs=menu=>buttons(menu).filter(node=>node.attributes.has('data-choice'));
const tiles=menu=>buttons(menu).filter(node=>node.attributes.has('data-round'));
const backButton=menu=>buttons(menu).find(node=>node.textContent==='뒤로');

test('fresh Easy choices expose Forest Round 1 and lock every other choice',()=>{
  const groups=easyRoundChoices(freshSave());
  assert.deepEqual(groups.map(group=>[group.stageId,group.label,group.unlocked]),[['forest-1','숲',true],['mine-1','광산',false]]);
  assert.deepEqual(groups[0].rounds.map(choice=>choice.unlocked),[true,false,false,false,false,false,false,false]);
  assert.deepEqual(groups[1].rounds.map(choice=>choice.unlocked),Array(8).fill(false));
});

test('Easy unlocks control the selector independently from Hard stage unlocks',()=>{
  let save={...freshSave(),unlockedStageIds:['forest-1','mine-1']};
  for(let round=1;round<=3;round++)save=recordEasyRoundCompletion(save,'forest-1',round,{elapsedTicks:round*60,deaths:0});
  const groups=easyRoundChoices(save);
  assert.deepEqual(groups[0].rounds.map(choice=>choice.unlocked),[true,true,true,true,false,false,false,false]);
  assert.deepEqual(groups[1].rounds.map(choice=>choice.unlocked),Array(8).fill(false));

  for(let round=4;round<=8;round++)save=recordEasyRoundCompletion(save,'forest-1',round,{elapsedTicks:round*60,deaths:0});
  const afterForest=easyRoundChoices(save);
  assert.deepEqual(afterForest[1].rounds.map(choice=>choice.unlocked),[true,false,false,false,false,false,false,false]);
});

test('selector exposes one stage at a time and keeps locked stages inspectable',()=>withFakeDocument(game=>{
  const selections=[];
  const menu=mountEasyRoundSelector({save:freshSave(),titleScreen:true,onSelect:(...selection)=>selections.push(selection),onBack:()=>assert.fail('Selection must not go Back')});
  assert.ok(menu.root.className.includes('game-overlay--title-submenu'));
  assert.equal(buttons(menu).length,11);
  const [forest,mine]=tabs(menu);
  assert.deepEqual([forest.textContent,mine.textContent],['숲','광산']);
  assert.equal(forest.attributes.get('aria-pressed'),'true');
  assert.equal(forest.focused,true);
  assert.equal(tiles(menu).length,8);
  assert.deepEqual(tiles(menu).filter(tile=>!tile.disabled).map(tile=>tile.attributes.get('data-round')),['1']);
  const bossRounds=tiles(menu).filter(tile=>tile.attributes.get('aria-label').includes('보스'));
  assert.deepEqual(bossRounds.map(tile=>tile.attributes.get('data-round')),['5','7','8']);
  assert.ok(bossRounds.every(tile=>descendants(tile).some(node=>node.textContent==='보스')));

  mine.click();
  assert.equal(tabs(menu)[1],mine);
  assert.equal(mine.attributes.get('aria-pressed'),'true');
  assert.equal(menu.panel.attributes.get('data-stage-id'),'mine-1');
  assert.ok(tiles(menu).every(tile=>tile.disabled));
  const lockedTile=tiles(menu)[0];
  mine.click();lockedTile.click();
  assert.equal(tiles(menu)[0],lockedTile);
  assert.deepEqual(selections,[]);

  forest.click();
  const unlockedTile=tiles(menu)[0];
  assert.equal(unlockedTile.attributes.get('aria-label'),'1라운드, 도전 가능');
  unlockedTile.click();unlockedTile.click();backButton(menu).click();
  assert.deepEqual(selections,[['forest-1',1]]);
  menu.remove();
  assert.deepEqual(game.children,[]);
}));

test('selector shows completed tiles and starts Mine Round 1 when it becomes available',()=>withFakeDocument(()=>{
  let save=freshSave();
  for(let round=1;round<=8;round++)save=recordEasyRoundCompletion(save,'forest-1',round,{elapsedTicks:round*60,deaths:0});
  const selections=[];
  const menu=mountEasyRoundSelector({save,onSelect:(...selection)=>selections.push(selection),onBack:()=>{}});
  assert.equal(tiles(menu)[4].attributes.get('aria-label'),'5라운드, 보스, 클리어');
  assert.ok(descendants(menu.panel).some(node=>node.textContent==='8 / 8 클리어'));
  tabs(menu)[1].click();
  tiles(menu)[0].click();
  assert.deepEqual(selections,[['mine-1',1]]);
}));

test('selector Back runs once and removes the panel through its caller',()=>withFakeDocument(game=>{
  let backs=0;
  const menu=mountEasyRoundSelector({save:freshSave(),onSelect:()=>assert.fail('Back must not select a round'),onBack:()=>{backs++;menu.remove();}});
  const back=backButton(menu);
  back.click();back.click();
  assert.equal(backs,1);
  assert.deepEqual(game.children,[]);
}));

test('malformed Easy progress and unknown initial stages are rejected before rendering',()=>withFakeDocument(game=>{
  const save=freshSave();save.easy.unlockedRoundByStage['forest-1']=0;
  assert.throws(()=>easyRoundChoices(save),TypeError);
  assert.throws(()=>mountEasyRoundSelector({save,onSelect:()=>{},onBack:()=>{}}),TypeError);
  assert.throws(()=>mountEasyRoundSelector({save:freshSave(),initialStageId:'unknown',onSelect:()=>{},onBack:()=>{}}),TypeError);
  assert.deepEqual(game.children,[]);
}));
