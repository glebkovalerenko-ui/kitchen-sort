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
    width: 800,
    height: 1000,
    scene: [PreloaderScene, GameScene, UIScene, GameOverScene, CollectionScene, UpgradeScene, GeneratorScene],
    backgroundColor: '#333333',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);

// --- ДОБАВЛЕН ОБРАБОТЧИК СВОРАЧИВАНИЯ ОКНА ---
// Этот код будет работать глобально для всей игры
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Если вкладка стала неактивной - ставим игру на паузу
        console.log('Tab is hidden, pausing game.');
        game.scene.pauseAll();
        game.sound.pauseAll();
    } else {
        // Если вкладка снова активна - возобновляем игру
        console.log('Tab is visible, resuming game.');
        game.scene.resumeAll();
        game.sound.resumeAll();
    }
});