import Phaser from 'phaser';
import { createGameConfig } from './game/config.js';
import './styles.css';
import { disposeAudioManager } from './game/audio/AudioManager.js';
const game = new Phaser.Game(createGameConfig('game'));
game.events.once(Phaser.Core.Events.DESTROY, disposeAudioManager);
