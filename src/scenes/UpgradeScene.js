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
        this.add.text(this.game.config.width / 2, 80, 'Магазин Гаджетов', { fontSize: '48px', fill: '#ffffff' }).setOrigin(0.5);
        this.currentCoinsText = this.add.text(this.game.config.width / 2, 140, 'Ваши монеты: ' + dataManager.getCoins(), { fontSize: '32px', fill: '#ffff00' }).setOrigin(0.5);

        const gadgetIds = Object.keys(GADGETS);
        gadgetIds.forEach((id, index) => {
            const yPos = 250 + index * 220; // Увеличили отступ между карточками
            this.createGadgetCard(id, yPos);
        });

        const backBtn = this.add.image(this.game.config.width / 2, this.game.config.height - 100, 'button').setOrigin(0.5).setInteractive();
        this.add.text(backBtn.x, backBtn.y, 'Назад', { fontSize: '32px', fill: '#000000' }).setOrigin(0.5);
        backBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.scene.resume('GameScene');
            this.scene.stop();
        });
    }

    createGadgetCard(gadgetId, y) {
        const gadget = GADGETS[gadgetId];
        const level = dataManager.getGadgetLevel(gadgetId);
        const cost = dataManager.getGadgetUpgradeCost(gadgetId);

        this.add.text(this.game.config.width / 2, y, `${gadget.name} (Ур. ${level})`, { fontSize: '32px', fill: '#ffffff' }).setOrigin(0.5);
        this.add.text(this.game.config.width / 2, y + 45, gadget.description, { fontSize: '22px', fill: '#cccccc', wordWrap: { width: 600 }, align: 'center' }).setOrigin(0.5);

        // КНОПКА ПЕРЕМЕЩЕНА ВНИЗ И В ЦЕНТР
        const buyBtn = this.add.image(this.game.config.width / 2, y + 110, 'button').setOrigin(0.5).setInteractive();
        const buyBtnText = this.add.text(buyBtn.x, buyBtn.y, `Улучшить: ${cost}`, { fontSize: '24px', fill: '#000'}).setOrigin(0.5);
        
        buyBtn.on('pointerdown', () => {
            this.sound.play('click');
            if (dataManager.upgradeGadget(gadgetId)) {
                this.scene.restart();
            } else {
                this.tweens.add({
                    targets: buyBtn,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 50,
                    yoyo: true,
                    repeat: 2
                });
            }
        });

        if (dataManager.getCoins() < cost) {
            buyBtn.setTint(0x888888);
        }
    }
}