// /src/main.js
import Phaser from 'phaser';
import PreloaderScene from './scenes/PreloaderScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import CollectionScene from './scenes/CollectionScene.js';
import UpgradeScene from './scenes/UpgradeScene.js';
import GeneratorScene from './scenes/GeneratorScene.js';

const config = {
    type: Phaser.CANVAS,
    width: 800,   // Это наша базовая ("дизайнерская") ширина
    height: 1000, // Это наша базовая ("дизайнерская") высота
    scene: [PreloaderScene, GameScene, UIScene, GameOverScene, CollectionScene, UpgradeScene, GeneratorScene],
    backgroundColor: '#333333',
    
    // --- ДОБАВЛЕН БЛОК МАСШТАБИРОВАНИЯ ---
    scale: {
        // Режим 'FIT' вписывает наш холст в доступное пространство, сохраняя пропорции.
        // Это самый безопасный и распространенный режим для портретных игр.
        mode: Phaser.Scale.FIT,
        // Автоматически центрировать холст по горизонтали и вертикали.
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);