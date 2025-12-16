// /src/main.js
import Phaser from 'phaser';
import PreloaderScene from './scenes/PreloaderScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import CollectionScene from './scenes/CollectionScene.js';
import UpgradeScene from './scenes/UpgradeScene.js';
import GeneratorScene from './scenes/GeneratorScene.js';
import SettingsScene from './scenes/SettingsScene.js';
import { dataManager } from './DataManager.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 1000,
    scene: [PreloaderScene, GameScene, UIScene, GameOverScene, CollectionScene, UpgradeScene, GeneratorScene, SettingsScene],
    backgroundColor: '#333333',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    audio: {
        disableWebAudio: false
    }
};

const game = new Phaser.Game(config);

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Tab is hidden: Muting sound and forcing save.');
        dataManager.save(true);
        if (game.sound) {
            game.sound.pauseAll();
            game.sound.mute = true;
        }
    } else {
        console.log('Tab is visible: Resuming sound based on user settings.');
        if (game.sound) {
            game.sound.resumeAll();
            const isUserMuted = dataManager.isMuted();
            game.sound.mute = isUserMuted;
        }
    }
});