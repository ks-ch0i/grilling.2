import test from 'node:test';import assert from 'node:assert/strict';
import {AttackSpriteLayer} from '../src/game/render/AttackSpriteLayer.js';
import {fxItem} from '../src/game/assets/bossFx.js';
function fixture(){const created=[];const scene={textures:{exists:k=>k!=='missing'},add:{sprite(){const s={destroyed:0};for(const name of ['setOrigin','setTexture','setPosition','setDisplaySize','setFlipX','setRotation','setAlpha','setDepth'])s[name]=(...v)=>{s[name+'Value']=v;return s;};s.destroy=()=>s.destroyed++;created.push(s);return s;}}};return{scene,created};}
test('identity survives order changes and cleanup destroys only removed effects',()=>{
 const {scene,created}=fixture(),layer=new AttackSpriteLayer(scene),r={x:0,y:0,w:12,h:12};
 const a=fxItem('machine.mineral','a',r,0),b=fxItem('machine.mineral','b',{...r,x:40},3);
 layer.sync([a,b]);const original=layer.items.get('a');layer.sync([b,{...a,frame:11}]);assert.equal(created.length,2);assert.equal(layer.items.get('a'),original);assert.deepEqual(original.setTextureValue,['boss-machine-fx',11]);
 layer.sync([b]);assert.equal(original.destroyed,1);assert.equal(layer.items.size,1);layer.destroy();layer.destroy();assert.equal(created[1].destroyed,1);assert.equal(layer.items.size,0);
 assert.throws(()=>layer.sync([{...a,texture:'missing'}]),/Missing/);
});
