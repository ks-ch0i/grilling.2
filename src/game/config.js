import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene.js';
import { StageScene } from './scenes/StageScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';
import { ResultScene } from './scenes/ResultScene.js';
export function createGameConfig(parent) {
  return { type: Phaser.AUTO, parent, width: 640, height: 360, pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [TitleScene,StageScene,SettingsScene,ResultScene], backgroundColor: '#263848' };
}
