// Импортируем сам движок Phaser из установленной библиотеки
import Phaser from 'phaser';

// Создаем пустую игровую сцену
class GameScene extends Phaser.Scene {
    constructor() {
        // 'GameScene' - это уникальный ключ для этой сцены
        super('GameScene');
    }

    // preload() - здесь мы будем загружать картинки и звуки
    preload() {
        console.log('Preload Scene');
    }

    // create() - эта функция вызывается один раз после preload, здесь мы создаем игровые объекты
    create() {
        console.log('Create Scene');
        // Давайте добавим что-то видимое, чтобы убедиться, что всё работает.
        // add.rectangle(x, y, width, height, color)
        this.add.rectangle(400, 300, 100, 100, 0xff0000); // Красный квадрат в центре
    }

    // update() - эта функция вызывается каждый кадр, здесь будет игровая логика
    update() {
        // Пока пусто
    }
}

// Конфигурация игры
const config = {
    type: Phaser.AUTO, // Автоматически выбирать, как рендерить игру (WebGL или Canvas)
    width: 800,       // Ширина игрового окна в пикселях
    height: 600,      // Высота игрового окна
    scene: [GameScene] // Список сцен в игре. У нас пока одна.
};

// Создаем новый экземпляр игры с нашей конфигурацией
const game = new Phaser.Game(config);