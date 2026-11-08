import {intersects} from './geometry.js';
export function stepHazards(input,player,terrain){
 const hazards=[],events=[];
 for(const source of input){
  const h={...source};if(!h.alive)continue;
  if(h.kind==='acid-shot'||h.kind==='rock'||h.kind==='mineral'){
   const gravity=h.kind==='acid-shot'?500:650;h.vy+=gravity/60;const dx=h.vx/60,dy=h.vy/60,steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/2));
   for(let i=0;i<steps&&h.alive;i++){
    const previousBottom=h.y+h.h;h.x+=dx/steps;h.y+=dy/steps;
    const solid=terrain.find(r=>intersects(h,r));
    if(solid){h.alive=false;
     if(h.kind==='acid-shot'&&dy>0&&previousBottom<=solid.y){hazards.push({id:`${h.id}-pool`,ownerId:h.ownerId,kind:'acid-pool',x:h.x+h.w/2-14,y:solid.y-6,w:28,h:6,vx:0,vy:0,life:h.poolTicks,alive:true});events.push({type:'acid:pool',id:h.id});}
     if(h.kind==='mineral'){
      const x=h.x+h.w/2,y=solid.y;
      if(dy>0&&previousBottom<=solid.y){events.push({type:'hazard:impact',id:h.id,x,y});const impact={x:x-12,y:solid.y-16,w:24,h:16};if(player.mode!=='dead'&&intersects(impact,player))events.push({type:'hazard:hit',id:h.id,originX:x});}
      else events.push({type:'hazard:shatter',id:h.id,x,y:h.y+h.h/2});
     }
     break;
    }
    if(player.mode!=='dead'&&intersects(h,player)){h.alive=false;if(h.kind==='mineral')events.push({type:'hazard:shatter',id:h.id,x:h.x+h.w/2,y:h.y+h.h/2});events.push({type:'hazard:hit',id:h.id,originX:h.x+h.w/2});}
   }
  }else if(h.kind==='wave'){
   const distance=Math.min(Math.abs(h.vx/60),h.remaining),direction=Math.sign(h.vx);
   const nextX=h.x+distance*direction,probe={x:direction>0?nextX+h.w:nextX-1,y:h.y+h.h,w:1,h:2};
   const blocked=terrain.some(r=>intersects({...h,x:nextX},r));
   if(blocked||!terrain.some(r=>intersects(probe,r)))h.alive=false;
   else {h.x=nextX;h.remaining-=distance;if(h.remaining<=0)h.alive=false;}
  }
  if(h.alive&&!['acid-shot','rock','mineral'].includes(h.kind)&&player.mode!=='dead'&&intersects(h,player))events.push({type:'hazard:hit',id:h.id,originX:h.x+h.w/2});
  if(h.kind!=='cart'&&--h.life<=0)h.alive=false;
  if(h.alive)hazards.push(h);
 }
 return {hazards,events};
}
