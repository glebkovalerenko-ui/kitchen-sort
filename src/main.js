// /src/main.js
import Phaser from 'phaser';
import PreloaderScene from './scenes/PreloaderScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import CollectionScene from './scenes/CollectionScene.js';
import UpgradeScene from './scenes/UpgradeScene.js';
import GeneratorScene from './scenes/GeneratorScene.js';
import { dataManager } from './DataManager.js';

const config = {
    type: Phaser.CANVAS,
    width: 800,
    height: 1000,
    // --- ИЗМЕНЕНИЕ: УКАЗЫВАЕМ ВСЕ СЦЕНЫ, НО ЗАПУСКАТЬСЯ БУДЕТ ПЕРВАЯ ---
    scene: [PreloaderScene, GameScene, UIScene, GameOverScene, CollectionScene, UpgradeScene, GeneratorScene],
    backgroundColor: '#333333',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);

// ИЗМЕНЕНИЕ: Эта строка была удалена, так как обработка теперь происходит в index.html
// game.canvas.oncontextmenu = (e) => e.preventDefault();

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Tab is hidden, pausing game and forcing save.');
        dataManager.save(true);
        game.sound.pauseAll();
    } else {
        console.log('Tab is visible, resuming sound.');
        game.sound.resumeAll();
    }
});