// /src/scenes/GeneratorScene.js
import Phaser from 'phaser';
import { GENERATORS, GREENHOUSE_SLOTS, COOP_SLOTS } from '../gameConfig.js';
import { dataManager } from '../DataManager.js';

export default class GeneratorScene extends Phaser.Scene {
    constructor() {
        super('GeneratorScene');
    }

    init(data) {
        this.generatorId = data.id;
        this.config = GENERATORS[this.generatorId];
        this.slotData = (this.generatorId === 'coop') ? COOP_SLOTS : GREENHOUSE_SLOTS;
        this.producerSprites = [];
    }

    create() {
        const bg = this.add.image(this.game.config.width / 2, this.game.config.height / 2, `background_${this.generatorId}`);
        bg.setDisplaySize(this.game.config.width, this.game.config.height);

        for (const slot of this.slotData) {
            // Создаем спрайты, но пока делаем их невидимыми. `refreshDisplay` их покажет.
            const sprite = this.add.sprite(slot.x, slot.y, 'placeholder').setScale(slot.scale).setVisible(false);
            this.producerSprites.push(sprite);
        }

        this.createUI();
        this.refreshDisplay();
    }
    
    update(time, delta) {
        const state = dataManager.getGeneratorState(this.generatorId);
        const capacity = dataManager.getCurrentGeneratorValue(this.generatorId, 'capacity');
        
        let needsRefresh = false;

        if (state.charges < capacity) {
            const cooldown = dataManager.getCurrentGeneratorValue(this.generatorId, 'speed');
            const now = Date.now();
            const timePassed = (now - state.lastChargeTimestamp) / 1000;

            if (timePassed >= cooldown) {
                const chargesToAdd = Math.floor(timePassed / cooldown);
                const newCharges = Math.min(capacity, state.charges + chargesToAdd);
                
                if (newCharges > state.charges) {
                    state.charges = newCharges;
                    // Корректируем таймстемп, чтобы не терять "прогресс" перезарядки
                    state.lastChargeTimestamp += chargesToAdd * cooldown * 1000;
                    dataManager.setGeneratorState(this.generatorId, state);
                    dataManager.save();
                    needsRefresh = true; // Нужен полный рефреш
                }
            }
        }
        
        this.updateTimerText();

        if (needsRefresh) {
            this.refreshDisplay();
        }
    }
    
    createUI() {
        this.add.text(this.game.config.width / 2, 60, this.config.name, { fontSize: '48px', fill: '#ffffff', stroke: '#333333', strokeThickness: 6 }).setOrigin(0.5);
        const backBtn = this.add.image(80, 60, 'button').setScale(0.7).setInteractive();
        this.add.text(backBtn.x, backBtn.y, 'Назад', { fontSize: '24px', fill: '#000' }).setOrigin(0.5);
        backBtn.on('pointerdown', () => {
            this.sound.play('click_sfx');
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
             this.sound.play('click_sfx');
             this.showUpgradePanel();
        });
    }

    refreshDisplay() {
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
                const variation = variations[i % variations.length]; // Циклически выбираем A, B, C
                const stateKey = (i < state.charges) ? 'ready' : 'resting';
                const texture = assetNames[stateKey].replace('VAR', variation);
                sprite.setTexture(texture);
            } else {
                sprite.setVisible(false);
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

    onCollectClicked() {
        this.sound.play('click_sfx');
        const state = dataManager.getGeneratorState(this.generatorId);
        const chargesToCollect = state.charges;

        if (chargesToCollect > 0) {
            const gameScene = this.scene.get('GameScene');
            gameScene.addCollectedItemsToGrid(this.config.produces, chargesToCollect);

            state.charges = 0;
            // Сбрасываем таймер только если хранилище было заполнено до отказа.
            // Иначе, просто продолжаем отсчет с момента последнего начисления.
            const capacity = dataManager.getCurrentGeneratorValue(this.generatorId, 'capacity');
            if (chargesToCollect === capacity) {
                state.lastChargeTimestamp = Date.now();
            }
            
            dataManager.setGeneratorState(this.generatorId, state);
            dataManager.save();
            
            this.refreshDisplay();
        }
    }

    // --- НОВЫЕ МЕТОДЫ ДЛЯ ПАНЕЛИ УЛУЧШЕНИЙ ---

    showUpgradePanel() {
        if (this.upgradePanel) {
            this.refreshUpgradePanel();
            return;
        }

        // 1. Создаем контейнер для всей панели
        this.upgradePanel = this.add.container(this.game.config.width / 2, this.game.config.height / 2);
        this.upgradePanel.setDepth(10); // Убедимся, что панель поверх всего

        // 2. Фон-затемнение
        const overlay = this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0x000000, 0.7);
        overlay.setInteractive(); // Блокируем клики под панелью
        this.upgradePanel.add(overlay);
        
        // 3. Фон панели
        const panelBG = this.add.graphics();
        panelBG.fillStyle(0x333333, 1);
        panelBG.lineStyle(2, 0xffffff, 1);
        panelBG.fillRoundedRect(-350, -250, 700, 500, 16);
        panelBG.strokeRoundedRect(-350, -250, 700, 500, 16);
        this.upgradePanel.add(panelBG);

        // 4. Заголовок и кнопка закрытия
        this.upgradePanel.add(this.add.text(0, -210, `Улучшения: ${this.config.name}`, { fontSize: '32px', fill: '#fff' }).setOrigin(0.5));
        
        const closeBtn = this.add.text(320, -220, 'X', { fontSize: '32px', fill: '#ff0000' }).setOrigin(0.5).setInteractive();
        closeBtn.on('pointerdown', this.hideUpgradePanel, this);
        this.upgradePanel.add(closeBtn);
        
        // 5. Создаем строки для каждого типа улучшения
        this.upgradeRows = {};
        const upgradeTypes = ['capacity', 'speed', 'bonus'];
        upgradeTypes.forEach((type, index) => {
            const yPos = -120 + index * 120;
            this.createUpgradeRow(type, yPos);
        });

        this.refreshUpgradePanel();
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
            this.sound.play('click_sfx');
            const success = dataManager.upgradeGenerator(this.generatorId, type);
            if (success) {
                this.refreshUpgradePanel();
            } else {
                // TODO: Показать сообщение "Недостаточно монет"
                console.log('Not enough coins!');
            }
        });
        
        this.upgradePanel.add([row.name, row.level, row.button, row.costText]);
        this.upgradeRows[type] = row;
    }

    refreshUpgradePanel() {
        if (!this.upgradePanel) return;

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

    hideUpgradePanel() {
        this.sound.play('click_sfx');
        if (this.upgradePanel) {
            this.upgradePanel.destroy();
            this.upgradePanel = null;
        }
    }

    // --- Остальные методы (пока без изменений) ---
    refreshDisplay() {
        const state = dataManager.getGeneratorState(this.generatorId);
        const capacity = dataManager.getCurrentGeneratorValue(this.generatorId, 'capacity');
        
        // Обновляем текст
        this.chargesText.setText(`Готово: ${state.charges} / ${capacity}`);
        
        // Обновляем состояние кнопки "Собрать"
        if (state.charges > 0) {
            this.collectBtn.setAlpha(1).setInteractive();
        } else {
            this.collectBtn.setAlpha(0.5).disableInteractive();
        }

        // Обновляем визуальное состояние "актеров"
        const producerAssetNames = (this.generatorId === 'coop') 
            ? { ready: 'chicken_A_ready', resting: 'chicken_A_resting' }
            : { ready: 'tomato_plant_A_ready', resting: 'tomato_plant_A_growing' };
            
        for (let i = 0; i < this.slotData.length; i++) {
            const sprite = this.producerSprites[i];
            if (i < capacity) {
                sprite.setVisible(true);
                const texture = (i < state.charges) ? producerAssetNames.ready : producerAssetNames.resting;
                sprite.setTexture(texture);
            } else {
                sprite.setVisible(false); // Скрываем слоты, которые еще не куплены
            }
        }
    }

    updateTimerText() {
        const state = dataManager.getGeneratorState(this.generatorId);
        const capacity = dataManager.getCurrentGeneratorValue(this.generatorId, 'capacity');

        if (state.charges >= capacity) {
            this.timerText.setText('Хранилище заполнено!');
            return;
        }

        const cooldown = dataManager.getCurrentGeneratorValue(this.generatorId, 'speed');
        const timePassed = (Date.now() - state.lastChargeTimestamp) / 1000;
        const timeRemaining = Math.max(0, cooldown - timePassed);
        
        const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
        const seconds = Math.floor(timeRemaining % 60).toString().padStart(2, '0');
        
        this.timerText.setText(`Следующий через: ${minutes}:${seconds}`);
    }

    onCollectClicked() {
        this.sound.play('click_sfx');
        const state = dataManager.getGeneratorState(this.generatorId);
        const chargesToCollect = state.charges;

        if (chargesToCollect > 0) {
            const gameScene = this.scene.get('GameScene');
            gameScene.addCollectedItemsToGrid(this.config.produces, chargesToCollect);

            state.charges = 0;
            state.lastChargeTimestamp = Date.now(); // Сбрасываем таймер
            dataManager.setGeneratorState(this.generatorId, state);
            dataManager.save();
            
            this.refreshDisplay();
        }
    }
}