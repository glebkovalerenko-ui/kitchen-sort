// /src/scenes/UpgradeScene.js
import Phaser from 'phaser';
import { dataManager } from '../DataManager.js';
import { GADGETS } from '../GameConfig.js';
import { localizationManager } from '../LocalizationManager.js';

export default class UpgradeScene extends Phaser.Scene {
    constructor() {
        super('UpgradeScene');
    }

    create() {
        this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0x000000, 0.7).setOrigin(0);
        this.add.text(this.game.config.width / 2, 80, localizationManager.getString('gadgets_title'), { fontSize: '48px', fill: '#ffffff' }).setOrigin(0.5);
        this.currentCoinsText = this.add.text(this.game.config.width / 2, 140, localizationManager.getString('your_coins') + ' ' + dataManager.getCoins(), { fontSize: '32px', fill: '#ffff00' }).setOrigin(0.5);

        const gadgetIds = Object.keys(GADGETS);
        gadgetIds.forEach((id, index) => {
            const yPos = 250 + index * 220;
            this.createGadgetCard(id, yPos);
        });

        const backBtn = this.add.image(this.game.config.width / 2, this.game.config.height - 100, 'button').setOrigin(0.5).setInteractive();
        this.add.text(backBtn.x, backBtn.y, localizationManager.getString('btn_back'), { fontSize: '32px', fill: '#000000' }).setOrigin(0.5);
        backBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.scene.resume('GameScene');
            this.scene.stop();
        });
    }

    createGadgetCard(gadgetId, y) {
        const level = dataManager.getGadgetLevel(gadgetId);
        const cost = dataManager.getGadgetUpgradeCost(gadgetId);
        
        // --- КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: ИСПОЛЬЗУЕМ КЛЮЧИ ЛОКАЛИЗАЦИИ ---
        const gadgetName = localizationManager.getString(`gadget_${gadgetId}_name`);
        const gadgetDesc = localizationManager.getString(`gadget_${gadgetId}_desc`);
        const currentLevelText = localizationManager.getString('gadget_level', { level: level });

        this.add.text(this.game.config.width / 2, y, `${gadgetName} ${currentLevelText}`, { fontSize: '32px', fill: '#ffffff' }).setOrigin(0.5);
        this.add.text(this.game.config.width / 2, y + 45, gadgetDesc, { fontSize: '22px', fill: '#cccccc', wordWrap: { width: 600 }, align: 'center' }).setOrigin(0.5);

        const buyBtn = this.add.image(this.game.config.width / 2, y + 110, 'button').setOrigin(0.5).setInteractive();
        const buyBtnText = this.add.text(buyBtn.x, buyBtn.y, localizationManager.getString('btn_gadget_upgrade', { cost: cost }), { fontSize: '24px', fill: '#000'}).setOrigin(0.5);
        
        buyBtn.on('pointerdown', () => {
            this.sound.play('click');
            if (dataManager.upgradeGadget(gadgetId)) {
                this.scene.get('GameScene').events.emit('updateCoins', dataManager.getCoins());
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
            buyBtn.setTint(0x888888).disableInteractive();
        }
    }
}