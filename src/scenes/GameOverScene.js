// /src/scenes/GameOverScene.js
import Phaser from 'phaser';
import { adManager } from '../AdManager.js';
import { analyticsManager } from '../AnalyticsManager.js';
import { dataManager } from '../DataManager.js';
import { localizationManager } from '../LocalizationManager.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOverScene'); }
    
    init(data) {
        this.finalScore = data.score;
        this.gridState = data.gridState;
        this.sessionDuration = data.sessionDuration;
        this.coinsEarned = data.coinsEarned;
        this.ysdk = null;
    }

    async create() {
        analyticsManager.trackGameEnd(this.finalScore, this.sessionDuration, this.coinsEarned);

        this.add.text(this.game.config.width / 2, 150, localizationManager.getString('game_over_title'), { fontSize: '58px', fill: '#ff0000' }).setOrigin(0.5);
        this.add.text(this.game.config.width / 2, 230, localizationManager.getString('final_score') + ' ' + this.finalScore, { fontSize: '48px', fill: '#ffffff' }).setOrigin(0.5);
        this.add.text(this.game.config.width / 2, 280, localizationManager.getString('coins_earned', { coins: this.coinsEarned }), { fontSize: '32px', fill: '#ffff00' }).setOrigin(0.5);

        try {
            this.ysdk = await YaGames.init();
            if (this.ysdk.features?.Leaderboards?.isFeatureAvailable) {
                const lb = await this.ysdk.getLeaderboards();
                await lb.setLeaderboardScore('mainLeaderboard', this.finalScore);
            }
        } catch (err) {
            console.error('Leaderboard error:', err);
        }

        this.time.delayedCall(500, () => adManager.showInterstitial(this));

        const doubleInfoText = this.add.text(this.game.config.width / 2, 330, localizationManager.getString('double_reward_info', { coins: this.coinsEarned }), { fontSize: '28px', fill: '#90ee90' }).setOrigin(0.5);
        const doubleCoinsBtn = this.add.image(this.game.config.width / 2, 430, 'button').setScale(1.2).setInteractive();
        const doubleCoinsText = this.add.text(doubleCoinsBtn.x, doubleCoinsBtn.y, localizationManager.getString('btn_double_reward_ad'), { fontSize: '28px', fill: '#000' }).setOrigin(0.5);
        
        if (this.coinsEarned <= 0) {
            doubleCoinsBtn.disableInteractive().setTint(0x888888);
            doubleInfoText.setVisible(false);
        }
        doubleCoinsBtn.on('pointerdown', () => {
            this.sound.play('click');
            doubleCoinsBtn.disableInteractive().setTint(0x888888);
            doubleCoinsText.setText(localizationManager.getString('ui_loading'));

            adManager.showRewarded(this, 'rewarded_double_coins', {
                onRewarded: () => {
                    dataManager.addCoins(this.coinsEarned);
                    dataManager.save(true);
                    this.scene.get('UIScene').updateCoins(dataManager.getCoins());
                    doubleCoinsText.setText(localizationManager.getString('btn_reward_received'));
                    doubleInfoText.setText(localizationManager.getString('reward_received_info', {coins: this.coinsEarned}));
                },
                onError: () => { doubleCoinsText.setText(localizationManager.getString('btn_ad_error')); }
            });
        });
        
        const restartBtn = this.add.image(this.game.config.width / 2, 550, 'button').setOrigin(0.5).setInteractive();
        this.add.text(restartBtn.x, restartBtn.y, localizationManager.getString('btn_restart'), { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        restartBtn.on('pointerdown', () => { 
            this.sound.play('click');
            this.scene.get('GameScene').events.emit('showUI'); // <-- КЛЮЧЕВОЕ ИЗМЕНЕНИЕ
            this.scene.start('GameScene');
        });

        // --- ИСПРАВЛЕНИЕ ВЕРСТКИ КНОПКИ "ПРОДОЛЖИТЬ" ---
        const continueRewardDesc = this.add.text(this.game.config.width / 2, 630, localizationManager.getString('continue_reward_desc'), { fontSize: '22px', fill: '#90ee90', align: 'center' }).setOrigin(0.5);
        const continueBtn = this.add.image(this.game.config.width / 2, 680, 'button').setOrigin(0.5).setInteractive();
        // Используем более короткий ключ для кнопки
        const continueText = this.add.text(continueBtn.x, continueBtn.y, localizationManager.getString('btn_continue_ad_reward').replace(' (+3 заряда)', ''), { fontSize: '28px', fill: '#000' }).setOrigin(0.5);
        
        continueBtn.on('pointerdown', () => {
            this.sound.play('click');
            continueBtn.disableInteractive().setTint(0x888888);
            continueText.setText(localizationManager.getString('ui_loading'));

            adManager.showRewarded(this, 'rewarded_continue', {
                onRewarded: () => { 
                    this.scene.get('GameScene').events.emit('showUI'); // <-- КЛЮЧЕВОЕ ИЗМЕНЕНИЕ
                    this.scene.start('GameScene', { continueGame: true, gridState: this.gridState, score: this.finalScore }); 
                },
                onError: () => {
                    continueText.setText(localizationManager.getString('btn_ad_error'));
                },
                onClose: () => {
                    if (continueBtn.active) {
                        continueBtn.setInteractive().clearTint();
                        continueText.setText(localizationManager.getString('btn_continue_ad_reward').replace(' (+3 заряда)', ''));
                    }
                }
            });
        });
        
        if (this.ysdk && this.ysdk.features?.Leaderboards?.isFeatureAvailable) {
             const lbBtn = this.add.image(this.game.config.width - 80, 80, 'button').setInteractive();
             this.add.text(lbBtn.x, lbBtn.y, localizationManager.getString('leaderboard_tooltip'), { fontSize: '48px', fill: '#000' }).setOrigin(0.5);
             lbBtn.on('pointerdown', () => {
                this.sound.play('click');
                this.ysdk.getLeaderboards().then(lb => {
                    lb.openLeaderboard('mainLeaderboard');
                });
             });
        }
    }
}