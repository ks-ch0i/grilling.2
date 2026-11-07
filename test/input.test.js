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
