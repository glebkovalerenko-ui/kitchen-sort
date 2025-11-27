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
    // ИЗМЕНЕНИЕ: Используем AUTO для выбора WebGL по возможности (лучшая производительность)
    type: Phaser.AUTO,
    width: 800,
    height: 1000,
    scene: [PreloaderScene, GameScene, UIScene, GameOverScene, CollectionScene, UpgradeScene, GeneratorScene],
    backgroundColor: '#333333',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    // Настройки аудио для лучшей совместимости
    audio: {
        disableWebAudio: false
    }
};

const game = new Phaser.Game(config);

// --- ОБРАБОТКА ФОКУСА (КРИТИЧНО ДЛЯ YANDEX GAMES) ---
// Игра обязана выключать звук и сохраняться, когда игрок уходит со вкладки.

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Tab is hidden: Muting sound and forcing save.');
        
        // 1. Принудительное сохранение (теперь безопасно, благодаря проверкам в DataManager)
        dataManager.save(true);
        
        // 2. Выключение звука
        if (game.sound) {
            // Ставим на паузу все треки
            game.sound.pauseAll();
            // Глобально глушим движок (гарантия тишины)
            game.sound.mute = true;
        }
    } else {
        console.log('Tab is visible: Resuming sound based on user settings.');
        
        if (game.sound) {
            // Возобновляем проигрывание (таймеры звуков продолжат идти)
            game.sound.resumeAll();
            
            // ВАЖНО: Восстанавливаем громкость ТОЛЬКО если игрок сам не выключил звук в настройках.
            // Если dataManager говорит, что звук выключен (isMuted = true), мы оставляем game.sound.mute = true.
            const isUserMuted = dataManager.isMuted();
            game.sound.mute = isUserMuted;
        }
    }
});