// /src/scenes/UIScene.js
import Phaser from 'phaser';
import { dataManager } from '../DataManager.js';
import { adManager } from '../AdManager.js';
import { CLEAR_BOARD_COST, ORDERS_CONFIG } from '../GameConfig.js';
import { localizationManager } from '../LocalizationManager.js';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        this.uiContainer = this.add.container(); 
        this.isAnimatingOrder = false; // --- НОВОЕ: Флаг-блокиратор анимации

        this.gameScene = this.scene.get('GameScene'); 
        const textStyle = { fontSize: '32px', fill: '#ffffff', stroke: '#000000', strokeThickness: 5 };

        this.scoreText = this.add.text(40, 40, '', textStyle);
        this.coinsText = this.add.text(40, 80, '', textStyle);
        
        this.gameScene.events.on('updateScore', this.updateScore, this);
        this.gameScene.events.on('updateCoins', this.updateCoins, this);
        
        this.updateScore(this.gameScene.score);
        this.updateCoins(dataManager.getCoins());
        
        const padding = 20;
        
        const collectionBtn = this.add.image(this.game.config.width - padding, 70, 'button').setOrigin(1, 0.5).setInteractive();
        const collectionBtnText = this.add.text(collectionBtn.getCenter().x, collectionBtn.getCenter().y, localizationManager.getString('btn_collection'), { fontSize: '28px', fill: '#000'}).setOrigin(0.5);
        collectionBtn.on('pointerdown', () => { this.sound.play('click'); this.scene.pause('GameScene'); this.scene.launch('CollectionScene'); });

        const upgradeBtn = this.add.image(collectionBtn.getLeftCenter().x - padding, 70, 'button').setOrigin(1, 0.5).setInteractive();
        const upgradeBtnText = this.add.text(upgradeBtn.getCenter().x, upgradeBtn.getCenter().y, localizationManager.getString('btn_upgrades'), { fontSize: '28px', fill: '#000'}).setOrigin(0.5);
        upgradeBtn.on('pointerdown', () => { this.sound.play('click'); this.scene.pause('GameScene'); this.scene.launch('UpgradeScene'); });
        
        const clearBtn = this.add.image(this.game.config.width / 2, this.game.config.height - 70, 'button').setOrigin(0.5).setInteractive();
        const clearBtnText = this.add.text(clearBtn.x, clearBtn.y, localizationManager.getString('btn_clear'), { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        clearBtn.on('pointerdown', () => { this.sound.play('click'); this.showClearBoardPanel(); });

        this.muteBtn = this.add.text(60, this.game.config.height - 60, '🔊', { fontSize: '50px' }).setOrigin(0.5).setInteractive();
        this.muteBtn.on('pointerdown', this.toggleMute, this);
        
        this.applyMuteState();
        this.clearBoardPanel = null;

        this.createOrdersPanel();
        
        this.orderUpdateTimer = this.time.addEvent({ delay: 1000, callback: this.updateOrders, callbackScope: this, loop: true });

        // --- НОВОЕ: Создаем эмиттер для монет ---
        this.coinEmitter = this.add.particles(0, 0, 'particle', {
            speed: { min: 200, max: 400 },
            angle: { min: -120, max: -60 }, // Летят вверх-вправо
            scale: { start: 0.8, end: 0 },
            lifespan: 800,
            blendMode: 'ADD',
            tint: 0xFFD700, // Золотой цвет
            emitting: false
        });
        this.coinEmitter.setDepth(300);
        // --- ---

        this.uiContainer.add([ this.scoreText, this.coinsText, collectionBtn, collectionBtnText, upgradeBtn, upgradeBtnText, clearBtn, clearBtnText, this.muteBtn, this.ordersContainer ]);

        const gameEvents = this.gameScene.events;
        gameEvents.on('hideUI', () => this.uiContainer.setVisible(false), this);
        gameEvents.on('showUI', () => this.uiContainer.setVisible(true), this);

        this.events.on('shutdown', () => {
            gameEvents.off('updateScore', this.updateScore, this);
            gameEvents.off('updateCoins', this.updateCoins, this);
            gameEvents.off('hideUI');
            gameEvents.off('showUI');
            this.orderUpdateTimer.destroy();
        });
    }

    // ... (updateScore, updateCoins, toggleMute, applyMuteState - без изменений)
    updateScore(score) {
        if (this.scoreText && this.scoreText.active) { 
            this.scoreText.setText(localizationManager.getString('score') + ' ' + score); 
        }
    }

    updateCoins(coins) {
        if (this.coinsText && this.coinsText.active) { 
            this.coinsText.setText(localizationManager.getString('coins') + ' ' + coins); 
        }
    }

    toggleMute() {
        const isMuted = !dataManager.isMuted();
        dataManager.setMuted(isMuted);
        this.applyMuteState();
    }

    applyMuteState() {
        const isMuted = dataManager.isMuted();
        this.sound.mute = isMuted;
        this.muteBtn.setText(isMuted ? '🔇' : '🔊');
    }

    createOrdersPanel() {
        this.ordersContainer = this.add.container(25, 160);
        this.orderSlotsUI = [];
        const titleStyle = { fontSize: '28px', fill: '#ffffff', stroke: '#000000', strokeThickness: 4 };
        const title = this.add.text(0, 0, localizationManager.getString('orders_panel_title'), titleStyle);
        this.ordersContainer.add(title);
        const slotHeight = 220;
        const slotWidth = 160;

        for (let i = 0; i < ORDERS_CONFIG.MAX_ACTIVE_ORDERS; i++) {
            const yPos = 40 + (i * slotHeight);
            const slotContainer = this.add.container(0, yPos);
            const bg = this.add.graphics();
            bg.fillStyle(0x000000, 0.4).fillRoundedRect(0, 0, slotWidth, 200, 16);
            bg.lineStyle(2, 0xffffff, 0.5).strokeRoundedRect(0, 0, slotWidth, 200, 16);
            const itemSprite = this.add.sprite(slotWidth / 2, 60, 'egg').setScale(0.8);
            const rewardContainer = this.add.container(slotWidth / 2 - 25, 120);
            const coinIcon = this.add.graphics().fillStyle(0xFFD700, 1).fillCircle(0, 0, 12);
            const rewardText = this.add.text(20, 0, '1234', { fontSize: '24px', fill: '#FFF', stroke: '#000', strokeThickness: 4 }).setOrigin(0, 0.5);
            rewardContainer.add([coinIcon, rewardText]);
            const fulfillButton = this.add.image(slotWidth / 2, 165, 'button').setScale(0.6).setInteractive();
            const fulfillButtonText = this.add.text(fulfillButton.x, fulfillButton.y, localizationManager.getString('btn_fulfill_order'), { fontSize: '24px', fill: '#000' }).setOrigin(0.5);
            const timerText = this.add.text(slotWidth / 2, 100, '', { fontSize: '28px', fill: '#FFF', stroke: '#000', strokeThickness: 4, align: 'center' }).setOrigin(0.5);
            slotContainer.add([bg, itemSprite, rewardContainer, fulfillButton, fulfillButtonText, timerText]);
            this.ordersContainer.add(slotContainer);
            fulfillButton.on('pointerdown', () => { this.handleFulfillOrder(i); });
            this.orderSlotsUI.push({ container: slotContainer, itemSprite, rewardContainer, rewardText, timerText, fulfillButton, fulfillButtonText });
        }
    }
    
    updateOrders() {
        if (this.isAnimatingOrder) return; // Не обновляем UI во время анимации сдачи
        dataManager.updateOrderCooldowns();
        const ordersState = dataManager.getOrdersState();
        if (!ordersState) return;
        const { activeOrders, orderSlots } = ordersState;

        this.orderSlotsUI.forEach((slotUI, index) => {
            const slotData = orderSlots[index];
            const now = Date.now();
            const wasVisible = slotUI.fulfillButton.visible; // Запоминаем, был ли заказ видим

            if (slotData.orderId) {
                const order = activeOrders.find(o => o.id === slotData.orderId);
                if (order) {
                    slotUI.itemSprite.setTexture(order.itemType).setVisible(true).setScale(0.8);
                    slotUI.rewardContainer.setVisible(true);
                    slotUI.timerText.setVisible(false);
                    slotUI.fulfillButton.setVisible(true);
                    slotUI.fulfillButtonText.setVisible(true);
                    const hasItem = this.gameScene.findItemOnGrid(order.itemType);
                    if (hasItem) {
                        slotUI.fulfillButton.setInteractive().clearTint();
                    } else {
                        slotUI.fulfillButton.disableInteractive().setTint(0x888888);
                    }
                    // --- НОВОЕ: Анимация появления ---
                    if (!wasVisible) {
                        slotUI.container.setScale(0);
                        this.tweens.add({ targets: slotUI.container, scale: 1, duration: 300, ease: 'Back.easeOut' });
                    }
                }
            } else if (now < slotData.cooldownUntil) {
                const remaining = Math.ceil((slotData.cooldownUntil - now) / 1000);
                const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
                const seconds = (remaining % 60).toString().padStart(2, '0');
                slotUI.timerText.setText(`${minutes}:${seconds}`).setVisible(true);
                slotUI.itemSprite.setVisible(false);
                slotUI.rewardContainer.setVisible(false);
                slotUI.fulfillButton.setVisible(false);
                slotUI.fulfillButtonText.setVisible(false);
            } else {
                 slotUI.timerText.setText('...').setVisible(true);
                 slotUI.itemSprite.setVisible(false);
                 slotUI.rewardContainer.setVisible(false);
                 slotUI.fulfillButton.setVisible(false);
                 slotUI.fulfillButtonText.setVisible(false);
            }
        });
    }

    // --- ИЗМЕНЕНИЕ: Логика полностью переработана для поддержки анимаций ---
    handleFulfillOrder(slotIndex) {
        if (this.isAnimatingOrder) return; // Защита от двойного клика/анимации

        const ordersState = dataManager.getOrdersState();
        const slotData = ordersState.orderSlots[slotIndex];
        const order = ordersState.activeOrders.find(o => o.id === slotData.orderId);

        if (!order) return;
        
        this.isAnimatingOrder = true; // Блокируем дальнейшие действия
        this.orderSlotsUI[slotIndex].fulfillButton.disableInteractive().setTint(0x888888);
        this.sound.play('click');
        
        const startPos = this.gameScene.getFulfillableItemPosition(order.itemType);
        if (!startPos) { // Доп. проверка на случай рассинхрона
            this.isAnimatingOrder = false;
            return;
        }

        const slotUI = this.orderSlotsUI[slotIndex];
        const endPos = new Phaser.Math.Vector2();
        slotUI.itemSprite.getWorldTransformMatrix().transformPoint(0, 0, endPos);
        
        dataManager.fulfillOrder(order.id); // Обновляем данные немедленно
        
        // Запускаем анимацию полета предмета
        this.gameScene.playItemFlyAnimation(order.itemType, startPos, endPos, () => {
            // Этот колбэк выполнится, когда предмет долетит до слота
            this.onFulfillAnimationComplete(endPos, order.coinReward);
        });
    }

    // --- НОВЫЙ МЕТОД: Завершение цепочки анимаций ---
    onFulfillAnimationComplete(position, reward) {
        this.sound.play('unlock', { volume: 0.8 });
        
        // Запускаем эмиттер монет
        this.coinEmitter.emitParticleAt(position.x, position.y, 10);
        
        // Анимируем счетчик монет
        this.tweens.add({
            targets: this.coinsText,
            scale: 1.2,
            duration: 150,
            yoyo: true,
            ease: 'Quad.easeOut'
        });

        // Через небольшую задержку разблокируем систему
        this.time.delayedCall(500, () => {
            this.isAnimatingOrder = false;
        });
    }

    // ... (showClearBoardPanel, hideClearBoardPanel - без изменений)
    showClearBoardPanel() {
        if (this.clearBoardPanel) return;
        this.clearBoardPanel = this.add.container(this.game.config.width / 2, this.game.config.height / 2);
        this.clearBoardPanel.setDepth(100);
        const overlay = this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0x000000, 0.7).setInteractive();
        overlay.on('pointerdown', () => {});
        const panelHeight = 480;
        const panelBG = this.add.graphics().fillStyle(0x333333, 1).lineStyle(2, 0xffffff, 1).fillRoundedRect(-250, -panelHeight / 2, 500, panelHeight, 16);
        const title = this.add.text(0, -panelHeight / 2 + 50, localizationManager.getString('clear_board_title'), { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        const payBtn = this.add.image(0, -60, 'button').setScale(1.2).setInteractive();
        this.add.text(payBtn.x, payBtn.y, `${CLEAR_BOARD_COST}`, { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        if (dataManager.getCoins() < CLEAR_BOARD_COST) {
            payBtn.setTint(0x888888).disableInteractive();
        } else {
            payBtn.on('pointerdown', () => {
                this.sound.play('click');
                if (dataManager.removeCoins(CLEAR_BOARD_COST)) {
                    dataManager.save(true);
                    this.updateCoins(dataManager.getCoins());
                    this.gameScene.clearBoard();
                    this.hideClearBoardPanel();
                }
            });
        }
        const adBtn = this.add.image(0, 60, 'button').setScale(1.2).setInteractive();
        const adBtnText = this.add.text(adBtn.x, adBtn.y, localizationManager.getString('clear_board_ad'), { fontSize: '28px', fill: '#000' }).setOrigin(0.5);
        adBtn.on('pointerdown', () => {
            this.sound.play('click');
            adBtn.disableInteractive().setTint(0x888888);
            adBtnText.setText(localizationManager.getString('ui_loading'));
            adManager.showRewarded(this.gameScene, 'rewarded_clear_field', {
                onRewarded: () => {
                    this.gameScene.clearBoard();
                    this.hideClearBoardPanel();
                },
                onError: () => { 
                    adBtnText.setText(localizationManager.getString('btn_ad_error'));
                    this.time.delayedCall(1500, () => {
                        if (this.clearBoardPanel && adBtn.active) {
                            adBtn.setInteractive().clearTint();
                            adBtnText.setText(localizationManager.getString('clear_board_ad'));
                        }
                    });
                },
                onClose: () => {
                    if (this.clearBoardPanel && adBtn.active) {
                        adBtn.setInteractive().clearTint();
                        adBtnText.setText(localizationManager.getString('clear_board_ad'));
                    }
                }
            });
        });
        const backBtn = this.add.image(0, panelHeight / 2 - 60, 'button').setInteractive();
        this.add.text(backBtn.x, backBtn.y, localizationManager.getString('btn_back'), { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        backBtn.on('pointerdown', this.hideClearBoardPanel, this);
        this.clearBoardPanel.add([overlay, panelBG, title, payBtn, adBtn, adBtnText, backBtn]);
    }

    hideClearBoardPanel() {
        if (this.clearBoardPanel) {
            this.sound.play('click');
            this.clearBoardPanel.destroy();
            this.clearBoardPanel = null;
        }
    }
}