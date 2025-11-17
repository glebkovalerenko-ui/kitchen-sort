// /src/scenes/PreloaderScene.js
import Phaser from 'phaser';
import { adManager } from '../AdManager.js';

export default class PreloaderScene extends Phaser.Scene {
    constructor() {
        super('PreloaderScene');
    }

    preload() {
        console.log('Preloading assets...');
        // Загружаем изображения ингредиентов
        this.load.image('egg', 'assets/egg.png');
        this.load.image('fried_egg', 'assets/fried_egg.png');
        this.load.image('omelette', 'assets/omelette.png');
        this.load.image('tomato', 'assets/tomato.png');
        this.load.image('diced_tomatoes', 'assets/diced_tomatoes.png');
        this.load.image('tomato_sauce', 'assets/tomato_sauce.png');
        // TODO: Добавить сюда остальные изображения

        // Загружаем изображения UI
        this.load.image('button', 'assets/ui_button_default.png'); // Предполагаем, что у тебя есть этот файл

        // Загружаем звуки
        this.load.audio('merge_sfx', 'assets/merge.mp3');
        // TODO: Добавить сюда остальные звуки
    }

    create() {
        // --- НОВЫЙ КОД ИНИЦИАЛИЗАЦИИ ---
        // YaGames доступен глобально, так как мы подключили его в index.html
        YaGames.init()
            .then(ysdk => {
                console.log('Yandex SDK is ready!');
                // Инициализируем наш AdManager, передавая ему готовый SDK
                adManager.init(ysdk);
                
                // Теперь, когда все готово, запускаем игру
                this.startGame();
            })
            .catch(err => {
                console.error('Yandex SDK init error:', err);
                // Даже если SDK не загрузился (например, из-за блокировщика рекламы),
                // мы все равно запускаем игру, но реклама работать не будет.
                this.startGame();
            });
    }

    startGame() {
        console.log('Preload complete, starting GameScene...');
        this.scene.start('GameScene');
    }
}