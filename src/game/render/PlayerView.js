import { ATTACK_HALF_ANGLE, ATTACK_RADIUS } from '../sim/constants.js';
import { isAttackActive } from '../sim/player.js';
// Temporary geometric artwork: T04 replaces it without changing the player model.
export class PlayerView {
  constructor(scene) { this.graphics = scene.add.graphics().setDepth(5); }
  sync(player) {
    const g = this.graphics; g.clear();
    if (player.mode === 'dead') return;
    const x = Math.round(player.x + player.w/2), y = Math.round(player.y + player.h/2);
    const a = player.mode === 'attack' ? player.lockedAim : player.aim;
    const bodyAngle = player.facing * Math.PI/4;
    g.fillStyle(player.invulnerableTicks && player.invulnerableTicks % 4 < 2 ? 0xffffff : 0x68d4d1, 1);
    g.fillRect(x-8, y-14, 16, 28);
    g.fillStyle(0x183448, 1); g.fillCircle(Math.round(x+Math.cos(bodyAngle)*5), Math.round(y+Math.sin(bodyAngle)*5), 3);
    if (isAttackActive(player)) {
      g.fillStyle(0xffdf73, 0.25); g.slice(x,y,ATTACK_RADIUS,Math.atan2(a.y,a.x)-ATTACK_HALF_ANGLE,Math.atan2(a.y,a.x)+ATTACK_HALF_ANGLE,false); g.fillPath();
    }
    g.lineStyle(3, 0xf7f1c6, 1); g.lineBetween(x,y,Math.round(x+a.x*29),Math.round(y+a.y*29));
    g.fillStyle(0xffa36c,1); g.fillCircle(x,y,2);
  }
  destroy() { this.graphics.destroy(); }
}
