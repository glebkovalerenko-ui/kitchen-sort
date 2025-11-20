// /src/scenes/GeneratorScene.js
import Phaser from 'phaser';
import { GENERATORS, GREENHOUSE_SLOTS, COOP_SLOTS } from '../GameConfig.js';
import { dataManager } from '../DataManager.js';
import { adManager } from '../AdManager.js';
import { localizationManager } from '../LocalizationManager.js'; // <-- ИМПОРТ

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
        const textStyle = { fontSize: '28px', fill: '#ffffff', stroke: '#000000', strokeThickness: 5 };

        this.add.text(this.game.config.width / 2, 60, this.config.name, { fontSize: '48px', fill: '#ffffff', stroke: '#333333', strokeThickness: 6 }).setOrigin(0.5);
        const backBtn = this.add.image(80, 60, 'button').setScale(0.7).setInteractive();
        this.add.text(backBtn.x, backBtn.y, localizationManager.getString('btn_back'), { fontSize: '24px', fill: '#000' }).setOrigin(0.5);
        backBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.scene.resume('GameScene');
            this.scene.stop();
        });

        this.chargesText = this.add.text(this.game.config.width / 2, 120, '', textStyle).setOrigin(0.5);
        this.timerText = this.add.text(this.game.config.width / 2, 155, '', textStyle).setOrigin(0.5);

        const uiPanelY = this.game.config.height - 80;

        this.collectBtn = this.add.image(this.game.config.width / 4 + 50, uiPanelY, 'button').setScale(1.2).setInteractive();
        this.add.text(this.collectBtn.x, this.collectBtn.y, localizationManager.getString('btn_collect'), { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        this.collectBtn.on('pointerdown', this.onCollectClicked, this);

        const upgradeBtn = this.add.image(this.game.config.width * 3 / 4 - 50, uiPanelY, 'button').setScale(1.2).setInteractive();
        this.add.text(upgradeBtn.x, upgradeBtn.y, localizationManager.getString('btn_upgrade'), { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        upgradeBtn.on('pointerdown', () => {
             this.sound.play('click');
             this.showUpgradePanel();
        });
    }

    onCollectClicked() {
        this.sound.play('click');
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
            this.refreshUpgradePanel();
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
        
        const panelTitle = localizationManager.getString('upgrade_panel_title', { generatorName: this.config.name });
        this.upgradePanel.add(this.add.text(0, -240, panelTitle, { fontSize: '32px', fill: '#fff' }).setOrigin(0.5));
        
        const closeBtn = this.add.text(320, -250, 'X', { fontSize: '32px', fill: '#ff0000' }).setOrigin(0.5).setInteractive();
        closeBtn.on('pointerdown', this.hideUpgradePanel, this);
        this.upgradePanel.add(closeBtn);
        
        this.upgradeRows = {};
        const upgradeTypes = ['capacity', 'speed', 'bonus'];
        upgradeTypes.forEach((type, index) => {
            const yPos = -150 + index * 100;
            this.createUpgradeRow(type, yPos);
        });
        
        // --- УЛУЧШЕНИЕ UX РЕКЛАМЫ ---
        const boostBtn = this.add.image(0, 180, 'button').setScale(1.2).setInteractive();
        const boostBtnText = this.add.text(boostBtn.x, boostBtn.y, localizationManager.getString('generator_boost_ad_reward'), { fontSize: '28px', fill: '#000' }).setOrigin(0.5);
        this.upgradePanel.add([boostBtn, boostBtnText]);
        boostBtn.on('pointerdown', () => {
            this.sound.play('click');
            boostBtn.disableInteractive().setTint(0x888888);
            boostBtnText.setText(localizationManager.getString('ui_loading'));

            adManager.showRewarded(this, 'rewarded_generator_boost', {
                onRewarded: () => {
                    const state = dataManager.getGeneratorState(this.generatorId);
                    const capacity = dataManager.getCurrentGeneratorValue(this.generatorId, 'capacity');
                    state.charges = Math.min(capacity, state.charges + 1);
                    dataManager.setGeneratorState(this.generatorId, state);
                    dataManager.save(true);
                    this.refreshAllDisplays(); // Обновляем основную сцену
                    
                    // Прямо здесь обновляем состояние кнопки
                    boostBtn.setInteractive().clearTint();
                    boostBtnText.setText(localizationManager.getString('generator_boost_ad_reward'));
                },
                onError: () => {
                    boostBtnText.setText(localizationManager.getString('btn_ad_error'));
                },
                onClose: () => {
                    if (boostBtn.active) {
                       boostBtn.setInteractive().clearTint();
                       boostBtnText.setText(localizationManager.getString('generator_boost_ad_reward'));
                    }
                }
            });
        });

        this.refreshUpgradePanel();
    }

    hideUpgradePanel() {
        this.sound.play('click');
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
            this.sound.play('click');
            const success = dataManager.upgradeGenerator(this.generatorId, type);
            if (success) {
                this.refreshUpgradePanel();
                // Также обновляем текст монет на основной сцене, т.к. они изменились
                const gameScene = this.scene.get('GameScene');
                gameScene.events.emit('updateCoins', dataManager.getCoins());
            } else {
                this.tweens.add({ targets: row.button, x: row.button.x + 10, duration: 50, ease: 'Power1', yoyo: true, repeat: 2 });
            }
        });
        
        this.upgradePanel.add([row.name, row.level, row.button, row.costText]);
        this.upgradeRows[type] = row;
    }

    refreshAllDisplays() {
        const state = dataManager.getGeneratorState(this.generatorId);
        const capacity = dataManager.getCurrentGeneratorValue(this.generatorId, 'capacity');
        this.chargesText.setText(`${localizationManager.getString('generator_header')} ${state.charges} / ${capacity}`);
        
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
            this.refreshUpgradePanel();
        }
    }

    refreshUpgradePanel() {
        if (!this.upgradePanel || !this.upgradePanel.active) return;
        
        for (const type in this.upgradeRows) {
            const row = this.upgradeRows[type];
            const level = dataManager.getGeneratorUpgradeLevel(this.generatorId, type);
            const cost = dataManager.getGeneratorUpgradeCost(this.generatorId, type);
            
            row.level.setText(`${localizationManager.getString('gadget_level', {level: level})} -> ${level + 1}`);
            row.costText.setText(`${cost}`);
            
            if (dataManager.getCoins() < cost) {
                row.button.setTint(0x888888).disableInteractive();
            } else {
                row.button.clearTint().setInteractive();
            }
        }
    }

    updateTimerText() {
        const state = dataManager.getGeneratorState(this.generatorId);
        const capacity = dataManager.getCurrentGeneratorValue(this.generatorId, 'capacity');
        if (state.charges >= capacity) {
            this.timerText.setText(localizationManager.getString('generator_timer_ready'));
            return;
        }
        const cooldown = dataManager.getCurrentGeneratorValue(this.generatorId, 'speed');
        const timePassed = (Date.now() - state.lastChargeTimestamp) / 1000;
        const timeRemaining = Math.max(0, cooldown - timePassed);
        const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        const seconds = Math.floor(timeRemaining % 60).toString().padStart(2, '0');
        this.timerText.setText(`${localizationManager.getString('generator_timer_next')} ${minutes}:${seconds}`);
    }
}