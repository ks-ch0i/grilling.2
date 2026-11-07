import test from 'node:test';
import assert from 'node:assert/strict';
import {markRunActive,clearRunActive,shouldRecoverRun} from '../src/game/storage/reloadRecovery.js';

test('only a reload of an active tab with a saved run triggers recovery',()=>{
 const data=new Map(),storage={setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k),removeItem:k=>data.delete(k)};
 assert.equal(shouldRecoverRun('reload',true,storage),false);markRunActive(storage);
 assert.equal(shouldRecoverRun('reload',true,storage),true);
 assert.equal(shouldRecoverRun('navigate',true,storage),false);
 assert.equal(shouldRecoverRun('reload',false,storage),false);
 clearRunActive(storage);assert.equal(shouldRecoverRun('reload',true,storage),false);
});

test('unavailable session storage cannot prevent normal play',()=>{
 const storage={setItem(){throw Error('blocked');},getItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};
 assert.doesNotThrow(()=>markRunActive(storage));assert.doesNotThrow(()=>clearRunActive(storage));
 assert.equal(shouldRecoverRun('reload',true,storage),false);
});
