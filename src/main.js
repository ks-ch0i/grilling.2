import Phaser from 'phaser';
import { createGameConfig } from './game/config.js';
import './styles.css';
new Phaser.Game(createGameConfig('game'));
