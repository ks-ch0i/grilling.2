import test from 'node:test';import assert from 'node:assert/strict';
import {BOSS_FX_CLIPS,sampleFxFrame,fxItem} from '../src/game/assets/bossFx.js';
import {ASSETS} from '../src/game/assets/manifest.js';
test('all effect frames resolve to real registered sheets',()=>{
 for(const c of Object.values(BOSS_FX_CLIPS)){const a=ASSETS.find(a=>a.key===c.texture);assert.ok(a);assert.equal(a.frameWidth,c.frameWidth);assert.equal(a.frameHeight,c.frameHeight);assert.ok(c.frames.every(n=>n>=0&&n<a.count));}
});
test('active and recovery effects use explicit simulation time and anchored cores',()=>{
 const r={x:100,y:200,w:90,h:66};const a=fxItem('forest.branch','arm',r,6,12,{flipX:true});
 assert.equal(a.frame,2);assert.equal(a.x,145);assert.equal(a.y,233);assert.equal(a.width,120);assert.equal(a.height,88);assert.equal(a.flipX,true);
 assert.deepEqual(fxItem('forest.branch','arm',r,6,12,{flipX:true}),a);
 assert.equal(sampleFxFrame('forest.branch',100,12),3);assert.equal(sampleFxFrame('machine.wave',12),0);assert.equal(sampleFxFrame('machine.wave',15),1);
 assert.equal(sampleFxFrame('entrance.burst',0),0);assert.equal(sampleFxFrame('entrance.settle',95),7);
 assert.throws(()=>fxItem('entrance.burst','intro',r,0),TypeError);assert.throws(()=>sampleFxFrame('missing',0),TypeError);
 for(const age of [-1,Infinity,NaN])assert.throws(()=>sampleFxFrame('forest.branch',age),RangeError);
 assert.throws(()=>fxItem('forest.branch','arm',{...r,w:0},0),RangeError);
});
