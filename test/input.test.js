import test from 'node:test'; import assert from 'node:assert/strict'; import {InputController} from '../src/game/input/InputController.js';
class Target { constructor(){this.listeners={};} addEventListener(t,f){(this.listeners[t]??=[]).push(f);} removeEventListener(t,f){this.listeners[t]=this.listeners[t].filter(v=>v!==f);} fire(t,e={}){for(const f of this.listeners[t]??[])f({preventDefault(){},...e});} }
const scene={cameras:{main:{getWorldPoint:(x,y)=>({x:x+100,y})}}};
test('edges ignore repeat and held mouse, simultaneous directions cancel and blur clears input',()=>{
 const target=new Target(), canvas={getBoundingClientRect:()=>({left:10,top:20,right:1290,bottom:740,width:1280,height:720})}; const input=new InputController(target,canvas);
 target.fire('keydown',{code:'KeyA'}); target.fire('keydown',{code:'KeyD'}); target.fire('keydown',{code:'Space'}); target.fire('keydown',{code:'Space',repeat:true});
 target.fire('mousedown',{button:0,target:canvas,clientX:650,clientY:380}); target.fire('mousedown',{button:0,target:canvas,clientX:650,clientY:380});
 let f=input.sample(scene); assert.equal(f.move,0); assert.equal(f.jumpPressed,true); assert.equal(f.attackPressed,true); assert.equal(f.aimX,420); assert.equal(f.aimY,180);
 f=input.sample(scene); assert.equal(f.jumpPressed,false); assert.equal(f.attackPressed,false); assert.equal(f.jumpHeld,true);
 target.fire('mousemove',{clientX:0,clientY:0}); assert.ok(Number.isNaN(input.sample(scene).aimX));
 target.fire('blur'); f=input.sample(scene); assert.equal(f.move,0); assert.equal(f.jumpHeld,false); input.destroy(); assert.equal(target.listeners.keydown.length,0);
});

test('interactive controls do not feed gameplay keys and disabling clears queued input',()=>{
 const target=new Target(),input=new InputController(target);target.fire('keydown',{code:'Space',target:{closest:()=>({})}});assert.equal(input.sample(scene).jumpPressed,false);
 target.fire('keydown',{code:'Space'});input.setEnabled(false);target.fire('keydown',{code:'KeyD'});let f=input.sample(scene);assert.equal(f.jumpHeld,false);assert.equal(f.jumpPressed,false);assert.equal(f.move,0);input.setEnabled(true);target.fire('keydown',{code:'KeyD'});assert.equal(input.sample(scene).move,1);input.destroy();
});

test('down+jump captures the modifier at Space keydown and consumes one queued edge',()=>{
 const target=new Target(),input=new InputController(target);let preventedS=false,preventedDown=false;
 target.fire('keydown',{code:'KeyS',preventDefault(){preventedS=true;}});target.fire('keydown',{code:'ArrowDown',preventDefault(){preventedDown=true;}});target.fire('keyup',{code:'ArrowDown'});
 target.fire('keydown',{code:'Space'});target.fire('keydown',{code:'Space',repeat:true});
 let f=input.sample(scene);assert.equal(preventedS,true);assert.equal(preventedDown,true);assert.equal(f.jumpPressed,true);assert.equal(f.dropPressed,true);assert.equal(f.jumpHeld,true);
 f=input.sample(scene);assert.equal(f.jumpPressed,false);assert.equal(f.dropPressed,false);

 target.fire('keyup',{code:'Space'});target.fire('keyup',{code:'KeyS'});
 target.fire('keydown',{code:'ArrowDown'});target.fire('keydown',{code:'Space'});
 f=input.sample(scene);assert.equal(f.jumpPressed,true);assert.equal(f.dropPressed,true);

 target.fire('keyup',{code:'Space'});target.fire('keyup',{code:'ArrowDown'});
 target.fire('keydown',{code:'Space'});target.fire('keydown',{code:'KeyS'});
 f=input.sample(scene);assert.equal(f.jumpPressed,true);assert.equal(f.dropPressed,false);

 target.fire('keyup',{code:'Space'});target.fire('keyup',{code:'KeyS'});
 target.fire('keydown',{code:'KeyS'});target.fire('keydown',{code:'Space'});input.reset();
 f=input.sample(scene);assert.equal(f.jumpPressed,false);assert.equal(f.dropPressed,false);
 target.fire('keydown',{code:'KeyS'});target.fire('keydown',{code:'Space'});input.setEnabled(false);
 f=input.sample(scene);assert.equal(f.jumpPressed,false);assert.equal(f.dropPressed,false);input.setEnabled(true);
 input.destroy();
});

test('right mouse parry and held Q shield are edge input that disabling clears',()=>{
 const target=new Target(),canvas={getBoundingClientRect:()=>({left:0,top:0,right:640,bottom:360,width:640,height:360})},input=new InputController(target,canvas);
 const outside={};
 target.fire('mousedown',{button:2,target:outside,clientX:20,clientY:30});
 target.fire('mousedown',{button:2,target:canvas,clientX:20,clientY:30});
 let frame=input.sample(scene);assert.equal(frame.parryPressed,true);assert.equal(frame.shieldPressed,false);assert.equal(frame.shieldHeld,false);
 target.fire('mousedown',{button:2,target:canvas,clientX:20,clientY:30});
 frame=input.sample(scene);assert.equal(frame.parryPressed,false);
 target.fire('mouseup',{button:2});target.fire('mousedown',{button:2,target:canvas,clientX:20,clientY:30});
 assert.equal(input.sample(scene).parryPressed,true);
 target.fire('mouseup',{button:2});let preventedQ=false;
 target.fire('keydown',{code:'KeyQ',preventDefault(){preventedQ=true;}});target.fire('keydown',{code:'KeyQ',repeat:true});
 frame=input.sample(scene);assert.equal(frame.shieldPressed,true);assert.equal(frame.shieldHeld,true);assert.equal(frame.parryPressed,false);assert.equal(preventedQ,true);
 frame=input.sample(scene);assert.equal(frame.shieldPressed,false);assert.equal(frame.shieldHeld,true);
 target.fire('keyup',{code:'KeyQ'});assert.equal(input.sample(scene).shieldHeld,false);
 let preventedE=false;target.fire('keydown',{code:'KeyE',preventDefault(){preventedE=true;}});
 frame=input.sample(scene);assert.equal(Object.hasOwn(frame,'divePressed'),false);assert.equal(preventedE,false);
 target.fire('keydown',{code:'KeyQ'});target.fire('mousedown',{button:2,target:canvas,clientX:20,clientY:30});
 input.setEnabled(false);frame=input.sample(scene);assert.equal(frame.shieldPressed,false);assert.equal(frame.shieldHeld,false);assert.equal(frame.parryPressed,false);
 input.setEnabled(true);target.fire('mousedown',{button:2,target:canvas,clientX:20,clientY:30});target.fire('keydown',{code:'KeyQ'});
 frame=input.sample(scene);assert.equal(frame.shieldPressed,true);assert.equal(frame.shieldHeld,true);assert.equal(frame.parryPressed,true);input.destroy();
});
