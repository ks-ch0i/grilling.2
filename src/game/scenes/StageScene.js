import Phaser from 'phaser';
import { InputController } from '../input/InputController.js';
import { createPlayer, stepPlayer, isAttackActive } from '../sim/player.js';
import { registerAttackHit } from '../sim/combat.js';
import { PlayerView } from '../render/PlayerView.js';
const STEP = 1000/60;
export class StageScene extends Phaser.Scene {
  constructor() { super('stage'); }
  create() {
    this.terrain = [{x:0,y:304,w:1920,h:56},{x:-16,y:-1000,w:16,h:1400},{x:1920,y:-1000,w:16,h:1400},{x:0,y:-16,w:1920,h:16}];
    this.targets = [{id:'one',x:300,y:272,w:24,h:32,hits:0},{id:'two',x:560,y:272,w:24,h:32,hits:0}];
    this.player = createPlayer(); this.player.grounded = true; this.accumulator = 0;
    this.worldGraphics = this.add.graphics(); this.playerView = new PlayerView(this);
    this.hud = this.add.text(12,10,'',{fontFamily:'monospace',fontSize:'14px',color:'#ffffff'}).setScrollFactor(0).setDepth(10);
    this.followPoint = {x:128,y:180};
    this.cameras.main.setBounds(0,0,1920,360); this.cameras.main.startFollow(this.followPoint, true, 1, 1);
    this.inputController = new InputController(window, this.game.canvas);
    this.pauseReset = () => { this.accumulator = 0; this.inputController.reset(); };
    window.addEventListener('blur',this.pauseReset); document.addEventListener('visibilitychange',this.pauseReset);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('blur',this.pauseReset); document.removeEventListener('visibilitychange',this.pauseReset);
      this.inputController.destroy(); this.playerView.destroy();
    });
  }
  update(_time, delta) {
    if (document.hidden || !document.hasFocus()) { this.pauseReset(); this.renderWorld(); return; }
    this.accumulator += Math.min(delta, STEP*8);
    let ticks = 0;
    while (this.accumulator >= STEP && ticks++ < 8) {
      const frame = this.inputController.sample(this);
      const result = stepPlayer(this.player, frame, this.terrain); this.player = result.player;
      if (isAttackActive(this.player)) for (const target of this.targets) {
        if (registerAttackHit(this.player, target, this.terrain)) target.hits++;
      }
      for (const event of result.events) if (event.type === 'dive-impact') for (const target of this.targets) {
        if (target.x < event.x+24 && target.x+target.w > event.x-24 && target.y < event.y+12 && target.y+target.h > event.y-12) target.hits++;
      }
      this.accumulator -= STEP;
    }
    this.renderWorld();
  }
  renderWorld() {
    this.followPoint.x = this.player.x + this.player.w/2;
    this.drawWorld(); this.playerView.sync(this.player);
    this.hud.setText(`HP ${'♥'.repeat(this.player.hp)}   COMBO ${this.player.combo}   TARGET ${this.targets.map(t=>t.hits).join(' / ')}`);
  }
  drawWorld() {
    const g = this.worldGraphics; g.clear(); g.fillStyle(0x394e5b); g.fillRect(0,0,1920,304);
    g.fillStyle(0x546c54); g.fillRect(0,304,1920,56); g.fillStyle(0x8dad74); g.fillRect(0,304,1920,4);
    for (const target of this.targets) { g.fillStyle(0xd28d68); g.fillRect(target.x,target.y,target.w,target.h); g.lineStyle(2,0xffe8b3); g.strokeRect(target.x,target.y,target.w,target.h); }
  }
}
