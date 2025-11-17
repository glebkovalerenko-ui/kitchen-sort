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
        
        // Яичная цепочка
        this.load.image('egg', 'assets/egg.png');
        this.load.image('fried_egg', 'assets/fried_egg.png');
        this.load.image('omelette', 'assets/omelette.png');
        this.load.image('shakshuka', 'assets/shakshuka.png');
        this.load.image('breakfast_platter', 'assets/breakfast_platter.png');

        // Томатная цепочка
        this.load.image('tomato', 'assets/tomato.png');
        this.load.image('diced_tomatoes', 'assets/diced_tomatoes.png');
        this.load.image('tomato_sauce', 'assets/tomato_sauce.png');
        this.load.image('tomato_soup', 'assets/tomato_soup.png');
        this.load.image('gazpacho', 'assets/gazpacho.png');

        // Загружаем изображения UI
        this.load.image('button', 'assets/ui_button_default.png');
        this.load.image('particle', 'assets/particle.png');

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