import test from 'node:test';
import assert from 'node:assert/strict';
import {freshSave} from '../src/game/storage/saveStore.js';
import {mountRecordsPopup} from '../src/game/ui/recordsPopup.js';
import {mountCompanyLeaderboard} from '../src/game/ui/companyLeaderboard.js';

class FakeElement {
  constructor(tag){
    this.tagName=tag.toUpperCase();this.children=[];this.attributes=new Map();this.listeners=new Map();this.textContent='';this.className='';this.parent=null;
    this.classList={add:name=>{this.className=[this.className,name].filter(Boolean).join(' ');}};
  }
  get parentElement(){return this.parent;}
  append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
  replaceChildren(...nodes){for(const child of this.children)child.parent=null;this.children=[];this.append(...nodes);}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  addEventListener(type,listener){this.listeners.set(type,listener);}
  click(){this.listeners.get('click')?.();}
  focus(){this.focused=true;}
  querySelector(selector){
    if(selector==='button:not(:disabled):not(.account-sign-out),input')return descendants(this).find(node=>(node.tagName==='BUTTON'&&!node.disabled)||node.tagName==='INPUT')??null;
    const attribute=selector.match(/^\[aria-label="([^"]+)"\]$/);
    if(attribute)return descendants(this).find(node=>node.attributes.get('aria-label')===attribute[1])??null;
    return null;
  }
  querySelectorAll(selector){
    const matches=selector.match(/^\.([\w-]+)$/);
    if(matches)return descendants(this).filter(node=>node.className.split(' ').includes(matches[1]));
    const attribute=selector.match(/^\[aria-label="([^"]+)"\]$/);
    if(attribute)return descendants(this).filter(node=>node.attributes.get('aria-label')===attribute[1]);
    return [];
  }
  remove(){if(this.parent){this.parent.children=this.parent.children.filter(node=>node!==this);this.parent=null;}}
}

function withDocument(run){
  const game=new FakeElement('main'),previous=globalThis.document;
  game.querySelectorAll=()=>[];
  globalThis.document={createElement:tag=>new FakeElement(tag),getElementById:id=>id==='game'?game:null};
  try{return run(game);}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}

async function withAsyncDocument(run){
  const game=new FakeElement('main'),previous=globalThis.document;
  game.querySelectorAll=()=>[];
  globalThis.document={createElement:tag=>new FakeElement(tag),getElementById:id=>id==='game'?game:null};
  try{return await run(game);}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}

const descendants=root=>root.children.flatMap(child=>[child,...descendants(child)]);
const textOf=node=>[node.textContent,...node.children.map(textOf)].filter(Boolean).join(' ');
const tableOf=menu=>descendants(menu.panel).find(node=>node.tagName==='TABLE');
const withClass=(root,name)=>descendants(root).find(node=>node.className.split(' ').includes(name));
const rowsOf=menu=>tableOf(menu).children.find(node=>node.tagName==='TBODY').children;
const cardsOf=menu=>descendants(menu.panel).filter(node=>node.className.split(' ').includes('challenge-record-card'));
const choice=(menu,value)=>descendants(menu.panel).find(node=>node.attributes.get('data-choice')===value);

test('fresh result records show an empty eight-row Easy table and four empty Hard cards',()=>withDocument(()=>{
  const menu=mountRecordsPopup({save:freshSave(),onBack:()=>{},titleScreen:false});
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
  assert.deepEqual(cardsOf(menu).map(textOf),[
    '최고 도달 기록 없음','최근 도달 기록 없음','최고 기록 기록 없음','최근 기록 기록 없음'
  ]);
  assert.equal(choice(menu,'mine-1').attributes.get('aria-pressed'),'true');
}));

test('Hard personal records show progress and preserve completion records',()=>withDocument(()=>{
  const save=freshSave();
  save.hardProgress['forest-1']={
    best:{roundReached:6,cleared:false,elapsedTicks:1800,deaths:3},
    recent:{roundReached:4,cleared:false,elapsedTicks:900,deaths:1}
  };
  save.records['forest-1']={
    best:{elapsedTicks:300,deaths:1},
    recent:{elapsedTicks:420,deaths:2}
  };
  const menu=mountRecordsPopup({save,onBack:()=>{},titleScreen:false});
  choice(menu,'hard').click();

  assert.deepEqual(cardsOf(menu).map(textOf),[
    '최고 도달 06라운드 도전 중 00:30 사망 3회',
    '최근 도달 04라운드 도전 중 00:15 사망 1회',
    '최고 기록 00:05 사망 1회',
    '최근 기록 00:07 사망 2회'
  ]);
}));

test('mode and stage switches keep time and deaths paired without changing the save',()=>withDocument(()=>{
  const save=freshSave();
  save.easy.roundRecords['forest-1']['1']={best:{elapsedTicks:0,deaths:0},recent:{elapsedTicks:120,deaths:2}};
  save.easy.roundRecords['mine-1']['1']={best:{elapsedTicks:60,deaths:6},recent:{elapsedTicks:180,deaths:9}};
  save.records['forest-1']={best:{elapsedTicks:3000,deaths:1},recent:null};
  save.records['mine-1']={best:{elapsedTicks:3660,deaths:4},recent:{elapsedTicks:7380,deaths:8}};
  const before=structuredClone(save),menu=mountRecordsPopup({save,onBack:()=>{},titleScreen:false});
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
  assert.deepEqual(cardsOf(menu).map(textOf),[
    '최고 도달 기록 없음','최근 도달 기록 없음','최고 기록 01:01 사망 4회','최근 기록 02:03 사망 8회'
  ]);
  choice(menu,'forest-1').click();
  assert.deepEqual(cardsOf(menu).map(textOf),[
    '최고 도달 기록 없음','최근 도달 기록 없음','최고 기록 00:50 사망 1회','최근 기록 기록 없음'
  ]);
  assert.deepEqual(save,before);
}));

test('home records opens side by side with the default Easy Forest round and personal table',()=>withDocument(()=>{
  const menu=mountRecordsPopup({save:freshSave(),onBack:()=>{}});
  const layout=withClass(menu.panel,'challenge-records-layout');
  const personal=withClass(layout,'challenge-records-personal'),company=withClass(layout,'challenge-records-company');
  assert.ok(menu.panel.className.includes('challenge-records-home'));
  assert.ok(personal&&company);
  assert.ok(layout.children.indexOf(personal)<layout.children.indexOf(company));
  assert.equal(tableOf(menu).attributes.get('aria-label'),'숲 이지 라운드별 기록');
  assert.equal(rowsOf(menu).length,8);
  assert.ok(textOf(personal).includes('최고 기록'));
  assert.ok(textOf(company).includes('숲 · 이지 · 01라운드'));
  assert.ok(textOf(company).includes('회사 순위를 사용할 수 없습니다.'));
}));

test('home round choice changes only the company board selection and preserves the eight-row table',()=>withDocument(()=>{
  const menu=mountRecordsPopup({save:freshSave(),onBack:()=>{}}),table=tableOf(menu);
  const choices=descendants(menu.panel).filter(node=>node.className.split(' ').includes('challenge-record-round-choice'));
  assert.equal(choices.length,8);
  assert.equal(choices[0].attributes.get('aria-label'),'01라운드 회사 순위');
  assert.equal(choices[0].attributes.get('aria-pressed'),'true');
  assert.equal(choices[6].attributes.get('aria-pressed'),'false');
  choices[6].click();
  assert.equal(tableOf(menu),table);
  assert.equal(rowsOf(menu).length,8);
  assert.equal(choices[0].attributes.get('aria-pressed'),'false');
  assert.equal(choices[6].attributes.get('aria-pressed'),'true');
  assert.ok(textOf(withClass(menu.panel,'challenge-records-company')).includes('숲 · 이지 · 07라운드'));
  choices[6].click();
  assert.equal(tableOf(menu),table);
}));

test('home board ignores a previous request still waiting for account sync',()=>withAsyncDocument(async()=>{
  const syncResolvers=[],requests=[];
  const store={
    syncNow:()=>new Promise(resolve=>syncResolvers.push(resolve)),
    getLeaderboard:challenge=>{requests.push(challenge);return Promise.resolve({boardId:'easy:forest-1:7',totalParticipants:0,entries:[],me:null,stale:false});}
  };
  const menu=mountRecordsPopup({save:freshSave(),store,onBack:()=>{}});
  const choices=descendants(menu.panel).filter(node=>node.className.split(' ').includes('challenge-record-round-choice'));
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  await delay(180);
  assert.equal(syncResolvers.length,1);
  choices[6].click();
  await delay(180);
  assert.equal(syncResolvers.length,2);
  syncResolvers[1]({ok:true});
  await delay(10);
  assert.deepEqual(requests.map(({mode,stageId,round})=>({mode,stageId,round})),[{mode:'easy',stageId:'forest-1',round:7}]);
  syncResolvers[0]({ok:true});
  await delay(10);
  assert.equal(requests.length,1);
  menu.remove();
}));

test('home shows the company top ten and an out-of-range personal rank only in the company section',()=>withAsyncDocument(async()=>{
  const entries=Array.from({length:10},(_,index)=>({rank:index+1,displayName:`플레이어 ${index+1}`,elapsedTicks:index+1,deaths:0}));
  const store={getLeaderboard:async()=>({boardId:'easy:forest-1:1',totalParticipants:11,entries,me:{rank:11,displayName:'내 계정',elapsedTicks:11,deaths:2},stale:false})};
  const menu=mountRecordsPopup({save:freshSave(),store,onBack:()=>{}});
  await new Promise(resolve=>setTimeout(resolve,180));
  const company=withClass(menu.panel,'challenge-records-company'),personal=withClass(menu.panel,'challenge-records-personal');
  const ownRow=withClass(company,'company-board-own');
  assert.ok(ownRow);
  assert.equal(textOf(ownRow),'11 · 내 기록 내 계정 00:00 2회');
  assert.equal(descendants(personal).some(node=>node.className.split(' ').includes('company-board-own')),false);
  assert.equal(descendants(company).filter(node=>node.className.split(' ').includes('company-board-entry')).length,10);
  menu.remove();
}));

test('Hard company board shows progress columns, status, and the out-of-range personal rank',()=>withAsyncDocument(async parent=>{
  const entries=[
    {rank:1,displayName:'클리어 플레이어',roundReached:8,cleared:true,elapsedTicks:1800,deaths:3},
    {rank:2,displayName:'도전 플레이어',roundReached:6,cleared:false,elapsedTicks:2400,deaths:4},
    ...Array.from({length:8},(_,index)=>({
      rank:index+3,displayName:`플레이어 ${index+3}`,roundReached:3,cleared:false,elapsedTicks:3000,deaths:5
    }))
  ];
  const board=mountCompanyLeaderboard({
    parent,
    challenge:{mode:'hard',stageId:'forest-1'},
    getLeaderboard:async()=>({
      boardId:'hard:forest-1',totalParticipants:11,entries,
      me:{rank:11,displayName:'내 계정',roundReached:8,cleared:true,elapsedTicks:1800,deaths:2},stale:false
    })
  });
  await new Promise(resolve=>setTimeout(resolve,180));

  const table=descendants(board.element).find(node=>node.className.split(' ').includes('company-board-table'));
  assert.deepEqual(table.children[0].children[0].children.map(textOf),['순위','플레이어','도달','상태','사망','시간']);
  const rows=table.children[1].children;
  assert.deepEqual(rows[0].children.map(textOf),['1','클리어 플레이어','08라운드','클리어','3회','00:30']);
  assert.deepEqual(rows[1].children.map(textOf),['2','도전 플레이어','06라운드','도전 중','4회','00:40']);
  assert.deepEqual(rows.at(-1).children.map(textOf),['11 · 내 기록','내 계정','08라운드','클리어','2회','00:30']);
  board.remove();
}));

test('Hard company board rejects entries without a complete progress result',()=>withAsyncDocument(async parent=>{
  const board=mountCompanyLeaderboard({
    parent,
    challenge:{mode:'hard',stageId:'forest-1'},
    getLeaderboard:async()=>({
      boardId:'hard:forest-1',totalParticipants:1,
      entries:[{rank:1,displayName:'플레이어',elapsedTicks:1800,deaths:3}],
      me:null,stale:false
    })
  });
  await new Promise(resolve=>setTimeout(resolve,180));

  assert.ok(textOf(board.element).includes('순위 응답을 확인할 수 없습니다.'));
  assert.equal(descendants(board.element).some(node=>node.className.split(' ').includes('company-board-table')),false);
  board.remove();
}));

test('Easy and Hard result entry keeps its selected challenge and returns to the caller',()=>withAsyncDocument(async()=>{
  const requests=[],backCalls=[];
  const store={getLeaderboard:async challenge=>{
    requests.push(challenge);
    return {boardId:challenge.mode==='easy'?`easy:${challenge.stageId}:${challenge.round}`:`hard:${challenge.stageId}`,totalParticipants:0,entries:[],me:null,stale:false};
  }};
  const delay=()=>new Promise(resolve=>setTimeout(resolve,180));
  for(const initialChallenge of [{mode:'easy',stageId:'mine-1',round:7},{mode:'hard',stageId:'mine-1'}]){
    const menu=mountRecordsPopup({save:freshSave(),store,titleScreen:false,initialChallenge,onBack:()=>backCalls.push(initialChallenge.mode)});
    await delay();
    assert.deepEqual(requests.at(-1),initialChallenge);
    assert.ok(textOf(menu.panel).includes(initialChallenge.mode==='easy'?'광산 이지 7라운드':'광산 하드 스테이지'));
    descendants(menu.panel).find(node=>node.tagName==='BUTTON'&&node.textContent==='기록으로').click();
    descendants(menu.panel).find(node=>node.tagName==='BUTTON'&&node.textContent==='뒤로').click();
  }
  assert.deepEqual(backCalls,['easy','hard']);
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
