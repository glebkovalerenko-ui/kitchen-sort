// /src/scenes/UIScene.js
import Phaser from 'phaser';
import { dataManager } from '../DataManager.js';
import { adManager } from '../AdManager.js';
import { CLEAR_BOARD_COST, ORDERS_CONFIG, RECIPES } from '../GameConfig.js';
import { localizationManager } from '../LocalizationManager.js';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        this.uiContainer = this.add.container(); 
        this.isAnimatingOrder = false;
        this.gameScene = this.scene.get('GameScene'); 
        const textStyle = { fontSize: '24px', fill: '#ffffff', stroke: '#000000', strokeThickness: 4 };

        this.scoreText = this.add.text(20, 20, '', textStyle);
        this.coinsText = this.add.text(20, 55, '', textStyle);
        
        this.gameScene.events.on('updateScore', this.updateScore, this);
        this.gameScene.events.on('updateCoins', this.updateCoins, this);
        this.updateScore(this.gameScene.score);
        this.updateCoins(dataManager.getCoins());
        
        const settingsBtn = this.add.image(this.game.config.width - 40, 50, 'button').setScale(0.7).setInteractive();
        this.add.text(settingsBtn.x, settingsBtn.y, '⚙️', { fontSize: '30px' }).setOrigin(0.5);
        
        settingsBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.scene.pause('GameScene');
            this.scene.launch('SettingsScene');
        });

        this.trashBin = this.add.image(this.game.config.width - 60, this.game.config.height - 180, 'button').setScale(1.0).setInteractive();
        this.trashBin.setTint(0xFFaaaa); 
        this.add.text(this.trashBin.x, this.trashBin.y, '🗑️', { fontSize: '40px' }).setOrigin(0.5);
        
        this.trashBin.on('pointerdown', () => {
            this.sound.play('click');
            this.showClearBoardPanel();
        });

        this.createOrdersPanel();
        this.orderUpdateTimer = this.time.addEvent({ delay: 1000, callback: this.updateOrders, callbackScope: this, loop: true });

        this.coinEmitter = this.add.particles(0, 0, 'particle', {
            speed: { min: 200, max: 400 },
            angle: { min: -120, max: -60 },
            scale: { start: 0.8, end: 0 },
            lifespan: 800,
            blendMode: 'ADD',
            tint: 0xFFD700,
            emitting: false
        });
        this.coinEmitter.setDepth(300);

        this.uiContainer.add([ this.scoreText, this.coinsText, settingsBtn, this.trashBin, this.ordersContainer ]);

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

    createOrdersPanel() {
        const slotWidth = 160; 
        const slotHeight = 160;
        const gap = 20; 
        
        const totalWidth = (slotWidth * ORDERS_CONFIG.MAX_ACTIVE_ORDERS) + (gap * (ORDERS_CONFIG.MAX_ACTIVE_ORDERS - 1));
        const startX = (this.game.config.width - totalWidth) / 2 + (slotWidth / 2);
        const startY = 130; 

        this.ordersContainer = this.add.container(0, 0); 
        this.orderSlotsUI = [];

        const title = this.add.text(this.game.config.width / 2, startY - 25, localizationManager.getString('orders_panel_title'), 
            { fontSize: '20px', fill: '#aaaaaa', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
        this.ordersContainer.add(title);

        for (let i = 0; i < ORDERS_CONFIG.MAX_ACTIVE_ORDERS; i++) {
            const xPos = startX + (i * (slotWidth + gap));
            const yPos = startY + (slotHeight / 2);

            const slotContainer = this.add.container(xPos, yPos);
            
            const bg = this.add.graphics();
            this.drawOrderCardBackground(bg, slotWidth, slotHeight, false);

            const itemSprite = this.add.sprite(0, -20, 'egg').setDisplaySize(65, 65);
            
            const recipeContainer = this.add.container(0, 20);
            const ing1 = this.add.sprite(-20, 0, 'egg').setDisplaySize(25, 25);
            const plusSign = this.add.text(0, 0, '+', { fontSize: '18px', color: '#000' }).setOrigin(0.5);
            const ing2 = this.add.sprite(20, 0, 'tomato').setDisplaySize(25, 25);
            recipeContainer.add([ing1, plusSign, ing2]);
            recipeContainer.setVisible(false);

            const rewardContainer = this.add.container(0, 55);
            const rewardBg = this.add.graphics();
            rewardBg.fillStyle(0x000000, 0.2).fillRoundedRect(-40, -12, 80, 24, 12);
            const coinIcon = this.add.graphics().fillStyle(0xFFD700, 1).lineStyle(1, 0xDAA520, 1).fillCircle(-25, 0, 8);
            const rewardText = this.add.text(-10, 0, '0', { fontSize: '18px', fill: '#FFF', fontStyle: 'bold' }).setOrigin(0, 0.5);
            rewardContainer.add([rewardBg, coinIcon, rewardText]);
            
            const readyIcon = this.add.container(slotWidth/2 - 20, -slotHeight/2 + 20);
            const readyCircle = this.add.graphics().fillStyle(0x4CAF50, 1).lineStyle(2, 0xFFFFFF, 1).fillCircle(0, 0, 14).strokeCircle(0,0,14);
            const checkMark = this.add.text(0, 0, '✔', { fontSize: '18px', color: '#FFF', fontStyle: 'bold' }).setOrigin(0.5);
            readyIcon.add([readyCircle, checkMark]);
            readyIcon.setVisible(false);

            const timerText = this.add.text(0, 0, '', { fontSize: '24px', fill: '#555', fontStyle: 'bold' }).setOrigin(0.5);
            
            // ВАЖНО: Убрали setRectangleDropZone, оставили просто интерактивность для клика
            const hitArea = this.add.zone(0, 0, slotWidth, slotHeight).setInteractive();
            hitArea.isOrderSlot = true;
            hitArea.slotIndex = i;

            slotContainer.add([bg, itemSprite, recipeContainer, rewardContainer, readyIcon, timerText, hitArea]);
            this.ordersContainer.add(slotContainer);
            
            hitArea.on('pointerdown', () => { 
                if (this.orderSlotsUI[i].isReady && !this.isAnimatingOrder) {
                     this.handleFulfillOrder(i);
                } else {
                    this.tweens.add({ targets: slotContainer, x: xPos + 5, duration: 50, yoyo: true, repeat: 3 });
                }
            });

            this.orderSlotsUI.push({ 
                container: slotContainer, 
                bg, itemSprite, recipeContainer, ingredients: { ing1, ing2, plusSign }, 
                rewardContainer, rewardText, readyIcon, timerText, hitArea,
                isReady: false,
                currentOrderType: null,
                questionMark: null
            });
        }
    }

    drawOrderCardBackground(graphics, w, h, isReady) {
        graphics.clear();
        if (isReady) {
            graphics.fillStyle(0xE8F5E9, 1);
            graphics.lineStyle(4, 0x4CAF50, 1);
        } else {
            graphics.fillStyle(0xFFF8E7, 1);
            graphics.lineStyle(2, 0x8B4513, 0.3);
        }
        graphics.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
        graphics.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    }

    updateOrders() {
        if (this.isAnimatingOrder) return;
        dataManager.updateOrderCooldowns();
        const ordersState = dataManager.getOrdersState();
        if (!ordersState) return;

        this.orderSlotsUI.forEach((slotUI, index) => {
            const slotData = ordersState.orderSlots[index];
            const now = Date.now();
            const wasReady = slotUI.isReady;

            if (slotData.orderId) {
                const order = ordersState.activeOrders.find(o => o.id === slotData.orderId);
                if (order) {
                    slotUI.currentOrderType = order.itemType;
                    
                    const isUnlocked = dataManager.isUnlocked(order.itemType);
                    slotUI.itemSprite.setTexture(order.itemType).setVisible(true).setDisplaySize(65, 65);
                    
                    if (!isUnlocked) {
                        slotUI.itemSprite.setTint(0x000000); 
                        if (!slotUI.questionMark) {
                            slotUI.questionMark = this.add.text(0, -20, '?', { fontSize: '40px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
                            slotUI.container.add(slotUI.questionMark);
                        }
                        slotUI.questionMark.setVisible(true);
                    } else {
                        slotUI.itemSprite.clearTint();
                        if (slotUI.questionMark) slotUI.questionMark.setVisible(false);
                    }

                    const recipe = RECIPES.find(r => r.output === order.itemType);
                    if (recipe) {
                        slotUI.recipeContainer.setVisible(true);
                        slotUI.ingredients.ing1.setTexture(recipe.inputs[0]);
                        slotUI.ingredients.ing2.setTexture(recipe.inputs[1]);
                    } else {
                        slotUI.recipeContainer.setVisible(false);
                    }

                    slotUI.rewardText.setText(order.coinReward);
                    slotUI.rewardContainer.setVisible(true);
                    slotUI.timerText.setVisible(false);
                    // slotUI.hitArea.input.enabled = true; // НЕ БЛОКИРУЕМ ВВОД ТУТ, иначе Drag застрянет

                    const hasItem = this.gameScene.findItemOnGrid(order.itemType);
                    
                    if (hasItem && !wasReady) {
                        slotUI.isReady = true;
                        this.drawOrderCardBackground(slotUI.bg, 160, 160, true);
                        slotUI.readyIcon.setVisible(true);
                        this.tweens.add({ targets: slotUI.container, scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                    } else if (!hasItem && wasReady) {
                        slotUI.isReady = false;
                        this.drawOrderCardBackground(slotUI.bg, 160, 160, false);
                        slotUI.readyIcon.setVisible(false);
                        this.tweens.killTweensOf(slotUI.container);
                        slotUI.container.setScale(1);
                    }
                }
            } else if (now < slotData.cooldownUntil) {
                slotUI.currentOrderType = null;
                slotUI.isReady = false;
                const remaining = Math.ceil((slotData.cooldownUntil - now) / 1000);
                const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
                const seconds = (remaining % 60).toString().padStart(2, '0');
                slotUI.timerText.setText(`${minutes}:${seconds}`).setVisible(true);
                slotUI.itemSprite.setVisible(false);
                slotUI.recipeContainer.setVisible(false);
                slotUI.rewardContainer.setVisible(false);
                slotUI.readyIcon.setVisible(false);
                if(slotUI.questionMark) slotUI.questionMark.setVisible(false);
            } else {
                 slotUI.currentOrderType = null;
                 slotUI.isReady = false;
                 slotUI.timerText.setText('...').setVisible(true);
                 slotUI.itemSprite.setVisible(false);
                 slotUI.recipeContainer.setVisible(false);
                 slotUI.rewardContainer.setVisible(false);
                 slotUI.readyIcon.setVisible(false);
                 if(slotUI.questionMark) slotUI.questionMark.setVisible(false);
            }
        });
    }

    highlightMatchingOrders(itemType) {
        this.orderSlotsUI.forEach(slot => {
            if (slot.currentOrderType === itemType) {
                this.tweens.add({ targets: slot.container, scale: 1.15, duration: 200, ease: 'Back.out' });
            } else {
                slot.container.setAlpha(0.6);
            }
        });
    }

    resetHighlights() {
        this.orderSlotsUI.forEach(slot => {
            slot.container.setAlpha(1);
            if (slot.isReady) {
                this.tweens.killTweensOf(slot.container);
                this.tweens.add({ targets: slot.container, scale: 1.05, duration: 700, yoyo: true, repeat: -1 });
            } else {
                this.tweens.add({ targets: slot.container, scale: 1, duration: 200 });
            }
        });
    }

    // ИСПРАВЛЕННЫЙ МЕТОД: Проверка через глобальные границы контейнера
    checkOrderDrop(x, y, itemType) {
        for (let i = 0; i < this.orderSlotsUI.length; i++) {
            const slot = this.orderSlotsUI[i];
            if (slot.currentOrderType === itemType) {
                // Используем границы всего контейнера, а не внутренней зоны
                const bounds = slot.container.getBounds(); 
                // Расширяем зону (padding)
                const padding = 30;
                if (x >= bounds.x - padding && x <= bounds.x + bounds.width + padding &&
                    y >= bounds.y - padding && y <= bounds.y + bounds.height + padding) {
                    return i;
                }
            }
        }
        return -1;
    }

    checkOverlapWithTrash(x, y) {
        if (!this.trashBin) return false;
        // Используем глобальные границы
        const bounds = this.trashBin.getBounds();
        const padding = 40; 
        return (x >= bounds.x - padding && x <= bounds.x + bounds.width + padding &&
                y >= bounds.y - padding && y <= bounds.y + bounds.height + padding);
    }
    
    setTrashHighlight(isActive) {
        if (!this.trashBin) return;
        this.tweens.killTweensOf(this.trashBin);
        if (isActive) {
            this.tweens.add({ targets: this.trashBin, scale: 1.1, angle: { from: -5, to: 5 }, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            this.trashBin.setTint(0xffcccc);
        } else {
            this.trashBin.setScale(1.0);
            this.trashBin.setAngle(0);
            this.trashBin.clearTint();
            this.trashBin.setTint(0xFFaaaa);
        }
    }
    
    playTrashAnimation() {
        this.tweens.add({ targets: this.trashBin, scale: 1.2, duration: 100, yoyo: true, ease: 'Quad.easeOut' });
    }

    handleFulfillOrder(slotIndex) {
        if (this.isAnimatingOrder) return;
        const ordersState = dataManager.getOrdersState();
        const slotData = ordersState.orderSlots[slotIndex];
        const order = ordersState.activeOrders.find(o => o.id === slotData.orderId);
        if (!order) return;
        
        this.isAnimatingOrder = true;
        this.sound.play('click');
        const startPos = this.gameScene.getFulfillableItemPosition(order.itemType);
        if (!startPos) { this.isAnimatingOrder = false; return; }

        const slotUI = this.orderSlotsUI[slotIndex];
        const endPos = new Phaser.Math.Vector2();
        slotUI.itemSprite.getWorldTransformMatrix().transformPoint(0, 0, endPos);

        dataManager.fulfillOrder(order.id);
        this.gameScene.playItemFlyAnimation(order.itemType, startPos, endPos, () => {
            this.onFulfillAnimationComplete(endPos, order.coinReward);
        });
    }

    handleDragFulfill(slotIndex, itemSprite) {
        if (this.isAnimatingOrder) {
            itemSprite.destroy();
            return;
        }
        this.isAnimatingOrder = true;
        
        const ordersState = dataManager.getOrdersState();
        const slotData = ordersState.orderSlots[slotIndex];
        const order = ordersState.activeOrders.find(o => o.id === slotData.orderId);
        
        if (!order) {
            itemSprite.destroy();
            this.isAnimatingOrder = false;
            return;
        }

        dataManager.fulfillOrder(order.id);
        
        const slotUI = this.orderSlotsUI[slotIndex];
        const endPos = new Phaser.Math.Vector2();
        slotUI.itemSprite.getWorldTransformMatrix().transformPoint(0, 0, endPos);

        this.sound.play('unlock');
        const flash = this.add.circle(endPos.x, endPos.y, 50, 0xFFFFFF);
        this.tweens.add({ targets: flash, scale: 2, alpha: 0, duration: 300, onComplete: () => flash.destroy() });

        this.tweens.add({
            targets: itemSprite,
            x: endPos.x,
            y: endPos.y,
            scale: 0.5,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                itemSprite.destroy();
            }
        });

        this.onFulfillAnimationComplete(endPos, order.coinReward);
    }

    onFulfillAnimationComplete(position, reward) {
        this.coinEmitter.emitParticleAt(position.x, position.y, 10);
        this.tweens.add({ targets: this.coinsText, scale: 1.2, duration: 150, yoyo: true, ease: 'Quad.easeOut' });
        this.time.delayedCall(500, () => { this.isAnimatingOrder = false; });
    }

    updateScore(score) { if (this.scoreText && this.scoreText.active) this.scoreText.setText(localizationManager.getString('score') + ' ' + score); }
    updateCoins(coins) { if (this.coinsText && this.coinsText.active) this.coinsText.setText(localizationManager.getString('coins') + ' ' + coins); }
    applyMuteState() { this.sound.mute = dataManager.isMuted(); }

    showClearBoardPanel() {
        if (this.clearBoardPanel) return;
        this.clearBoardPanel = this.add.container(this.game.config.width / 2, this.game.config.height / 2);
        this.clearBoardPanel.setDepth(100);
        const overlay = this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0x000000, 0.7).setInteractive();
        overlay.on('pointerdown', () => {});
        const panelBG = this.add.graphics().fillStyle(0x333333, 1).lineStyle(2, 0xffffff, 1).fillRoundedRect(-250, -240, 500, 480, 16);
        const title = this.add.text(0, -190, localizationManager.getString('clear_board_title'), { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        const payBtn = this.add.image(0, -60, 'button').setScale(1.2).setInteractive();
        this.add.text(payBtn.x, payBtn.y, `${CLEAR_BOARD_COST}`, { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        
        payBtn.on('pointerdown', () => {
            if (dataManager.removeCoins(CLEAR_BOARD_COST)) {
                dataManager.save(true);
                this.updateCoins(dataManager.getCoins());
                this.gameScene.clearBoard();
                this.hideClearBoardPanel();
            } else {
                this.tweens.add({targets: payBtn, x: payBtn.x+5, duration: 50, yoyo:true, repeat:3});
            }
        });

        const adBtn = this.add.image(0, 60, 'button').setScale(1.2).setInteractive();
        const adBtnText = this.add.text(adBtn.x, adBtn.y, localizationManager.getString('clear_board_ad'), { fontSize: '28px', fill: '#000' }).setOrigin(0.5);
        adBtn.on('pointerdown', () => {
            adBtn.disableInteractive().setTint(0x888888);
            adBtnText.setText(localizationManager.getString('ui_loading'));
            adManager.showRewarded(this.gameScene, 'rewarded_clear_field', {
                onRewarded: () => { this.gameScene.clearBoard(); this.hideClearBoardPanel(); },
                onError: () => { adBtnText.setText('Error'); this.time.delayedCall(1000, ()=> adBtn.setInteractive().clearTint()); },
                onClose: () => { if(adBtn.active) { adBtn.setInteractive().clearTint(); adBtnText.setText(localizationManager.getString('clear_board_ad')); }}
            });
        });
        const backBtn = this.add.image(0, 180, 'button').setInteractive();
        this.add.text(backBtn.x, backBtn.y, localizationManager.getString('btn_back'), { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        backBtn.on('pointerdown', this.hideClearBoardPanel, this);
        this.clearBoardPanel.add([overlay, panelBG, title, payBtn, adBtn, adBtnText, backBtn]);
    }
    hideClearBoardPanel() { if (this.clearBoardPanel) { this.clearBoardPanel.destroy(); this.clearBoardPanel = null; } }
}