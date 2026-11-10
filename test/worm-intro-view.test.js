import test from 'node:test';import assert from 'node:assert/strict';
import {WormIntroView} from '../src/game/render/WormIntroView.js';
import {getWormIntroTimeline} from '../src/game/sim/wormIntro.js';
import {bossAnimation,bossFramePresentation} from '../src/game/assets/animation.js';
import {createPracticeRun} from '../src/game/dev/roundSelector.js';
import {MINE_STAGE as stage} from '../src/game/content/mineStage.js';
function fixture(){
 const nodes=[];function node(type,args){const n={type,args,destroyed:0,destroy(){this.destroyed++;}};
  for(const name of ['Origin','ScrollFactor','Depth','Alpha','Visible','Texture','Position','DisplaySize','FlipX','Rotation'])n['set'+name]=(...values)=>{n[name]=values;return n;};nodes.push(n);return n;}
 return {nodes,scene:{textures:{exists:()=>true},add:{rectangle:(...args)=>node('rectangle',args),sprite:(...args)=>node('sprite',args)}}};
}
test('intro overlays actually paint black, cover HUD and clear across scene reuse',()=>{
 const {scene,nodes}=fixture(),view=new WormIntroView(scene),run=createPracticeRun('mine-worm',{seed:1});
 view.sync(run,stage,getWormIntroTimeline(240));assert.equal(view.dim.args[5],1);assert.deepEqual(view.dim.Depth,[9]);assert.deepEqual(view.dim.ScrollFactor,[0]);assert.deepEqual(view.dim.Visible,[true]);
 view.sync(run,stage,getWormIntroTimeline(144));assert.equal(view.layer.items.size,1);let sprite=view.layer.items.get('worm-entrance-burst');assert.deepEqual(sprite.Texture,['worm-entrance-fx',0]);assert.equal(sprite.Position[1]+(176-96)*.75,stage.arena.bottom);
 view.sync(run,stage,getWormIntroTimeline(120));assert.equal(view.layer.items.size,0);assert.deepEqual(view.blackout.Depth,[100]);assert.deepEqual(view.blackout.Alpha,[1]);assert.deepEqual(view.blackout.Visible,[true]);assert.equal(view.blackout.args[5],1);
 view.sync(run,stage,getWormIntroTimeline(96));assert.ok(view.layer.items.has('worm-entrance-settle'));sprite=view.layer.items.get('worm-entrance-settle');assert.deepEqual(sprite.Texture,['worm-entrance-fx',4]);const before=nodes.length;view.sync(run,stage,getWormIntroTimeline(96));assert.equal(nodes.length,before);
 view.sync(run,stage,null);assert.equal(view.layer.items.size,0);assert.deepEqual(view.blackout.Visible,[false]);assert.deepEqual(view.dim.Visible,[false]);
 view.sync(run,stage,getWormIntroTimeline(240));assert.deepEqual(view.blackout.Visible,[false]);view.destroy();view.destroy();assert.ok(nodes.every(n=>n.destroyed===1));
});
test('body and outline share one visibility decision and reveal starts its clip at zero',()=>{
 const run=createPracticeRun('mine-worm',{seed:2}),clip=bossAnimation(run.boss);
 for(const remaining of [240,144,120,97]){const t=getWormIntroTimeline(remaining),body=bossFramePresentation(run.boss,clip,200,{bossVisible:t.showBody});assert.equal(body.visible,false);assert.equal(t.showBossHud,false);}
 const t=getWormIntroTimeline(96),body=bossFramePresentation(run.boss,clip,200,{bossVisible:t.showBody,bossElapsedTicks:t.phaseTicks});assert.equal(body.visible,true);assert.equal(body.frame,0);assert.equal(t.showBossHud,true);
 assert.equal(bossFramePresentation(run.boss,clip,200,{bossVisible:true,bossElapsedTicks:15}).frame,1);
 const frozen=getWormIntroTimeline(80);assert.deepEqual(getWormIntroTimeline(80),frozen);assert.deepEqual(bossFramePresentation(run.boss,clip,200,{bossElapsedTicks:frozen.phaseTicks}),bossFramePresentation(run.boss,clip,200,{bossElapsedTicks:frozen.phaseTicks}));
});
