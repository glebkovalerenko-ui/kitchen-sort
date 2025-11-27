// /src/scenes/UIScene.js
import Phaser from 'phaser';
import { dataManager } from '../DataManager.js';
import { adManager } from '../AdManager.js';
import { CLEAR_BOARD_COST } from '../GameConfig.js';
import { localizationManager } from '../LocalizationManager.js';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        this.uiContainer = this.add.container(); 

        const gameScene = this.scene.get('GameScene'); 
        const textStyle = { fontSize: '32px', fill: '#ffffff', stroke: '#000000', strokeThickness: 5 };

        // --- HUD Элементы ---
        this.scoreText = this.add.text(40, 40, '', textStyle);
        this.coinsText = this.add.text(40, 80, '', textStyle);
        
        // Подписка на события GameScene
        gameScene.events.on('updateScore', this.updateScore, this);
        gameScene.events.on('updateCoins', this.updateCoins, this);
        
        // Первичная отрисовка
        this.updateScore(gameScene.score);
        this.updateCoins(dataManager.getCoins());
        
        const padding = 20;
        
        // --- Кнопка Коллекции ---
        const collectionBtn = this.add.image(this.game.config.width - padding, 70, 'button').setOrigin(1, 0.5).setInteractive();
        const collectionBtnText = this.add.text(collectionBtn.getCenter().x, collectionBtn.getCenter().y, localizationManager.getString('btn_collection'), { fontSize: '28px', fill: '#000'}).setOrigin(0.5);
        
        collectionBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.scene.pause('GameScene');
            this.scene.launch('CollectionScene');
        });

        // --- Кнопка Магазина ---
        const upgradeBtn = this.add.image(collectionBtn.getLeftCenter().x - padding, 70, 'button').setOrigin(1, 0.5).setInteractive();
        const upgradeBtnText = this.add.text(upgradeBtn.getCenter().x, upgradeBtn.getCenter().y, localizationManager.getString('btn_upgrades'), { fontSize: '28px', fill: '#000'}).setOrigin(0.5);
        
        upgradeBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.scene.pause('GameScene');
            this.scene.launch('UpgradeScene');
        });
        
        // --- Кнопка "Очистить поле" (внизу) ---
        const clearBtn = this.add.image(this.game.config.width / 2, this.game.config.height - 70, 'button').setOrigin(0.5).setInteractive();
        const clearBtnText = this.add.text(clearBtn.x, clearBtn.y, localizationManager.getString('btn_clear'), { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        
        clearBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.showClearBoardPanel();
        });

        // --- Кнопка Звука ---
        this.muteBtn = this.add.text(60, this.game.config.height - 60, '🔊', { fontSize: '50px' }).setOrigin(0.5).setInteractive();
        this.muteBtn.on('pointerdown', this.toggleMute, this);
        
        this.applyMuteState();
        this.clearBoardPanel = null;

        // Добавляем все в контейнер для удобного скрытия/показа
        this.uiContainer.add([
            this.scoreText, 
            this.coinsText, 
            collectionBtn, 
            collectionBtnText, 
            upgradeBtn, 
            upgradeBtnText, 
            clearBtn, 
            clearBtnText, 
            this.muteBtn
        ]);

        // Управление видимостью UI
        const gameEvents = this.scene.get('GameScene').events;
        gameEvents.on('hideUI', () => this.uiContainer.setVisible(false), this);
        gameEvents.on('showUI', () => this.uiContainer.setVisible(true), this);

        this.events.on('shutdown', () => {
            gameEvents.off('updateScore', this.updateScore, this);
            gameEvents.off('updateCoins', this.updateCoins, this);
            gameEvents.off('hideUI');
            gameEvents.off('showUI');
        });
    }

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
    
    // --- ПАНЕЛЬ ОЧИСТКИ ПОЛЯ ---
    showClearBoardPanel() {
        if (this.clearBoardPanel) return;

        const gameScene = this.scene.get('GameScene');
        this.clearBoardPanel = this.add.container(this.game.config.width / 2, this.game.config.height / 2);
        this.clearBoardPanel.setDepth(100); // Высокий Depth, чтобы быть поверх всего

        // 1. Оверлей (Фон-затемнение)
        // ВАЖНО: setInteractive() блокирует клики сквозь него.
        const overlay = this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0x000000, 0.7)
            .setInteractive();
        
        // Добавляем пустой обработчик, чтобы Phaser точно перехватил клик
        overlay.on('pointerdown', () => { /* Absorbs click */ });
        
        const panelHeight = 480;
        const panelBG = this.add.graphics().fillStyle(0x333333, 1).lineStyle(2, 0xffffff, 1).fillRoundedRect(-250, -panelHeight / 2, 500, panelHeight, 16);
        
        const title = this.add.text(0, -panelHeight / 2 + 50, localizationManager.getString('clear_board_title'), { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        
        // 2. Кнопка "За монеты"
        const payBtn = this.add.image(0, -60, 'button').setScale(1.2).setInteractive();
        const payBtnText = this.add.text(payBtn.x, payBtn.y, `${CLEAR_BOARD_COST}`, { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        
        if (dataManager.getCoins() < CLEAR_BOARD_COST) {
            payBtn.setTint(0x888888).disableInteractive();
        } else {
            payBtn.on('pointerdown', () => {
                this.sound.play('click');
                if (dataManager.removeCoins(CLEAR_BOARD_COST)) {
                    dataManager.save(true);
                    this.updateCoins(dataManager.getCoins());
                    gameScene.clearBoard();
                    this.hideClearBoardPanel();
                }
            });
        }
        
        // 3. Кнопка "За рекламу"
        const adBtn = this.add.image(0, 60, 'button').setScale(1.2).setInteractive();
        const adBtnText = this.add.text(adBtn.x, adBtn.y, localizationManager.getString('clear_board_ad'), { fontSize: '28px', fill: '#000' }).setOrigin(0.5);
        
        adBtn.on('pointerdown', () => {
            this.sound.play('click');
            
            // Блокируем кнопку
            adBtn.disableInteractive().setTint(0x888888);
            adBtnText.setText(localizationManager.getString('ui_loading'));

            adManager.showRewarded(gameScene, 'rewarded_clear_field', {
                onRewarded: () => {
                    gameScene.clearBoard();
                    this.hideClearBoardPanel();
                },
                onError: () => { 
                    adBtnText.setText(localizationManager.getString('btn_ad_error'));
                    
                    // Восстанавливаем кнопку через 1.5 сек
                    this.time.delayedCall(1500, () => {
                        if (this.clearBoardPanel && adBtn.active) {
                            adBtn.setInteractive().clearTint();
                            adBtnText.setText(localizationManager.getString('clear_board_ad'));
                        }
                    });
                },
                onClose: () => {
                    // Если закрыли (и не было награды/ошибки, или даже если была ошибка, но таймер еще идет)
                    // Для простоты: восстанавливаем кнопку, если панель еще открыта
                    if (this.clearBoardPanel && adBtn.active) {
                        adBtn.setInteractive().clearTint();
                        adBtnText.setText(localizationManager.getString('clear_board_ad'));
                    }
                }
            });
        });

        // 4. Кнопка "Назад" (Закрыть)
        const backBtn = this.add.image(0, panelHeight / 2 - 60, 'button').setInteractive();
        const backBtnText = this.add.text(backBtn.x, backBtn.y, localizationManager.getString('btn_back'), { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        
        backBtn.on('pointerdown', this.hideClearBoardPanel, this);
        
        // Добавляем элементы в контейнер
        // ВАЖНО: overlay добавляем первым, чтобы он был "позади" кнопок внутри контейнера, но перекрывал сцену
        this.clearBoardPanel.add([overlay, panelBG, title, payBtn, payBtnText, adBtn, adBtnText, backBtn, backBtnText]);
    }

    hideClearBoardPanel() {
        if (this.clearBoardPanel) {
            this.sound.play('click');
            this.clearBoardPanel.destroy();
            this.clearBoardPanel = null;
        }
    }
}