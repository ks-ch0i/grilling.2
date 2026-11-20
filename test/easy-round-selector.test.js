import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSave,recordEasyRoundCompletion} from '../src/game/storage/saveStore.js';
import {easyRoundChoices,mountEasyRoundSelector} from '../src/game/ui/easyRoundSelector.js';

class FakeElement {
  constructor(tagName){this.tagName=tagName.toUpperCase();this.children=[];this.attributes=new Map();this.listeners=new Map();this.className='';this.textContent='';this.disabled=false;this.hidden=false;this.parent=null;}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
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

test('selector shows disabled locks, calls an enabled choice once, and supports Back',()=>withFakeDocument(game=>{
  let selected=null,backs=0;
  const menu=mountEasyRoundSelector({save:freshSave(),titleScreen:true,onSelect:(stageId,round)=>{selected=[stageId,round];},onBack:()=>backs++});
  const buttons=descendants(menu.panel).filter(node=>node.tagName==='BUTTON');
  assert.ok(menu.root.className.includes('game-overlay--title-submenu'));
  assert.equal(buttons.length,17);
  assert.equal(buttons[0].textContent,'1라운드');assert.equal(buttons[0].disabled,false);
  assert.equal(buttons[1].textContent,'🔒 2라운드');assert.equal(buttons[1].disabled,true);
  assert.equal(buttons[8].disabled,true);assert.equal(buttons.at(-1).textContent,'뒤로');
  buttons[1].click();assert.equal(selected,null);
  buttons[0].click();buttons[0].click();assert.deepEqual(selected,['forest-1',1]);
  assert.equal(backs,0);assert.equal(game.children[0],menu.root);

  const backMenu=mountEasyRoundSelector({save:freshSave(),onSelect:()=>assert.fail('Back must not select a round'),onBack:()=>backs++});
  descendants(backMenu.panel).find(node=>node.tagName==='BUTTON'&&node.textContent==='뒤로').click();
  assert.equal(backs,1);
}));

test('malformed Easy progress is rejected before rendering',()=>{
  const save=freshSave();save.easy.unlockedRoundByStage['forest-1']=0;
  assert.throws(()=>easyRoundChoices(save),TypeError);
  assert.throws(()=>mountEasyRoundSelector({save,onSelect:()=>{},onBack:()=>{}}),TypeError);
});
