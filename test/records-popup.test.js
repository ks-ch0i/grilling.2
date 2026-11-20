import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSave} from '../src/game/storage/saveStore.js';
import {mountRecordsPopup} from '../src/game/ui/recordsPopup.js';

class FakeElement {
  constructor(tag){
    this.tagName=tag.toUpperCase();this.children=[];this.attributes=new Map();this.listeners=new Map();this.textContent='';this.className='';this.parent=null;
    this.classList={add:name=>{this.className=[this.className,name].filter(Boolean).join(' ');}};
  }
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  replaceChildren(...nodes){for(const child of this.children)child.parent=null;this.children=[];this.append(...nodes);}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  addEventListener(type,listener){this.listeners.set(type,listener);}
  click(){this.listeners.get('click')?.();}
  focus(){this.focused=true;}
  querySelector(selector){
    if(selector==='button:not(:disabled),input')return descendants(this).find(node=>node.tagName==='BUTTON'&&!node.disabled)??null;
    return null;
  }
  remove(){if(this.parent){this.parent.children=this.parent.children.filter(node=>node!==this);this.parent=null;}}
}

function withDocument(run){
  const game=new FakeElement('main'),previous=globalThis.document;
  globalThis.document={createElement:tag=>new FakeElement(tag),getElementById:id=>id==='game'?game:null};
  try{return run(game);}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}

const descendants=root=>root.children.flatMap(child=>[child,...descendants(child)]);
const textOf=node=>[node.textContent,...node.children.map(textOf)].filter(Boolean).join(' ');
const tableOf=menu=>descendants(menu.panel).find(node=>node.tagName==='TABLE');
const rowsOf=menu=>tableOf(menu).children.find(node=>node.tagName==='TBODY').children;
const cardsOf=menu=>descendants(menu.panel).filter(node=>node.className.split(' ').includes('challenge-record-card'));
const choice=(menu,value)=>descendants(menu.panel).find(node=>node.attributes.get('data-choice')===value);

test('fresh records show an empty eight-row Easy table and two empty Hard cards',()=>withDocument(()=>{
  const menu=mountRecordsPopup({save:freshSave(),onBack:()=>{}});
  assert.equal(choice(menu,'easy').focused,true);
  assert.equal(tableOf(menu).attributes.get('aria-label'),'숲 이지 라운드별 기록');
  assert.deepEqual(tableOf(menu).children[0].children[0].children.map(textOf),['라운드','최고 기록','최근 기록']);
  const rows=rowsOf(menu);
  assert.equal(rows.length,8);
  assert.deepEqual(rows.filter(row=>textOf(row.children[0]).includes('보스')).map(row=>row.children[0].children[0].textContent),['05','07','08']);
  for(const row of rows){
    assert.equal(row.children[0].attributes.get('scope'),'row');
    for(const cell of row.children.slice(1)){
      assert.equal(textOf(cell),'—');
      assert.equal(cell.attributes.get('aria-label'),'기록 없음');
    }
  }
  choice(menu,'mine-1').click();
  assert.equal(tableOf(menu).attributes.get('aria-label'),'광산 이지 라운드별 기록');
  choice(menu,'hard').click();
  assert.equal(tableOf(menu),undefined);
  assert.deepEqual(cardsOf(menu).map(textOf),['최고 기록 기록 없음','최근 기록 기록 없음']);
  assert.equal(choice(menu,'mine-1').attributes.get('aria-pressed'),'true');
}));

test('mode and stage switches keep time and deaths paired without changing the save',()=>withDocument(()=>{
  const save=freshSave();
  save.easy.totalDeaths=50;
  save.easy.roundRecords['forest-1']['1']={best:{elapsedTicks:0,deaths:0},recent:{elapsedTicks:120,deaths:2}};
  save.easy.roundRecords['mine-1']['1']={best:{elapsedTicks:60,deaths:6},recent:{elapsedTicks:180,deaths:9}};
  save.records['forest-1']={best:{elapsedTicks:3000,deaths:1},recent:null};
  save.records['mine-1']={best:{elapsedTicks:3660,deaths:4},recent:{elapsedTicks:7380,deaths:8}};
  const before=structuredClone(save),menu=mountRecordsPopup({save,onBack:()=>{}});
  assert.deepEqual(rowsOf(menu)[0].children.map(textOf),['01','00:00 사망 0회','00:02 사망 2회']);
  assert.deepEqual(rowsOf(menu)[1].children.map(textOf),['02','—','—']);
  const mine=choice(menu,'mine-1'),hard=choice(menu,'hard');
  mine.click();
  assert.deepEqual(rowsOf(menu)[0].children.map(textOf),['01','00:01 사망 6회','00:03 사망 9회']);
  hard.click();
  assert.equal(menu.panel.attributes.get('data-stage-id'),'mine-1');
  assert.equal(choice(menu,'hard'),hard);
  assert.equal(choice(menu,'mine-1'),mine);
  assert.equal(tableOf(menu),undefined);
  assert.deepEqual(cardsOf(menu).map(textOf),['최고 기록 01:01 사망 4회','최근 기록 02:03 사망 8회']);
  choice(menu,'forest-1').click();
  assert.deepEqual(cardsOf(menu).map(textOf),['최고 기록 00:50 사망 1회','최근 기록 기록 없음']);
  assert.deepEqual(save,before);
}));

test('Back invokes the caller and the records panel can be removed',()=>withDocument(game=>{
  assert.throws(()=>mountRecordsPopup({save:freshSave()}),TypeError);
  assert.deepEqual(game.children,[]);
  let backCount=0;
  const menu=mountRecordsPopup({save:freshSave(),onBack:()=>{backCount++;menu.remove();}});
  assert.ok(menu.root.className.includes('game-overlay--title-submenu'));
  descendants(menu.panel).find(node=>node.tagName==='BUTTON'&&node.textContent==='뒤로').click();
  assert.equal(backCount,1);
  assert.deepEqual(game.children,[]);
}));
