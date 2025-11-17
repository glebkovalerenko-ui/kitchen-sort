// /src/scenes/UpgradeScene.js
import Phaser from 'phaser';
import { dataManager } from '../DataManager.js';
import { GADGETS } from '../gameConfig.js';

export default class UpgradeScene extends Phaser.Scene {
    constructor() {
        super('UpgradeScene');
    }

    create() {
        this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0x000000, 0.7).setOrigin(0);
        this.add.text(this.game.config.width / 2, 80, 'Gadget Shop', { fontSize: '48px', fill: '#ffffff' }).setOrigin(0.5);
        this.currentCoinsText = this.add.text(this.game.config.width / 2, 140, 'Your Coins: ' + dataManager.getCoins(), { fontSize: '32px', fill: '#ffff00' }).setOrigin(0.5);

        const gadgetIds = Object.keys(GADGETS);
        gadgetIds.forEach((id, index) => {
            const yPos = 250 + index * 200;
            this.createGadgetCard(id, yPos);
        });

        const backBtn = this.add.image(this.game.config.width / 2, this.game.config.height - 100, 'button')
            .setOrigin(0.5) // Правильный порядок
            .setInteractive()
            .on('pointerdown', () => {
                this.scene.resume('GameScene');
                this.scene.stop();
            });
        this.add.text(backBtn.x, backBtn.y, 'Back', { fontSize: '32px', fill: '#000000' }).setOrigin(0.5);

        // --- ВЫЗЫВАЕМ НАШ ОТЛАДЧИК ДЛЯ КНОПКИ НАЗАД ---
        this.drawDebugHitbox(backBtn);
    }

    createGadgetCard(gadgetId, y) {
        const gadget = GADGETS[gadgetId];
        const level = dataManager.getGadgetLevel(gadgetId);
        const cost = dataManager.getGadgetUpgradeCost(gadgetId);

        this.add.text(100, y, `${gadget.name} (Lvl ${level})`, { fontSize: '32px', fill: '#ffffff' }).setOrigin(0, 0.5);
        this.add.text(100, y + 45, gadget.description, { fontSize: '22px', fill: '#cccccc', wordWrap: { width: 450 } }).setOrigin(0, 0.5);

        const buyBtn = this.add.image(this.game.config.width - 150, y, 'button')
            .setOrigin(0.5) // Правильный порядок
            .setInteractive();
        const buyBtnText = this.add.text(buyBtn.x, buyBtn.y, `Buy: ${cost}`, { fontSize: '28px', fill: '#000'}).setOrigin(0.5);
        
        buyBtn.on('pointerdown', () => {
            if (dataManager.upgradeGadget(gadgetId)) {
                this.scene.restart();
            }
        });

        if (dataManager.getCoins() < cost) {
            buyBtn.setTint(0x888888);
        }

        // --- ВЫЗЫВАЕМ НАШ ОТЛАДЧИК ДЛЯ КНОПКИ КУПИТЬ ---
        this.drawDebugHitbox(buyBtn);
    }

    // --- ДОБАВЛЯЕМ МЕТОД ОТЛАДЧИКА ---
    drawDebugHitbox(gameObject) {
        const hitbox = gameObject.getBounds();
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0xff0000, 0.7);
        graphics.strokeRectShape(hitbox);
    }
}