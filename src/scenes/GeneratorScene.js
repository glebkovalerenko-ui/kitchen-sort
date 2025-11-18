// /src/scenes/GeneratorScene.js
import Phaser from 'phaser';
import { GENERATORS, GREENHOUSE_SLOTS, COOP_SLOTS } from '../gameConfig.js';
import { dataManager } from '../DataManager.js';
import { adManager } from '../AdManager.js';

export default class GeneratorScene extends Phaser.Scene {
    constructor() {
        super('GeneratorScene');
    }

    init(data) {
        this.generatorId = data.id;
        this.config = GENERATORS[this.generatorId];
        this.slotData = (this.generatorId === 'coop') ? COOP_SLOTS : GREENHOUSE_SLOTS;
        this.producerSprites = [];
        this.upgradePanel = null;
    }

    create() {
        const bg = this.add.image(this.game.config.width / 2, this.game.config.height / 2, `background_${this.generatorId}`);
        bg.setDisplaySize(this.game.config.width, this.game.config.height);

        for (const slot of this.slotData) {
            const sprite = this.add.sprite(slot.x, slot.y, 'placeholder').setScale(slot.scale).setVisible(false);
            this.producerSprites.push(sprite);
        }

        this.createUI();
        this.refreshAllDisplays();
    }
    
    update(time, delta) {
        const state = dataManager.getGeneratorState(this.generatorId);
        const capacity = dataManager.getCurrentGeneratorValue(this.generatorId, 'capacity');
        
        if (state.charges < capacity) {
            const cooldown = dataManager.getCurrentGeneratorValue(this.generatorId, 'speed');
            const now = Date.now();
            const timePassed = (now - state.lastChargeTimestamp) / 1000;

            if (timePassed >= cooldown) {
                const chargesToAdd = Math.floor(timePassed / cooldown);
                const newCharges = Math.min(capacity, state.charges + chargesToAdd);
                
                if (newCharges > state.charges) {
                    state.charges = newCharges;
                    state.lastChargeTimestamp += chargesToAdd * cooldown * 1000;
                    dataManager.setGeneratorState(this.generatorId, state);
                    this.refreshAllDisplays();
                }
            }
        }
        
        this.updateTimerText();
    }
    
    createUI() {
        this.add.text(this.game.config.width / 2, 60, this.config.name, { fontSize: '48px', fill: '#ffffff', stroke: '#333333', strokeThickness: 6 }).setOrigin(0.5);
        const backBtn = this.add.image(80, 60, 'button').setScale(0.7).setInteractive();
        this.add.text(backBtn.x, backBtn.y, 'Назад', { fontSize: '24px', fill: '#000' }).setOrigin(0.5);
        backBtn.on('pointerdown', () => {
            this.sound.play('click'); // ИЗМЕНЕНО
            this.scene.resume('GameScene');
            this.scene.stop();
        });

        const uiPanelY = this.game.config.height - 100;
        const textStyle = { fontSize: '24px', fill: '#ffffff', stroke: '#000', strokeThickness: 4 };
        this.timerText = this.add.text(40, uiPanelY, '', textStyle).setOrigin(0, 0.5);
        this.chargesText = this.add.text(40, uiPanelY + 30, '', textStyle).setOrigin(0, 0.5);

        this.collectBtn = this.add.image(this.game.config.width - 400, uiPanelY + 15, 'button').setScale(1.2).setInteractive();
        this.add.text(this.collectBtn.x, this.collectBtn.y, 'Собрать все', { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        this.collectBtn.on('pointerdown', this.onCollectClicked, this);

        const upgradeBtn = this.add.image(this.game.config.width - 150, uiPanelY + 15, 'button').setScale(1.2).setInteractive();
        this.add.text(upgradeBtn.x, upgradeBtn.y, 'Улучшить', { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        upgradeBtn.on('pointerdown', () => {
             this.sound.play('click'); // ИЗМЕНЕНО
             this.showUpgradePanel();
        });
    }

    onCollectClicked() {
        this.sound.play('click'); // ИЗМЕНЕНО
        const state = dataManager.getGeneratorState(this.generatorId);
        const chargesToCollect = state.charges;

        if (chargesToCollect > 0) {
            const gameScene = this.scene.get('GameScene');
            gameScene.addCollectedItemsToGrid(this.config.produces, chargesToCollect);

            const capacity = dataManager.getCurrentGeneratorValue(this.generatorId, 'capacity');
            if (state.charges === capacity) {
                state.lastChargeTimestamp = Date.now();
            }
            state.charges = 0;
            dataManager.setGeneratorState(this.generatorId, state);
            this.refreshAllDisplays();
        }
    }

    showUpgradePanel() {
        if (this.upgradePanel) {
            this.refreshAllDisplays();
            return;
        }

        this.upgradePanel = this.add.container(this.game.config.width / 2, this.game.config.height / 2);
        this.upgradePanel.setDepth(10);

        const overlay = this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0x000000, 0.7).setInteractive();
        this.upgradePanel.add(overlay);
        
        const panelBG = this.add.graphics();
        panelBG.fillStyle(0x333333, 1);
        panelBG.lineStyle(2, 0xffffff, 1);
        panelBG.fillRoundedRect(-350, -280, 700, 560, 16);
        this.upgradePanel.add(panelBG);

        this.upgradePanel.add(this.add.text(0, -240, `Улучшения: ${this.config.name}`, { fontSize: '32px', fill: '#fff' }).setOrigin(0.5));
        
        const closeBtn = this.add.text(320, -250, 'X', { fontSize: '32px', fill: '#ff0000' }).setOrigin(0.5).setInteractive();
        closeBtn.on('pointerdown', this.hideUpgradePanel, this);
        this.upgradePanel.add(closeBtn);
        
        this.upgradeRows = {};
        const upgradeTypes = ['capacity', 'speed', 'bonus'];
        upgradeTypes.forEach((type, index) => {
            const yPos = -150 + index * 100;
            this.createUpgradeRow(type, yPos);
        });
        
        const boostBtn = this.add.image(0, 180, 'button').setScale(1.2).setInteractive();
        const boostBtnText = this.add.text(boostBtn.x, boostBtn.y, 'Бонус (Ad)', { fontSize: '28px', fill: '#000' }).setOrigin(0.5);
        this.upgradePanel.add([boostBtn, boostBtnText]);
        boostBtn.on('pointerdown', () => {
            this.sound.play('click'); // ИЗМЕНЕНО
            adManager.showRewarded(this, 'rewarded_generator_boost', {
                onRewarded: () => {
                    const state = dataManager.getGeneratorState(this.generatorId);
                    const capacity = dataManager.getCurrentGeneratorValue(this.generatorId, 'capacity');
                    state.charges = Math.min(capacity, state.charges + 1);
                    dataManager.setGeneratorState(this.generatorId, state);
                    dataManager.save(true);
                    this.refreshAllDisplays();
                },
                onError: () => {
                    boostBtnText.setText('Ошибка');
                    boostBtn.disableInteractive().setTint(0x888888);
                }
            });
        });

        this.refreshAllDisplays();
    }

    hideUpgradePanel() {
        this.sound.play('click'); // ИЗМЕНЕНО
        if (this.upgradePanel) {
            this.upgradePanel.destroy();
            this.upgradePanel = null;
        }
    }

    createUpgradeRow(type, y) {
        const config = this.config.upgrades[type];
        const row = {
            name: this.add.text(-320, y, config.name, { fontSize: '24px', fill: '#fff' }).setOrigin(0, 0.5),
            level: this.add.text(-320, y + 30, '', { fontSize: '20px', fill: '#aaa' }).setOrigin(0, 0.5),
            button: this.add.image(200, y + 15, 'button').setInteractive(),
            costText: this.add.text(200, y + 15, '', { fontSize: '28px', fill: '#000' }).setOrigin(0.5)
        };
        
        row.button.on('pointerdown', () => {
            this.sound.play('click'); // ИЗМЕНЕНО
            const success = dataManager.upgradeGenerator(this.generatorId, type);
            if (success) {
                this.refreshAllDisplays();
            } else {
                this.tweens.add({
                    targets: row.button,
                    x: row.button.x + 10,
                    duration: 50,
                    ease: 'Power1',
                    yoyo: true,
                    repeat: 2
                });
            }
        });
        
        this.upgradePanel.add([row.name, row.level, row.button, row.costText]);
        this.upgradeRows[type] = row;
    }

    refreshAllDisplays() {
        const state = dataManager.getGeneratorState(this.generatorId);
        const capacity = dataManager.getCurrentGeneratorValue(this.generatorId, 'capacity');
        this.chargesText.setText(`Готово: ${state.charges} / ${capacity}`);
        
        if (state.charges > 0) {
            this.collectBtn.setAlpha(1).setInteractive();
        } else {
            this.collectBtn.setAlpha(0.5).disableInteractive();
        }

        const variations = ['A', 'B', 'C'];
        const assetNames = (this.generatorId === 'coop') 
            ? { ready: 'chicken_VAR_ready', resting: 'chicken_VAR_resting' }
            : { ready: 'tomato_plant_VAR_ready', resting: 'tomato_plant_VAR_growing' };
            
        for (let i = 0; i < this.producerSprites.length; i++) {
            const sprite = this.producerSprites[i];
            if (i < capacity) {
                sprite.setVisible(true);
                const variation = variations[i % variations.length];
                const stateKey = (i < state.charges) ? 'ready' : 'resting';
                const texture = assetNames[stateKey].replace('VAR', variation);
                sprite.setTexture(texture);
            } else {
                sprite.setVisible(false);
            }
        }

        if (this.upgradePanel && this.upgradePanel.active) {
            for (const type in this.upgradeRows) {
                const row = this.upgradeRows[type];
                const level = dataManager.getGeneratorUpgradeLevel(this.generatorId, type);
                const cost = dataManager.getGeneratorUpgradeCost(this.generatorId, type);
                
                row.level.setText(`Ур. ${level} -> ${level + 1}`);
                row.costText.setText(`${cost}`);
                
                if (dataManager.getCoins() < cost) {
                    row.button.setTint(0x888888);
                } else {
                    row.button.clearTint();
                }
            }
        }
    }

    updateTimerText() {
        const state = dataManager.getGeneratorState(this.generatorId);
        const capacity = dataManager.getCurrentGeneratorValue(this.generatorId, 'capacity');
        if (state.charges >= capacity) {
            this.timerText.setText('Готово к сбору!');
            return;
        }
        const cooldown = dataManager.getCurrentGeneratorValue(this.generatorId, 'speed');
        const timePassed = (Date.now() - state.lastChargeTimestamp) / 1000;
        const timeRemaining = Math.max(0, cooldown - timePassed);
        const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        const seconds = Math.floor(timeRemaining % 60).toString().padStart(2, '0');
        this.timerText.setText(`Следующий через: ${minutes}:${seconds}`);
    }
}