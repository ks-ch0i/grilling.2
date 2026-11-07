import { enemyAttackRect } from '../sim/enemies.js';
// Temporary geometric artwork; final sprites are supplied in T04.
export class EnemyView {
  constructor(scene) { this.graphics=scene.add.graphics().setDepth(4); }
  sync(run) {
    const g=this.graphics;g.clear();
    for(const e of run.enemies) {
      if (!e.visible) continue;
      const colors={soldier:0xbf655a,wisp:0xbba5e9,boar:0xa8794d};
      if(e.state==='windup') {g.fillStyle(0xffba54,.34);const reach=e.kind==='soldier'?28:e.kind==='boar'?120:30;g.fillRect(e.lockedFacing<0?e.x-reach:e.x+e.w,e.y,reach,e.h);}
      const hit=enemyAttackRect(e);if(hit){g.fillStyle(0xff6046,.6);g.fillRect(hit.x,hit.y,hit.w,hit.h);}
      g.fillStyle(e.state==='hurt'?0xffffff:colors[e.kind],e.state==='dead'?.4:1);g.fillRect(Math.round(e.x),Math.round(e.y),e.w,e.h);
      g.fillStyle(0x171d23);g.fillRect(Math.round(e.x+(e.facing>0?e.w-6:2)),Math.round(e.y+5),4,4);
    }
    for(const p of run.projectiles){g.fillStyle(0xdcb4ff);g.fillCircle(Math.round(p.x+4),Math.round(p.y+4),4);}
    const b=run.boss;
    if(b.state!=='dormant' && b.state!=='dead') {
      for(const r of b.telegraphs){g.fillStyle(0xffce59,.38);g.fillRect(r.x,r.y,r.w,r.h);g.lineStyle(2,0xffd577);g.strokeRect(r.x,r.y,r.w,r.h);}
      for(const r of b.hitboxes){g.fillStyle(0xff5438,.65);g.fillRect(r.x,r.y,r.w,r.h);}
      g.fillStyle(b.state==='transition'?0xffd77b:0x765138,b.state==='dying'?.5:1);g.fillRect(b.x,b.y,b.w,b.h);
      g.fillStyle(0xffbb61);g.fillRect(b.x+12,b.y+25,12,8);g.fillRect(b.x+56,b.y+25,12,8);
    }
  }
  destroy(){this.graphics.destroy();}
}
