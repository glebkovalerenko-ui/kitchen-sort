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
        // Отправляем аналитику
        analyticsManager.trackGameEnd(this.finalScore, this.sessionDuration, this.coinsEarned);

        // --- UI Элементы ---
        this.add.text(this.game.config.width / 2, 150, localizationManager.getString('game_over_title'), { fontSize: '58px', fill: '#ff0000' }).setOrigin(0.5);
        this.add.text(this.game.config.width / 2, 230, localizationManager.getString('final_score') + ' ' + this.finalScore, { fontSize: '48px', fill: '#ffffff' }).setOrigin(0.5);
        this.add.text(this.game.config.width / 2, 280, localizationManager.getString('coins_earned', { coins: this.coinsEarned }), { fontSize: '32px', fill: '#ffff00' }).setOrigin(0.5);

        // --- Логика Лидерборда (Safe Mode) ---
        // Пытаемся записать рекорд, только если SDK доступен
        if (typeof YaGames !== 'undefined') {
            try {
                // Используем уже инициализированный SDK, если возможно, или получаем его снова
                const ysdk = await YaGames.init(); 
                if (ysdk && ysdk.features && ysdk.features.Leaderboards && ysdk.features.Leaderboards.isFeatureAvailable) {
                    const lb = await ysdk.getLeaderboards();
                    // 'mainLeaderboard' - имя должно совпадать с консолью разработчика
                    await lb.setLeaderboardScore('mainLeaderboard', this.finalScore);
                    console.log('Score submitted to leaderboard');
                }
            } catch (err) {
                console.warn('Leaderboard submission skipped (Offline or Error):', err);
            }
        }

        // --- Interstitial (Межстраничная реклама) ---
        // AdManager сам проверит кулдауны и настройки
        adManager.showInterstitial(this);

        // --- Кнопка Удвоения Монет ---
        const doubleInfoText = this.add.text(this.game.config.width / 2, 330, localizationManager.getString('double_reward_info', { coins: this.coinsEarned }), { fontSize: '28px', fill: '#90ee90' }).setOrigin(0.5);
        const doubleCoinsBtn = this.add.image(this.game.config.width / 2, 430, 'button').setScale(1.2).setInteractive();
        const doubleCoinsText = this.add.text(doubleCoinsBtn.x, doubleCoinsBtn.y, localizationManager.getString('btn_double_reward_ad'), { fontSize: '28px', fill: '#000' }).setOrigin(0.5);
        
        // Флаг, чтобы понимать, получили ли мы уже награду
        let isDoubleRewardReceived = false;

        if (this.coinsEarned <= 0) {
            doubleCoinsBtn.disableInteractive().setTint(0x888888);
            doubleInfoText.setVisible(false);
        }

        doubleCoinsBtn.on('pointerdown', () => {
            this.sound.play('click');
            
            // Блокируем кнопку на время показа
            doubleCoinsBtn.disableInteractive().setTint(0x888888);
            doubleCoinsText.setText(localizationManager.getString('ui_loading'));

            adManager.showRewarded(this, 'rewarded_double_coins', {
                onRewarded: () => {
                    isDoubleRewardReceived = true;
                    dataManager.addCoins(this.coinsEarned);
                    dataManager.save(true);
                    
                    // Обновляем UI сцены UI (если она активна/существует)
                    const uiScene = this.scene.get('UIScene');
                    if (uiScene) {
                        uiScene.updateCoins(dataManager.getCoins());
                    }
                    
                    doubleCoinsText.setText(localizationManager.getString('btn_reward_received'));
                    doubleInfoText.setText(localizationManager.getString('reward_received_info', {coins: this.coinsEarned}));
                    
                    // Кнопка остается выключенной, так как награда получена
                },
                onError: () => { 
                    doubleCoinsText.setText(localizationManager.getString('btn_ad_error'));
                    // Восстанавливаем кнопку через таймер
                    this.time.delayedCall(1500, () => {
                        if (doubleCoinsBtn.active && !isDoubleRewardReceived) {
                            doubleCoinsBtn.setInteractive().clearTint();
                            doubleCoinsText.setText(localizationManager.getString('btn_double_reward_ad'));
                        }
                    });
                },
                onClose: () => {
                    // Если рекламу закрыли, но награду не получили (и не было ошибки) - восстанавливаем кнопку
                    if (!isDoubleRewardReceived && doubleCoinsBtn.active) {
                         doubleCoinsBtn.setInteractive().clearTint();
                         doubleCoinsText.setText(localizationManager.getString('btn_double_reward_ad'));
                    }
                }
            });
        });
        
        // --- Кнопка Рестарт ---
        const restartBtn = this.add.image(this.game.config.width / 2, 550, 'button').setOrigin(0.5).setInteractive();
        this.add.text(restartBtn.x, restartBtn.y, localizationManager.getString('btn_restart'), { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        restartBtn.on('pointerdown', () => { 
            this.sound.play('click');
            this.scene.get('GameScene').events.emit('showUI');
            this.scene.start('GameScene');
        });

        // --- Кнопка "Продолжить" (Continue) ---
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
                    // Восстанавливаем кнопку через таймер
                    this.time.delayedCall(1500, () => {
                        if (continueBtn.active) {
                            continueBtn.setInteractive().clearTint();
                            continueText.setText(localizationManager.getString('btn_continue_ad_short'));
                        }
                    });
                },
                onClose: () => {
                    // Если закрыли без просмотра (награда не получена - сцена не сменилась), восстанавливаем
                    if (continueBtn.active) {
                        continueBtn.setInteractive().clearTint();
                        continueText.setText(localizationManager.getString('btn_continue_ad_short'));
                    }
                }
            });
        });
        
        // --- Кнопка Лидерборда (Показать таблицу) ---
        // Показываем кнопку только если SDK загружен и фича доступна
        if (typeof YaGames !== 'undefined') {
             // Небольшой хак: проверяем наличие SDK асинхронно, если инициализация была быстрой
             // Но для простоты UI: ставим кнопку, а при нажатии проверяем.
             const lbBtn = this.add.image(this.game.config.width - 80, 80, 'button').setInteractive();
             this.add.text(lbBtn.x, lbBtn.y, localizationManager.getString('leaderboard_tooltip'), { fontSize: '48px', fill: '#000' }).setOrigin(0.5);
             
             lbBtn.on('pointerdown', async () => {
                this.sound.play('click');
                try {
                    const ysdk = await YaGames.init();
                    if (ysdk.features.Leaderboards.isFeatureAvailable) {
                        const lb = await ysdk.getLeaderboards();
                        // Это вызывает нативное окно Яндекса
                        // ПРИМЕЧАНИЕ: В мок-версии это alert
                        lb.openLeaderboard('mainLeaderboard'); 
                    }
                } catch (err) {
                    console.warn('Leaderboard open failed:', err);
                }
             });
        }
    }
}