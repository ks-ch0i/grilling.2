import test from 'node:test';
import assert from 'node:assert/strict';
import {FOREST_STAGE,validateStage} from '../src/game/content/forestStage.js';

test('forest stage is a supported single-screen arena with three enemy templates',()=>{
  assert.equal(validateStage(FOREST_STAGE),true);
  assert.deepEqual(FOREST_STAGE.world,{width:640,height:360});
  assert.deepEqual(FOREST_STAGE.arena,{left:16,right:624,top:0,bottom:304});
  assert.deepEqual(FOREST_STAGE.spawn,{x:16,y:276});
  assert.equal(FOREST_STAGE.solids[0].x,0);
  assert.equal(FOREST_STAGE.solids[0].y,304);
  assert.equal(FOREST_STAGE.solids[0].w,640);
  assert.deepEqual(new Set(FOREST_STAGE.enemies.map(enemy=>enemy.kind)),new Set(['soldier','wisp','boar']));
  assert.equal(FOREST_STAGE.enemies.length,3);
  assert.deepEqual(FOREST_STAGE.pickups,[]);
  assert.equal(FOREST_STAGE.boss.id,'forest-guardian');
});

test('forest validation rejects out-of-bounds geometry and duplicate or missing templates',()=>{
  const outside=structuredClone(FOREST_STAGE);outside.solids[1].x=620;
  assert.throws(()=>validateStage(outside),RangeError);

  const duplicate=structuredClone(FOREST_STAGE);duplicate.enemies[1].id=duplicate.enemies[0].id;
  assert.throws(()=>validateStage(duplicate),TypeError);

  const missing=structuredClone(FOREST_STAGE);missing.enemies.pop();
  assert.throws(()=>validateStage(missing),RangeError);

  const wrongSize=structuredClone(FOREST_STAGE);wrongSize.world.width=11520;
  assert.throws(()=>validateStage(wrongSize),RangeError);

  const unsupported=structuredClone(FOREST_STAGE);unsupported.enemies[0].y--;
  assert.throws(()=>validateStage(unsupported),RangeError);
});
