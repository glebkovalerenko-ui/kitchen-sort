// /src/main.js
import Phaser from 'phaser';
import PreloaderScene from './scenes/PreloaderScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import CollectionScene from './scenes/CollectionScene.js'; // <-- ДОБАВИТЬ
import UpgradeScene from './scenes/UpgradeScene.js';     // <-- ДОБАВИТЬ

const config = {
    type: Phaser.CANVAS, // Оставляем этот режим
    width: 800,
    height: 1000,
    scene: [PreloaderScene, GameScene, UIScene, GameOverScene, CollectionScene, UpgradeScene], // Список всех сцен!
    backgroundColor: '#333333',
    
};

const game = new Phaser.Game(config);