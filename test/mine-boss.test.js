import test from 'node:test';import assert from 'node:assert/strict';
import {createMineBoss,damageMineBoss,stepMineBoss,selectMachineAttack,shouldDropPotion} from '../src/game/sim/mineBoss.js';
import {createStageRun,stepStage,snapshotStageRun,restoreStageRun} from '../src/game/sim/stage.js';
import {createPlayer,stepPlayer} from '../src/game/sim/player.js';import {intersects} from '../src/game/sim/geometry.js';import {nextRandom} from '../src/game/sim/mineCarts.js';import {MINE_STAGE as stage} from '../src/game/content/mineStage.js';import {freshSave,parseSave} from '../src/game/storage/saveStore.js';
const arena=stage.arena,input={move:0,jumpPressed:false,jumpHeld:false,attackPressed:false,rollPressed:false,divePressed:false,aimX:12000,aimY:290};
const player={x:11000,y:276,w:16,h:28,mode:'idle'};
const round=r=>restoreStageRun(stage,JSON.parse(JSON.stringify(snapshotStageRun(r))));
test('machine selects near and far patterns without consecutive repetition',()=>{
 const boss=createMineBoss('machine',stage.boss),near={...player,x:boss.x+boss.w/2+120-8},far={...near,x:near.x+1};const nearSeen=new Set(),farSeen=new Set();
 for(let seed=0;seed<5000;seed+=19){nearSeen.add(selectMachineAttack(boss,near,seed).kind);farSeen.add(selectMachineAttack(boss,far,seed).kind);}
 assert.deepEqual([...nearSeen].sort(),['charge','swipe']);assert.deepEqual([...farSeen].sort(),['rocks','wave']);
 for(const last of ['charge','swipe','rocks','wave']){const b={...boss,lastAttack:last};const p=['charge','swipe'].includes(last)?near:far;assert.notEqual(selectMachineAttack(b,p,10).kind,last);}
});
test('a short jump cannot clear the 30px wave while a long jump can',()=>{
 const floor=[{x:0,y:304,w:1000,h:56}],wave={x:120,y:274,w:16,h:30};
 function jump(hold){let p=createPlayer(120,276);p.grounded=true;let best=Infinity;for(let i=0;i<40;i++){p=stepPlayer(p,{...input,jumpPressed:i===0,jumpHeld:i<hold},floor,344).player;best=Math.min(best,p.y+p.h);}return best;}
 assert.ok(jump(1)>wave.y);assert.ok(jump(40)<wave.y);
});
test('machine death does not clear; drop is rolled once and worm entrance freezes exactly 180 ticks',()=>{
 let r=createStageRun(stage,{}, {seed:40});Object.assign(r.player,{x:11010,y:276,grounded:true,hp:2,mode:'attack',attackTick:4,aim:{x:1,y:0}});Object.assign(r.boss,{state:'recovery',stateTicks:50,hp:1});r.arenaLocked=true;
 let result=stepStage(r,input,stage);r=result.run;assert.equal(r.boss.state,'dying');assert.equal(r.outcome,null);assert.ok(result.events.some(e=>e.type==='boss:machine-defeated'));
 const x=r.player.x;r=stepStage(r,{...input,move:-1},stage).run;assert.ok(r.player.x<x);
 r.hazards.push({id:'pool',ownerId:'i',kind:'acid-pool',x:11000,y:298,w:28,h:6,vx:0,vy:0,life:100,alive:true});
 r.projectiles.push({id:'p',ownerId:'e',x:11000,y:200,w:8,h:8,vx:0,vy:0,life:100,alive:true});
 for(let i=0;i<88;i++)r=stepStage(r,input,stage).run;const expected=nextRandom(r.rngState);result=stepStage(r,input,stage);r=result.run;
 assert.equal(r.bossSequence,'worm-intro');assert.equal(r.boss.stateTicks,180);assert.equal(r.player.hp,2);assert.equal(r.bossDrop.rolled,true);assert.equal(r.bossDrop.spawned,shouldDropPotion(expected.value));assert.equal(r.rngState,expected.state);assert.deepEqual(r.hazards,[]);assert.deepEqual(r.projectiles,[]);assert.equal(r.outcome,null);
 assert.equal(shouldDropPotion(.399),true);assert.equal(shouldDropPotion(.4),false);const saved=round(r);assert.deepEqual(saved.bossDrop,r.bossDrop);
 const position={x:r.player.x,y:r.player.y,hp:r.player.hp};for(let i=0;i<179;i++){r=stepStage(r,{...input,move:1,jumpPressed:true},stage).run;assert.deepEqual({x:r.player.x,y:r.player.y,hp:r.player.hp},position);}
 assert.equal(r.bossSequence,'worm-intro');assert.equal(r.boss.stateTicks,1);r=stepStage(r,input,stage).run;assert.equal(r.bossSequence,'worm');assert.equal(r.boss.kind,'worm');assert.equal(r.boss.hp,18);assert.equal(r.bossDrop.rolled,true);
});
test('worm phase 2 warns and retargets its second underground strike',()=>{
 let b=createMineBoss('worm',{x:11000,y:240});b.state='recovery';b.stateTicks=10;b.hp=10;
 let damage=damageMineBoss(b);b=damage.boss;assert.equal(b.hp,9);assert.equal(b.state,'transition');assert.equal(damage.events.filter(e=>e.type==='boss:transition').length,1);
 for(let i=0;i<30;i++)b=stepMineBoss(b,player,arena,1).boss;assert.equal(b.phase,2);assert.equal(damageMineBoss(b).events.filter(e=>e.type==='boss:transition').length,0);
 b.state='recovery';b.stateTicks=1;b.cycle=0;let result=stepMineBoss(b,player,arena,1);b=result.boss;assert.equal(b.attackKind,'burrow');const first=b.targetX;assert.equal(b.telegraphs.length,1);
 for(let i=0;i<45;i++)b=stepMineBoss(b,player,arena,1).boss;assert.equal(b.state,'attack');assert.equal(b.hitboxes.length,1);
 const moved={...player,x:11100};for(let i=0;i<18;i++)b=stepMineBoss(b,moved,arena,1).boss;assert.equal(b.state,'windup');assert.equal(b.stateTicks,45);assert.notEqual(b.targetX,first);const second=b.targetX;
 for(let i=0;i<20;i++)b=stepMineBoss(b,{...moved,x:11200},arena,1).boss;assert.equal(b.targetX,second);
});
test('worm snapshots survive introduction and second warning; only worm death clears',()=>{
 let r=createStageRun(stage,{}, {seed:2});r.boss=createMineBoss('worm',{x:10936,y:240});Object.assign(r.boss,{state:'intro',stateTicks:180});r.bossSequence='worm-intro';r.arenaLocked=true;r.bossDrop={rolled:true,spawned:true,consumed:false,x:11000,y:288};
 assert.deepEqual(stepStage(round(r),input,stage),stepStage(r,input,stage));assert.equal(parseSave(JSON.stringify({...freshSave(),run:snapshotStageRun(r)})).ok,true);
 Object.assign(r.boss,{state:'windup',stateTicks:45,phase:2,transitioned:true,hp:9,attackKind:'burrow',targetX:11000,trailStartX:10900,burrowsLeft:1,telegraphs:[{x:10976,y:240,w:48,h:64}]});r.bossSequence='worm';assert.deepEqual(stepStage(round(r),input,stage),stepStage(r,input,stage));
 Object.assign(r.boss,{state:'dying',stateTicks:1,hp:0,telegraphs:[],hitboxes:[]});let result=stepStage(r,input,stage);assert.equal(result.run.outcome,'clear');assert.equal(result.events.filter(e=>e.type==='stage:clear').length,1);assert.equal(stepStage(result.run,input,stage).events.length,0);
});
test('machine emits paired 30px waves and falling rocks; worm spit makes a four-second pool',()=>{
 let b=createMineBoss('machine',stage.boss);Object.assign(b,{state:'windup',stateTicks:1,attackKind:'wave'});
 let result=stepMineBoss(b,player,arena,1);assert.equal(result.hazards.length,2);assert.ok(result.hazards.every(h=>h.h===30&&Math.abs(h.vx)===120));
 b=createMineBoss('machine',stage.boss);Object.assign(b,{state:'windup',stateTicks:1,attackKind:'rocks',telegraphs:[{x:10900,y:0,w:20,h:304},{x:10950,y:0,w:20,h:304},{x:11000,y:0,w:20,h:304}]});
 result=stepMineBoss(b,player,arena,1);assert.equal(result.hazards.filter(h=>h.kind==='rock').length,3);
 b=createMineBoss('worm',{x:11000,y:240});Object.assign(b,{state:'windup',stateTicks:1,attackKind:'spit'});result=stepMineBoss(b,player,arena,1);assert.equal(result.hazards[0].poolTicks,240);
});
test('live boss simulation stays valid while saving active attacks',()=>{
 let r=createStageRun(stage,{}, {seed:21});r.player.x=stage.arena.left+20;
 for(let i=0;i<650;i++){r=stepStage(r,input,stage).run;const parsed=parseSave(JSON.stringify({...freshSave(),run:snapshotStageRun(r)}));assert.equal(parsed.ok,true,`tick ${i}, boss ${r.boss.state}`);}
});
