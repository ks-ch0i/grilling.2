import test from 'node:test';
import assert from 'node:assert/strict';
import {playerAttackRangePoints} from '../src/game/render/playerAttackRange.js';
import {createPlayer} from '../src/game/sim/player.js';
import {createStageRun} from '../src/game/sim/stage.js';
import {FOREST_STAGE} from '../src/game/content/forestStage.js';
import {validatePlatformLayout} from '../src/game/sim/terrain.js';

test('attack range is clipped by the active run terrain layout',()=>{
 const run=createStageRun(FOREST_STAGE,{}, {seed:12});
 run.terrainLayout={mode:'random',platforms:[
  {x:80,y:288,w:64,h:16},{x:192,y:272,w:48,h:16},
  {x:304,y:256,w:64,h:16},{x:416,y:288,w:48,h:16}
 ]};
 assert.equal(validatePlatformLayout(FOREST_STAGE,run.terrainLayout),true);
 const player=createPlayer(164,266);
 const points=playerAttackRangePoints(player,FOREST_STAGE,run);
 const centerRay=points.filter(point=>Math.abs(point.y-280)<1e-8);
 assert.ok(centerRay.some(point=>Math.abs(point.x-192)<1e-8));
 assert.ok(centerRay.every(point=>point.x<=192+1e-8));
});
