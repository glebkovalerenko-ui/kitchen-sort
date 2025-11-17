// /src/scenes/UIScene.js
import Phaser from 'phaser';
import { dataManager } from '../DataManager.js';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        // Получаем ссылку на GameScene в самом начале
        const gameScene = this.scene.get('GameScene');

        // --- Элементы счёта (ИСПРАВЛЕНО) ---
        // ИЗМЕНЕНИЕ: При создании текста, сразу берем актуальный score из GameScene
        this.scoreText = this.add.text(50, 50, 'Score: ' + gameScene.score, { fontSize: '32px', fill: '#ffffff' });
        // Слушатель событий остается для будущих обновлений
        gameScene.events.on('updateScore', (score) => { this.scoreText.setText('Score: ' + score); }, this);

        // С монетами уже все было правильно, так как они берутся из dataManager
        this.coinsText = this.add.text(50, 90, 'Coins: ' + dataManager.getCoins(), { fontSize: '32px', fill: '#ffffff' });
        gameScene.events.on('updateCoins', (coins) => { this.coinsText.setText('Coins: ' + coins); }, this);
        
        // --- Кнопка "Книга Рецептов" ---
        const collectionBtn = this.add.image(this.game.config.width - 150, 70, 'button')
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.scene.pause('GameScene');
                this.scene.launch('CollectionScene');
            });
        this.add.text(collectionBtn.x, collectionBtn.y, 'Book', { fontSize: '28px', fill: '#000'}).setOrigin(0.5);

        // --- Кнопка "Магазин Гаджетов" ---
        const newX = collectionBtn.x - 240 - 20; 

        const upgradeBtn = this.add.image(newX, 70, 'button')
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.scene.pause('GameScene');
                this.scene.launch('UpgradeScene');
            });
        this.add.text(upgradeBtn.x, upgradeBtn.y, 'Shop', { fontSize: '28px', fill: '#000'}).setOrigin(0.5);
        
        // Отладчик можно убрать, если он больше не нужен
        // this.drawDebugHitbox(collectionBtn);
        // this.drawDebugHitbox(upgradeBtn);
    }
    
    // drawDebugHitbox(gameObject) {
    //     const hitbox = gameObject.getBounds();
    //     const graphics = this.add.graphics();
    //     graphics.lineStyle(2, 0xff0000, 0.7);
    //     graphics.strokeRectShape(hitbox);
    // }
}