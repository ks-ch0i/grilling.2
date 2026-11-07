import Phaser from 'phaser';
import { StageScene } from './scenes/StageScene.js';
export function createGameConfig(parent) {
  return { type: Phaser.AUTO, parent, width: 640, height: 360, pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [StageScene], backgroundColor: '#263848' };
}
