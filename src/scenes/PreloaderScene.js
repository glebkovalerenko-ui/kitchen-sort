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
        
        // --- Загрузка ассетов еды ---
        for (const key in TILE_TYPES) {
            const assetId = TILE_TYPES[key];
            if (assetId !== 0) {
                this.load.image(assetId, `assets/${assetId}.png`);
            }
        }
        
        // --- Загрузка UI и Эффектов ---
        this.load.image('button', 'assets/ui_button_default.png');
        this.load.image('particle', 'assets/particle.png');

        // --- Загрузка Фонов ---
        this.load.image('background_kitchen', 'assets/background_kitchen.png');
        this.load.image('background_greenhouse', 'assets/background_greenhouse.png');
        this.load.image('background_coop', 'assets/background_coop.png');

        // --- Загрузка иконок Генераторов ---
        this.load.image('icon_coop', 'assets/icon_coop.png');
        this.load.image('icon_greenhouse', 'assets/icon_greenhouse.png');

        // --- Загрузка спрайтов Куриц (с состояниями) ---
        const chickenVariations = ['A', 'B', 'C'];
        const chickenStates = ['resting', 'ready'];
        for (const variation of chickenVariations) {
            for (const state of chickenStates) {
                const assetId = `chicken_${variation}_${state}`;
                this.load.image(assetId, `assets/${assetId}.png`);
            }
        }
        
        // --- Загрузка спрайтов Кустов (с состояниями) ---
        const plantVariations = ['A', 'B', 'C'];
        const plantStates = ['growing', 'ready'];
        for (const variation of plantVariations) {
            for (const state of plantStates) {
                const assetId = `tomato_plant_${variation}_${state}`;
                this.load.image(assetId, `assets/${assetId}.png`);
            }
        }

        // --- НОВАЯ ЗАГРУЗКА ЗВУКОВ ---
        // Мы используем короткие, понятные ключи для вызова в коде
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
            
            adManager.init(ysdk);
            analyticsManager.init(ysdk);
            
            const player = await ysdk.getPlayer();
            await dataManager.init(player);
            
            this.startGame();
        } catch (err) {
            console.error('Yandex SDK or Player Data init error:', err);
            this.startGame();
        }
    }

    startGame() {
        console.log('Preload complete, starting GameScene...');
        this.scene.start('GameScene');
    }
}