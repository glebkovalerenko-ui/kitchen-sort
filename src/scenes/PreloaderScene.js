// /src/scenes/PreloaderScene.js
import Phaser from 'phaser';
import { adManager } from '../AdManager.js';
import { dataManager } from '../DataManager.js'; // Импортируем DataManager

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
        this.load.image('button', 'assets/ui_button_default.png');

        // Загружаем звуки
        this.load.audio('merge_sfx', 'assets/merge.mp3');
        // TODO: Добавить сюда остальные звуки
    }

    async create() {
        console.log('Initializing Yandex SDK...');
        try {
            const ysdk = await YaGames.init();
            console.log('Yandex SDK is ready!');
            
            // Инициализируем AdManager
            adManager.init(ysdk);

            // Получаем объект игрока для работы с сохранениями
            const player = await ysdk.getPlayer();
            
            // Инициализируем DataManager и ждем загрузки данных
            await dataManager.init(player);

            // Теперь, когда все готово, запускаем игру
            this.startGame();

        } catch (err) {
            console.error('Yandex SDK or Player Data init error:', err);
            // Даже если SDK не загрузился, мы можем запустить игру,
            // но сохранения и реклама работать не будут.
            // DataManager в этом случае будет работать с дефолтными данными.
            this.startGame();
        }
    }

    startGame() {
        console.log('Preload complete, starting GameScene...');
        this.scene.start('GameScene');
    }
}