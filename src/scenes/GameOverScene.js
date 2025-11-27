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
    }

    async create() {
        analyticsManager.trackGameEnd(this.finalScore, this.sessionDuration, this.coinsEarned);

        this.add.text(this.game.config.width / 2, 150, localizationManager.getString('game_over_title'), { fontSize: '58px', fill: '#ff0000' }).setOrigin(0.5);
        this.add.text(this.game.config.width / 2, 230, localizationManager.getString('final_score') + ' ' + this.finalScore, { fontSize: '48px', fill: '#ffffff' }).setOrigin(0.5);
        this.add.text(this.game.config.width / 2, 280, localizationManager.getString('coins_earned', { coins: this.coinsEarned }), { fontSize: '32px', fill: '#ffff00' }).setOrigin(0.5);

        // --- Логика Лидерборда (Авто-отправка) ---
        // Абсолютно безопасная проверка
        if (window.ysdk && window.ysdk.features && window.ysdk.features.Leaderboards) {
            try {
                // Проверяем доступность записи очков (не открываем окно, просто пишем счет)
                // Даже если isFeatureAvailable не существует, этот блок просто пропустится, а не крашнется
                const lb = await window.ysdk.getLeaderboards();
                await lb.setLeaderboardScore('mainLeaderboard', this.finalScore);
                console.log('Score submitted to leaderboard');
            } catch (err) {
                console.warn('Leaderboard submission skipped:', err);
            }
        }

        adManager.showInterstitial(this);

        const doubleInfoText = this.add.text(this.game.config.width / 2, 330, localizationManager.getString('double_reward_info', { coins: this.coinsEarned }), { fontSize: '28px', fill: '#90ee90' }).setOrigin(0.5);
        const doubleCoinsBtn = this.add.image(this.game.config.width / 2, 430, 'button').setScale(1.2).setInteractive();
        const doubleCoinsText = this.add.text(doubleCoinsBtn.x, doubleCoinsBtn.y, localizationManager.getString('btn_double_reward_ad'), { fontSize: '28px', fill: '#000' }).setOrigin(0.5);
        
        let isDoubleRewardReceived = false;

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
                    isDoubleRewardReceived = true;
                    dataManager.addCoins(this.coinsEarned);
                    dataManager.save(true);
                    
                    const uiScene = this.scene.get('UIScene');
                    if (uiScene) { uiScene.updateCoins(dataManager.getCoins()); }
                    
                    doubleCoinsText.setText(localizationManager.getString('btn_reward_received'));
                    doubleInfoText.setText(localizationManager.getString('reward_received_info', {coins: this.coinsEarned}));
                },
                onError: () => { 
                    doubleCoinsText.setText(localizationManager.getString('btn_ad_error'));
                    this.time.delayedCall(1500, () => {
                        if (doubleCoinsBtn.active && !isDoubleRewardReceived) {
                            doubleCoinsBtn.setInteractive().clearTint();
                            doubleCoinsText.setText(localizationManager.getString('btn_double_reward_ad'));
                        }
                    });
                },
                onClose: () => {
                    if (!isDoubleRewardReceived && doubleCoinsBtn.active) {
                         doubleCoinsBtn.setInteractive().clearTint();
                         doubleCoinsText.setText(localizationManager.getString('btn_double_reward_ad'));
                    }
                }
            });
        });
        
        const restartBtn = this.add.image(this.game.config.width / 2, 550, 'button').setOrigin(0.5).setInteractive();
        this.add.text(restartBtn.x, restartBtn.y, localizationManager.getString('btn_restart'), { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        restartBtn.on('pointerdown', () => { 
            this.sound.play('click');
            this.scene.get('GameScene').events.emit('showUI');
            this.scene.start('GameScene');
        });

        const continueRewardDescStyle = { fontSize: '22px', fill: '#90ee90', align: 'center', wordWrap: { width: 700 } };
        const continueRewardDesc = this.add.text(this.game.config.width / 2, 640, localizationManager.getString('continue_reward_desc'), continueRewardDescStyle).setOrigin(0.5);
        
        const continueBtn = this.add.image(this.game.config.width / 2, 730, 'button').setOrigin(0.5).setScale(1.2).setInteractive();
        const continueText = this.add.text(continueBtn.x, continueBtn.y, localizationManager.getString('btn_continue_ad_short'), { fontSize: '28px', fill: '#000' }).setOrigin(0.5);
        
        continueBtn.on('pointerdown', () => {
            this.sound.play('click');
            continueBtn.disableInteractive().setTint(0x888888);
            continueText.setText(localizationManager.getString('ui_loading'));

            adManager.showRewarded(this, 'rewarded_continue', {
                onRewarded: () => { 
                    this.scene.get('GameScene').events.emit('showUI');
                    this.scene.start('GameScene', { continueGame: true, gridState: this.gridState, score: this.finalScore }); 
                },
                onError: () => {
                    continueText.setText(localizationManager.getString('btn_ad_error'));
                    this.time.delayedCall(1500, () => {
                        if (continueBtn.active) {
                            continueBtn.setInteractive().clearTint();
                            continueText.setText(localizationManager.getString('btn_continue_ad_short'));
                        }
                    });
                },
                onClose: () => {
                    if (continueBtn.active) {
                        continueBtn.setInteractive().clearTint();
                        continueText.setText(localizationManager.getString('btn_continue_ad_short'));
                    }
                }
            });
        });
        
        // --- Кнопка Лидерборда (Показать таблицу) ---
        // Показываем кнопку только если мы уверены, что SDK загружен
        if (window.ysdk) {
             const lbBtn = this.add.image(this.game.config.width - 80, 80, 'button').setInteractive();
             this.add.text(lbBtn.x, lbBtn.y, localizationManager.getString('leaderboard_tooltip'), { fontSize: '48px', fill: '#000' }).setOrigin(0.5);
             
             lbBtn.on('pointerdown', async () => {
                this.sound.play('click');
                
                // --- КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ БАГА ---
                // Мы проверяем каждый шаг вручную, без optional chaining (?.), чтобы избежать TypeError
                
                let canOpen = false;
                if (window.ysdk && window.ysdk.features && window.ysdk.features.Leaderboards) {
                    if (window.ysdk.features.Leaderboards.isFeatureAvailable) {
                        canOpen = true;
                    }
                }

                if (canOpen) {
                    try {
                        const lb = await window.ysdk.getLeaderboards();
                        // Это вызывает нативное окно Яндекса
                        lb.openLeaderboard('mainLeaderboard'); 
                    } catch (err) {
                        console.error('Failed to open leaderboard:', err);
                    }
                } else {
                    console.warn('Leaderboards feature is missing in SDK object. SDK may be outdated in cache.');
                    // Можно показать алерт для отладки, если хотите:
                    // alert('Leaderboard feature not loaded yet. Try refreshing.');
                }
             });
        }
    }
}