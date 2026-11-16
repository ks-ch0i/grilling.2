import test from 'node:test';import assert from 'node:assert/strict';import {MINE_STAGE} from '../src/game/content/mineStage.js';import {createCartZones,stepCartZones} from '../src/game/sim/mineCarts.js';
test('five distinct locations avoid only the starting segment and repeated random values terminate',()=>{
 const zones=createCartZones(MINE_STAGE,()=>0);assert.deepEqual(zones.map(z=>z.centerX),[80,81,82,83,84]);assert.equal(zones.length,5);
 const values=[(160-80)/481,0,(540-80)/481,0,0,0,0,0,0,0];let i=0;const other=createCartZones(MINE_STAGE,()=>values[i++]);assert.equal(other[0].centerX,160);assert.equal(other[1].centerX,540);
});
test('cart warns, spawns, disappears and waits 600 ticks',()=>{
 let zones=createCartZones(MINE_STAGE,()=>.4),hazards=[],events=[];for(let i=0;i<180;i++){const x=stepCartZones(zones,hazards,MINE_STAGE);zones=x.zones;hazards=x.hazards;events.push(...x.events);}assert.equal(events.filter(e=>e.type==='cart:warning').length,5);assert.equal(zones[0].state,'warning');
 for(let i=0;i<60;i++){const x=stepCartZones(zones,hazards,MINE_STAGE);zones=x.zones;hazards=x.hazards;}assert.equal(zones[0].state,'active');assert.equal(hazards.length,5);
 hazards.find(h=>h.id===zones[0].cartId).alive=false;let result=stepCartZones(zones,hazards,MINE_STAGE);zones=result.zones;hazards=result.hazards;assert.equal(zones[0].state,'countdown');assert.equal(zones[0].ticks,600);
 for(let i=0;i<599;i++){result=stepCartZones(zones,hazards,MINE_STAGE);zones=result.zones;hazards=result.hazards;}assert.equal(zones[0].state,'countdown');result=stepCartZones(zones,hazards,MINE_STAGE);assert.equal(result.zones[0].state,'warning');
});
