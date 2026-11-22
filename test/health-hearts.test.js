import test from 'node:test';
import assert from 'node:assert/strict';
import {healthHeartState} from '../src/game/render/healthHearts.js';

test('three hearts show full, half, and empty health without rounding',()=>{
 for(const [hp,expected] of [[3,['full','full','full']],[2.5,['full','full','half']],[2,['full','full','empty']],[1.5,['full','half','empty']],[1,['full','empty','empty']],[.5,['half','empty','empty']],[0,['empty','empty','empty']]]){
  assert.deepEqual([0,1,2].map(index=>healthHeartState(hp,index)),expected,`hp ${hp}`);
 }
});
