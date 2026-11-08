export function nextRandom(state){const value=(Math.imul(state,1664525)+1013904223)>>>0;return {state:value,value:value/4294967296};}
export function createCartZones(stage,random){
 const zones=[],used=new Set(),range=stage.world.width-512;
 for(let i=0;i<5;i++){
  let x=512+Math.min(range-1,Math.floor(random()*range));
  while(used.has(x))x=512+(x-511)%range;
  used.add(x);zones.push({id:`cart-${i+1}`,centerX:x,direction:random()<.5?-1:1,state:'countdown',ticks:180,cartId:null});
 }
 return zones;
}
export function stepCartZones(previous,previousHazards,stage){
 const zones=previous.map(z=>({...z})),hazards=previousHazards.map(h=>({...h})),events=[];
 for(const zone of zones){
  const left=Math.max(0,zone.centerX-96),right=Math.min(stage.world.width,zone.centerX+96);
  if(zone.state==='active'){
   const cart=hazards.find(h=>h.id===zone.cartId&&h.alive);
   if(cart){cart.x+=cart.vx/60;if(cart.x+cart.w<left||cart.x>right)cart.alive=false;}
   if(!cart||!cart.alive){zone.state='countdown';zone.ticks=600;zone.cartId=null;}
  }else if(--zone.ticks<=0){
   if(zone.state==='countdown'){zone.state='warning';zone.ticks=60;events.push({type:'cart:warning',id:zone.id,direction:zone.direction,x:zone.direction>0?left:right});}
   else {zone.state='active';zone.ticks=0;zone.cartId=`${zone.id}-vehicle`;hazards.push({id:zone.cartId,ownerId:zone.id,kind:'cart',x:zone.direction>0?left-32:right,y:284,w:32,h:20,vx:zone.direction*150,vy:0,life:0,alive:true});}
  }
 }
 return {zones,hazards:hazards.filter(h=>h.alive),events};
}
