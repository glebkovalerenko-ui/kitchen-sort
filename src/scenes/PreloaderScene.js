// /src/scenes/PreloaderScene.js
import Phaser from 'phaser';
import { adManager } from '../AdManager.js';
import { dataManager } from '../DataManager.js';
import { TILE_TYPES } from '../gameConfig.js';
import { analyticsManager } from '../AnalyticsManager.js';

export default class PreloaderScene extends Phaser.Scene {
    constructor() {
        super('PreloaderScene');
    }

    preload() {
        console.log('Preloading assets...');
        
        // --- Отображение текста загрузки ---
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.loadingText = this.add.text(width / 2, height / 2, 'Loading...', { font: '20px monospace', fill: '#ffffff' }).setOrigin(0.5);

        // ... (остальной код preload без изменений) ...
        this.load.image('button', 'assets/ui_button_default.png');
        this.load.image('particle', 'assets/particle.png');
        this.load.image('background_kitchen', 'assets/background_kitchen.png');
        this.load.image('background_greenhouse', 'assets/background_greenhouse.png');
        this.load.image('background_coop', 'assets/background_coop.png');
        this.load.image('icon_coop', 'assets/icon_coop.png');
        this.load.image('icon_greenhouse', 'assets/icon_greenhouse.png');
        const chickenVariations = ['A', 'B', 'C'];
        const chickenStates = ['resting', 'ready'];
        for (const variation of chickenVariations) {
            for (const state of chickenStates) {
                const assetId = `chicken_${variation}_${state}`;
                this.load.image(assetId, `assets/${assetId}.png`);
            }
        }
        const plantVariations = ['A', 'B', 'C'];
        const plantStates = ['growing', 'ready'];
        for (const variation of plantVariations) {
            for (const state of plantStates) {
                const assetId = `tomato_plant_${variation}_${state}`;
                this.load.image(assetId, `assets/${assetId}.png`);
            }
        }
        this.load.audio('merge', 'assets/sfx_merge_pop_01.mp3');
        this.load.audio('click', 'assets/sfx_ui_click_positive_01.mp3');
        this.load.audio('swoosh', 'assets/sfx_item_drag_swoosh_01.mp3');
        this.load.audio('unlock', 'assets/sfx_unlock_chime_01.mp3');
        this.load.audio('music', 'assets/music_background_loop_cozy.mp3');
    }

    async create() {
        console.log('Initializing Yandex SDK...');
        try {
            // Устанавливаем тайм-аут для инициализации SDK
            const ysdkPromise = YaGames.init();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('SDK Init Timeout')), 5000)
            );

            const ysdk = await Promise.race([ysdkPromise, timeoutPromise]);
            
            console.log('Yandex SDK is ready!');
            
            adManager.init(ysdk);
            analyticsManager.init(ysdk);
            
            const player = await ysdk.getPlayer();
            await dataManager.init(player);
            
            this.startGame();
        } catch (err) {
            console.error('Yandex SDK or Player Data init error:', err);
            // Показываем сообщение об ошибке игроку
            this.showError('Could not connect to game server. Please check your internet connection and try again.');
        }
    }

    startGame() {
        console.log('Preload complete, starting GameScene...');
        this.scene.start('GameScene');
    }

    showError(message) {
        this.loadingText.setStyle({ font: '18px monospace', fill: '#ff0000', wordWrap: { width: this.cameras.main.width - 40 } });
        this.loadingText.setText(message);
    }
}