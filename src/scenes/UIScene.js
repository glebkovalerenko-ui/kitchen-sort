// /src/scenes/UIScene.js
import Phaser from 'phaser';
import { dataManager } from '../DataManager.js';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        // --- Элементы счёта ---
        this.scoreText = this.add.text(50, 50, 'Score: 0', { fontSize: '32px', fill: '#ffffff' });
        const gameScene = this.scene.get('GameScene');
        gameScene.events.on('updateScore', (score) => { this.scoreText.setText('Score: ' + score); }, this);

        this.coinsText = this.add.text(50, 90, 'Coins: ' + dataManager.getCoins(), { fontSize: '32px', fill: '#ffffff' });
        gameScene.events.on('updateCoins', (coins) => { this.coinsText.setText('Coins: ' + coins); }, this);
        
        // --- Кнопка "Книга Рецептов" ---
        const collectionBtn = this.add.image(this.game.config.width - 150, 70, 'button')
            // ПРАВИЛЬНЫЙ ПОРЯДОК: Сначала меняем точку опоры...
            .setOrigin(0.5)
            // ...а потом делаем интерактивным!
            .setInteractive()
            .on('pointerdown', () => {
                this.scene.pause('GameScene');
                this.scene.launch('CollectionScene');
            });
        this.add.text(collectionBtn.x, collectionBtn.y, 'Book', { fontSize: '28px', fill: '#000'}).setOrigin(0.5);

        // --- Кнопка "Магазин Гаджетов" ---
        // ИЗМЕНЯЕМ КООРДИНАТУ X ЗДЕСЬ!
        // Старая: this.game.config.width - 350
        // Новая: Позиция первой кнопки (collectionBtn.x) минус её ширина (240) минус отступ (20)
        const newX = collectionBtn.x - 240 - 20; 

        const upgradeBtn = this.add.image(newX, 70, 'button') // Используем новую координату
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.scene.pause('GameScene');
                this.scene.launch('UpgradeScene');
            });
        this.add.text(upgradeBtn.x, upgradeBtn.y, 'Shop', { fontSize: '28px', fill: '#000'}).setOrigin(0.5);
        
        // Оставляем отладчик, чтобы увидеть результат
        this.drawDebugHitbox(collectionBtn);
        this.drawDebugHitbox(upgradeBtn);
    }
    
    drawDebugHitbox(gameObject) {
        const hitbox = gameObject.getBounds();
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0xff0000, 0.7);
        graphics.strokeRectShape(hitbox);
    }
}