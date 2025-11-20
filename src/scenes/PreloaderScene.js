// /src/scenes/PreloaderScene.js
import Phaser from 'phaser';
import { adManager } from '../AdManager.js';
import { dataManager } from '../DataManager.js';
import { TILE_TYPES } from '../GameConfig.js';
import { analyticsManager } from '../AnalyticsManager.js';
import { localizationManager } from '../LocalizationManager.js';

export default class PreloaderScene extends Phaser.Scene {
    constructor() {
        super('PreloaderScene');
    }

    preload() {
        console.log('Preloading assets...');
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        this.loadingText = this.add.text(width / 2, height / 2, 'Loading...', { font: '20px monospace', fill: '#ffffff' }).setOrigin(0.5);

        this.load.json('ru_locale', 'assets/locales/ru.json');
        this.load.json('en_locale', 'assets/locales/en.json');
        
        this.load.image('button', 'assets/ui_button_default.png');
        this.load.image('particle', 'assets/particle.png');
        this.load.image('background_kitchen', 'assets/background_kitchen.png');
        this.load.image('background_greenhouse', 'assets/background_greenhouse.png');
        this.load.image('background_coop', 'assets/background_coop.png');
        this.load.image('icon_coop', 'assets/icon_coop.png');
        this.load.image('icon_greenhouse', 'assets/icon_greenhouse.png');

        for (const key in TILE_TYPES) {
            const assetId = TILE_TYPES[key];
            if (assetId !== 0) { this.load.image(assetId, `assets/${assetId}.png`); }
        }
        
        const chickenVariations = ['A', 'B', 'C'];
        const chickenStates = ['resting', 'ready'];
        for (const variation of chickenVariations) {
            for (const state of chickenStates) {
                this.load.image(`chicken_${variation}_${state}`, `assets/chicken_${variation}_${state}.png`);
            }
        }
        
        const plantVariations = ['A', 'B', 'C'];
        const plantStates = ['growing', 'ready'];
        for (const variation of plantVariations) {
            for (const state of plantStates) {
                this.load.image(`tomato_plant_${variation}_${state}`, `assets/tomato_plant_${variation}_${state}.png`);
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
            const ysdk = await YaGames.init();
            console.log('Yandex SDK is ready!');
            
            const detectedLang = ysdk.environment.i18n.lang;
            const lang = ['ru', 'en'].includes(detectedLang) ? detectedLang : 'en';
            const localeData = this.cache.json.get(`${lang}_locale`);
            localizationManager.init(ysdk, localeData);
            
            this.loadingText.setText(localizationManager.getString('loading'));
            
            adManager.init(ysdk);
            analyticsManager.init(ysdk);
            
            const player = await ysdk.getPlayer();
            await dataManager.init(player);

            ysdk.features.LoadingAPI?.ready();
            
            this.startGame();
        } catch (err) {
            console.error('Yandex SDK or Player Data init error:', err);
            const lang = navigator.language.startsWith('ru') ? 'ru' : 'en';
            const localeCache = this.cache.json.get(`${lang}_locale`);
            const errorMessage = localeCache ? localeCache.sdk_init_error : 'Could not connect to game server.';
            this.showError(errorMessage);
        }
    }

    startGame() {
        console.log('Preload complete, starting Game & UI Scenes...');
        // --- ИЗМЕНЕНИЕ: ЗАПУСКАЕМ ОБЕ СЦЕНЫ ---
        this.scene.start('GameScene');
        this.scene.launch('UIScene'); // launch() запускает сцену параллельно с другой
    }

    showError(message) {
        this.loadingText.setStyle({ font: '18px monospace', fill: '#ff0000', wordWrap: { width: this.cameras.main.width - 40 } });
        this.loadingText.setText(message);
    }
}