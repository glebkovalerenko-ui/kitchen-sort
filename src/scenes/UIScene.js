// /src/scenes/UIScene.js
import Phaser from 'phaser';
import { dataManager } from '../DataManager.js';
import { adManager } from '../AdManager.js';
import { CLEAR_BOARD_COST } from '../GameConfig.js';
import { localizationManager } from '../LocalizationManager.js';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene'); // <-- УБРАЛИ active: true
    }

    create() {
        const gameScene = this.scene.get('GameScene'); 
        const textStyle = { fontSize: '32px', fill: '#ffffff', stroke: '#000000', strokeThickness: 5 };

        this.scoreText = this.add.text(40, 40, '', textStyle);
        this.coinsText = this.add.text(40, 80, '', textStyle);
        
        // Подписываемся на события GameScene
        gameScene.events.on('updateScore', this.updateScore, this);
        gameScene.events.on('updateCoins', this.updateCoins, this);
        
        // Обновляем UI начальными значениями
        this.updateScore(gameScene.score);
        this.updateCoins(dataManager.getCoins());
        
        const padding = 20;
        
        const collectionBtn = this.add.image(this.game.config.width - padding, 70, 'button').setOrigin(1, 0.5).setInteractive();
        this.add.text(collectionBtn.getCenter().x, collectionBtn.getCenter().y, localizationManager.getString('btn_collection'), { fontSize: '28px', fill: '#000'}).setOrigin(0.5);
        collectionBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.scene.pause('GameScene');
            this.scene.launch('CollectionScene');
        });

        const upgradeBtn = this.add.image(collectionBtn.getLeftCenter().x - padding, 70, 'button').setOrigin(1, 0.5).setInteractive();
        this.add.text(upgradeBtn.getCenter().x, upgradeBtn.getCenter().y, localizationManager.getString('btn_upgrades'), { fontSize: '28px', fill: '#000'}).setOrigin(0.5);
        upgradeBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.scene.pause('GameScene');
            this.scene.launch('UpgradeScene');
        });
        
        const clearBtn = this.add.image(this.game.config.width / 2, this.game.config.height - 70, 'button').setOrigin(0.5).setInteractive();
        this.add.text(clearBtn.x, clearBtn.y, localizationManager.getString('btn_clear'), { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        clearBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.showClearBoardPanel();
        });

        this.muteBtn = this.add.text(60, this.game.config.height - 60, '🔊', { fontSize: '50px' }).setOrigin(0.5).setInteractive();
        this.muteBtn.on('pointerdown', this.toggleMute, this);
        
        this.applyMuteState();
        this.clearBoardPanel = null;
    }

    updateScore(score) {
        if (this.scoreText) { this.scoreText.setText(localizationManager.getString('score') + ' ' + score); }
    }

    updateCoins(coins) {
        if (this.coinsText) { this.coinsText.setText(localizationManager.getString('coins') + ' ' + coins); }
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
        const panelHeight = 380;
        const panelBG = this.add.graphics().fillStyle(0x333333, 1).lineStyle(2, 0xffffff, 1).fillRoundedRect(-250, -panelHeight / 2, 500, panelHeight, 16);
        const title = this.add.text(0, -130, localizationManager.getString('clear_board_title'), { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        
        const payBtn = this.add.image(0, -20, 'button').setScale(1.2).setInteractive();
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
        
        const adBtn = this.add.image(0, payBtn.y + 110, 'button').setScale(1.2).setInteractive();
        const adBtnText = this.add.text(adBtn.x, adBtn.y, localizationManager.getString('clear_board_ad'), { fontSize: '28px', fill: '#000' }).setOrigin(0.5);
        
        adBtn.on('pointerdown', () => {
            this.sound.play('click');
            adBtn.disableInteractive().setTint(0x888888);
            adBtnText.setText(localizationManager.getString('ui_loading'));

            adManager.showRewarded(gameScene, 'rewarded_clear_field', {
                onRewarded: () => {
                    gameScene.clearBoard();
                    this.hideClearBoardPanel();
                },
                onError: () => { adBtnText.setText(localizationManager.getString('btn_ad_error')); },
                onClose: () => {
                    if (adBtn.active && this.clearBoardPanel) {
                        adBtn.setInteractive().clearTint();
                        adBtnText.setText(localizationManager.getString('clear_board_ad'));
                    }
                }
            });
        });

        const closeBtn = this.add.text(230, -panelHeight / 2 + 20, 'X', { fontSize: '40px', fill: '#ff0000' }).setOrigin(0.5).setInteractive();
        closeBtn.on('pointerdown', this.hideClearBoardPanel, this);
        
        this.clearBoardPanel.add([overlay, panelBG, title, payBtn, payBtnText, adBtn, adBtnText, closeBtn]);
    }

    hideClearBoardPanel() {
        if (this.clearBoardPanel) {
            this.sound.play('click');
            this.clearBoardPanel.destroy();
            this.clearBoardPanel = null;
        }
    }
}