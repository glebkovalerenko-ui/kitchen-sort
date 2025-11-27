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
        // Текст загрузки, который видит пользователь
        this.loadingText = this.add.text(width / 2, height / 2, 'Loading...', { font: '20px monospace', fill: '#ffffff' }).setOrigin(0.5);

        // Локализация
        this.load.json('ru_locale', 'assets/locales/ru.json');
        this.load.json('en_locale', 'assets/locales/en.json');
        
        // UI и Эффекты
        this.load.image('button', 'assets/ui_button_default.png');
        this.load.image('particle', 'assets/particle.png');
        
        // Фоны
        this.load.image('background_kitchen', 'assets/background_kitchen.png');
        this.load.image('background_greenhouse', 'assets/background_greenhouse.png');
        this.load.image('background_coop', 'assets/background_coop.png');
        
        // Иконки генераторов
        this.load.image('icon_coop', 'assets/icon_coop.png');
        this.load.image('icon_greenhouse', 'assets/icon_greenhouse.png');

        // Ингредиенты
        for (const key in TILE_TYPES) {
            const assetId = TILE_TYPES[key];
            if (assetId !== 0) { this.load.image(assetId, `assets/${assetId}.png`); }
        }
        
        // Вариации Куриц (Генератор)
        const chickenVariations = ['A', 'B', 'C'];
        const chickenStates = ['resting', 'ready'];
        for (const variation of chickenVariations) {
            for (const state of chickenStates) {
                this.load.image(`chicken_${variation}_${state}`, `assets/chicken_${variation}_${state}.png`);
            }
        }
        
        // Вариации Растений (Генератор)
        const plantVariations = ['A', 'B', 'C'];
        const plantStates = ['growing', 'ready'];
        for (const variation of plantVariations) {
            for (const state of plantStates) {
                this.load.image(`tomato_plant_${variation}_${state}`, `assets/tomato_plant_${variation}_${state}.png`);
            }
        }

        // Аудио
        this.load.audio('merge', 'assets/sfx_merge_pop_01.mp3');
        this.load.audio('click', 'assets/sfx_ui_click_positive_01.mp3');
        this.load.audio('swoosh', 'assets/sfx_item_drag_swoosh_01.mp3');
        this.load.audio('unlock', 'assets/sfx_unlock_chime_01.mp3');
        this.load.audio('music', 'assets/music_background_loop_cozy.mp3');
    }

    async create() {
        console.log('Initializing Game...');
        
        let ysdk = null;
        let player = null;
        
        // --- 1. Попытка инициализации SDK ---
        try {
            // Пытаемся инициализировать SDK. Если AdBlock блокирует скрипт, 
            // YaGames может быть не определен или init() выбросит ошибку.
            if (typeof YaGames !== 'undefined') {
                ysdk = await YaGames.init();
                console.log('Yandex SDK is ready!');
                
                // Пробуем получить игрока. Это тоже может упасть, если сеть нестабильна.
                try {
                    player = await ysdk.getPlayer();
                } catch (playerErr) {
                    console.warn('Failed to load Player object (Network error?), proceeding as guest.', playerErr);
                    player = null;
                }
            } else {
                throw new Error('YaGames is undefined (likely AdBlock).');
            }
        } catch (err) {
            console.warn('Yandex SDK init failed or blocked. Starting in Offline Mode.', err);
            ysdk = null;
            player = null;
        }

        // --- 2. Настройка языка ---
        // Если SDK нет, берем язык из браузера
        let langCode = 'en';
        if (ysdk && ysdk.environment && ysdk.environment.i18n) {
            langCode = ysdk.environment.i18n.lang;
        } else {
            // Fallback для офлайн режима
            langCode = navigator.language.slice(0, 2);
        }
        
        // Поддерживаем только ru и en
        const safeLang = ['ru', 'en'].includes(langCode) ? langCode : 'en';
        const localeData = this.cache.json.get(`${safeLang}_locale`);
        
        // Если SDK нет, создаем "мок" объект, чтобы LocalizationManager не упал
        // (LocalizationManager в текущем коде требует объект с environment.i18n.lang)
        const localizationContext = ysdk || { environment: { i18n: { lang: safeLang } } };
        localizationManager.init(localizationContext, localeData);
        
        // Обновляем текст загрузки на локализованный
        this.loadingText.setText(localizationManager.getString('loading'));
        
        // --- 3. Инициализация менеджеров ---
        // Передаем ysdk (может быть null) и player (может быть null)
        // Менеджеры должны уметь работать в режиме null (Safe Mode)
        
        adManager.init(ysdk);
        analyticsManager.init(ysdk);
        
        // DataManager теперь умеет обрабатывать null-игрока (см. предыдущий фикс)
        await dataManager.init(player);

        // --- 4. Сигнал платформе о готовности ---
        if (ysdk && ysdk.features && ysdk.features.LoadingAPI) {
            ysdk.features.LoadingAPI.ready();
            console.log('Sent LoadingAPI.ready() signal.');
        }
        
        // --- 5. Запуск игры ---
        this.startGame();
    }

    startGame() {
        console.log('Preload complete, starting Game & UI Scenes...');
        // Запускаем основную сцену
        this.scene.start('GameScene');
        // Запускаем UI поверх
        this.scene.launch('UIScene');
    }
}