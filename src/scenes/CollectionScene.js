// /src/scenes/CollectionScene.js
import Phaser from 'phaser';
import { dataManager } from '../DataManager.js';
import { TILE_TYPES } from '../gameConfig.js';

export default class CollectionScene extends Phaser.Scene {
    constructor() {
        super('CollectionScene');
    }

    create() {
        this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0x000000, 0.7).setOrigin(0);
        this.add.text(this.game.config.width / 2, 100, 'Recipe Book', { fontSize: '48px', fill: '#ffffff' }).setOrigin(0.5);

        const allItems = Object.values(TILE_TYPES).filter(type => type !== 0);
        const cols = 5;
        const cellWidth = 120;
        const cellHeight = 120;
        const startX = (this.game.config.width - (cols * cellWidth)) / 2 + cellWidth / 2;
        const startY = 250;

        allItems.forEach((itemKey, index) => {
            const x = startX + (index % cols) * cellWidth;
            const y = startY + Math.floor(index / cols) * cellHeight;
            if (dataManager.isUnlocked(itemKey)) {
                const sprite = this.add.sprite(x, y, itemKey);
                sprite.setScale((cellWidth / sprite.width) * 0.8);
            } else {
                this.add.text(x, y, '?', { fontSize: '64px', fill: '#ffffff' }).setOrigin(0.5);
            }
        });

        const backBtn = this.add.image(this.game.config.width / 2, this.game.config.height - 100, 'button')
            .setOrigin(0.5) // Правильный порядок
            .setInteractive()
            .on('pointerdown', () => {
                this.scene.resume('GameScene');
                this.scene.stop();
            });
        this.add.text(backBtn.x, backBtn.y, 'Back', { fontSize: '32px', fill: '#000'}).setOrigin(0.5);

        // --- ВЫЗЫВАЕМ НАШ ОТЛАДЧИК ---
        this.drawDebugHitbox(backBtn);
    }

    // --- ДОБАВЛЯЕМ МЕТОД ОТЛАДЧИКА ---
    drawDebugHitbox(gameObject) {
        const hitbox = gameObject.getBounds();
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0xff0000, 0.7);
        graphics.strokeRectShape(hitbox);
    }
}