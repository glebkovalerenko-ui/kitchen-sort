// /src/scenes/UIScene.js
import Phaser from 'phaser';
import { dataManager } from '../DataManager.js';
import { adManager } from '../AdManager.js';
import { CLEAR_BOARD_COST } from '../gameConfig.js';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        const gameScene = this.scene.get('GameScene');
        const textStyle = { fontSize: '32px', fill: '#ffffff', stroke: '#000000', strokeThickness: 5 };

        this.scoreText = this.add.text(40, 40, 'Очки: ' + gameScene.score, textStyle);
        gameScene.events.on('updateScore', (score) => { this.scoreText.setText('Очки: ' + score); }, this);
        this.coinsText = this.add.text(40, 80, 'Монеты: ' + dataManager.getCoins(), textStyle);
        gameScene.events.on('updateCoins', (coins) => { this.coinsText.setText('Монеты: ' + coins); }, this);
        
        // --- НАДЕЖНОЕ РАСПОЛОЖЕНИЕ КНОПОК ---
        const padding = 20;
        
        // 1. Создаем правую кнопку (Книга)
        const collectionBtn = this.add.image(this.game.config.width - padding, 70, 'button').setOrigin(1, 0.5).setInteractive();
        this.add.text(collectionBtn.getCenter().x, collectionBtn.getCenter().y, 'Книга', { fontSize: '28px', fill: '#000'}).setOrigin(0.5);
        collectionBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.scene.pause('GameScene');
            this.scene.launch('CollectionScene');
        });

        // 2. Создаем левую кнопку (Магазин) ОТНОСИТЕЛЬНО правой
        const upgradeBtn = this.add.image(collectionBtn.getLeftCenter().x - padding, 70, 'button').setOrigin(1, 0.5).setInteractive();
        this.add.text(upgradeBtn.getCenter().x, upgradeBtn.getCenter().y, 'Магазин', { fontSize: '28px', fill: '#000'}).setOrigin(0.5);
        upgradeBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.scene.pause('GameScene');
            this.scene.launch('UpgradeScene');
        });
        
        const clearBtn = this.add.image(this.game.config.width / 2, this.game.config.height - 70, 'button').setOrigin(0.5).setInteractive();
        this.add.text(clearBtn.x, clearBtn.y, 'Очистить', { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        clearBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.showClearBoardPanel();
        });

        this.muteBtn = this.add.text(60, this.game.config.height - 60, '🔊', { fontSize: '50px' }).setOrigin(0.5).setInteractive();
        this.muteBtn.on('pointerdown', this.toggleMute, this);
        
        this.applyMuteState();
        this.clearBoardPanel = null;
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
    
    showClearBoardPanel() {
        if (this.clearBoardPanel) return;

        const gameScene = this.scene.get('GameScene');
        this.clearBoardPanel = this.add.container(this.game.config.width / 2, this.game.config.height / 2);
        this.clearBoardPanel.setDepth(10);

        const overlay = this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0x000000, 0.7).setInteractive();
        this.clearBoardPanel.add(overlay);

        const panelHeight = 380; // Увеличили высоту
        const panelBG = this.add.graphics();
        panelBG.fillStyle(0x333333, 1);
        panelBG.lineStyle(2, 0xffffff, 1);
        panelBG.fillRoundedRect(-250, -panelHeight / 2, 500, panelHeight, 16);
        this.clearBoardPanel.add(panelBG);
        
        this.clearBoardPanel.add(this.add.text(0, -130, 'Очистить поле?', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5));
        
        // --- КНОПКИ С УВЕЛИЧЕННЫМ РАССТОЯНИЕМ ---
        const spacing = 110;
        
        const payBtn = this.add.image(0, -20, 'button').setScale(1.2).setInteractive();
        const payBtnText = this.add.text(payBtn.x, payBtn.y, `${CLEAR_BOARD_COST}`, { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        this.clearBoardPanel.add([payBtn, payBtnText]);

        if (dataManager.getCoins() < CLEAR_BOARD_COST) {
            payBtn.setTint(0x888888).disableInteractive();
        } else {
            payBtn.on('pointerdown', () => {
                this.sound.play('click');
                if (dataManager.removeCoins(CLEAR_BOARD_COST)) {
                    dataManager.save(true);
                    gameScene.events.emit('updateCoins', dataManager.getCoins());
                    gameScene.clearBoard();
                    this.hideClearBoardPanel();
                }
            });
        }
        
        const adBtn = this.add.image(0, payBtn.y + spacing, 'button').setScale(1.2).setInteractive();
        const adBtnText = this.add.text(adBtn.x, adBtn.y, 'Бесплатно (Ad)', { fontSize: '28px', fill: '#000' }).setOrigin(0.5);
        this.clearBoardPanel.add([adBtn, adBtnText]);
        
        adBtn.on('pointerdown', () => {
            this.sound.play('click');
            adManager.showRewarded(gameScene, 'rewarded_clear_field', {
                onRewarded: () => {
                    gameScene.clearBoard();
                    this.hideClearBoardPanel();
                },
                onError: () => {
                    adBtnText.setText('Ошибка');
                    adBtn.disableInteractive().setTint(0x888888);
                }
            });
        });

        const closeBtn = this.add.text(230, -panelHeight / 2 + 20, 'X', { fontSize: '40px', fill: '#ff0000' }).setOrigin(0.5).setInteractive();
        closeBtn.on('pointerdown', this.hideClearBoardPanel, this);
        this.clearBoardPanel.add(closeBtn);
    }

    hideClearBoardPanel() {
        if (this.clearBoardPanel) {
            this.sound.play('click');
            this.clearBoardPanel.destroy();
            this.clearBoardPanel = null;
        }
    }
}