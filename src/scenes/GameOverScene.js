// /src/scenes/GameOverScene.js
import Phaser from 'phaser';
import { adManager } from '../AdManager.js';
import { analyticsManager } from '../AnalyticsManager.js';
import { dataManager } from '../DataManager.js';

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

        // --- БЛОК ЗАГОЛОВКОВ ---
        this.add.text(this.game.config.width / 2, 150, 'ИГРА ОКОНЧЕНА', { fontSize: '58px', fill: '#ff0000' }).setOrigin(0.5);
        this.add.text(this.game.config.width / 2, 230, 'Финальный счет: ' + this.finalScore, { fontSize: '48px', fill: '#ffffff' }).setOrigin(0.5);
        this.add.text(this.game.config.width / 2, 280, `Заработано монет: ${this.coinsEarned}`, { fontSize: '32px', fill: '#ffff00' }).setOrigin(0.5);

        try {
            this.ysdk = await YaGames.init();
            const lb = await this.ysdk.getLeaderboards();
            await lb.setLeaderboardScore('mainLeaderboard', this.finalScore);
        } catch (err) {
            console.error('Leaderboard error:', err);
        }

        this.time.delayedCall(500, () => adManager.showInterstitial(this));

        // --- ФИНАЛЬНАЯ ВЕРСТКА КНОПОК ---

        // 1. Блок "Удвоить"
        const doubleInfoText = this.add.text(this.game.config.width / 2, 330, `Удвойте награду: +${this.coinsEarned} монет!`, { fontSize: '28px', fill: '#90ee90' }).setOrigin(0.5);
        const doubleCoinsBtn = this.add.image(this.game.config.width / 2, 430, 'button').setScale(1.2).setInteractive();
        const doubleCoinsText = this.add.text(doubleCoinsBtn.x, doubleCoinsBtn.y, 'Удвоить (Ad)', { fontSize: '28px', fill: '#000' }).setOrigin(0.5);
        
        if (this.coinsEarned <= 0) {
            doubleCoinsBtn.disableInteractive().setTint(0x888888);
            doubleInfoText.setVisible(false);
        }
        doubleCoinsBtn.on('pointerdown', () => {
            this.sound.play('click');
            adManager.showRewarded(this, 'rewarded_double_coins', {
                onRewarded: () => {
                    dataManager.addCoins(this.coinsEarned);
                    dataManager.save(true);
                    doubleCoinsBtn.disableInteractive().setTint(0x888888);
                    doubleCoinsText.setText('Готово!');
                    doubleInfoText.setText(`Награда +${this.coinsEarned} получена!`);
                },
                onError: () => { doubleCoinsText.setText('Ошибка!'); }
            });
        });
        
        // 2. Кнопка "Заново"
        const restartBtn = this.add.image(this.game.config.width / 2, 550, 'button').setOrigin(0.5).setInteractive();
        this.add.text(restartBtn.x, restartBtn.y, 'Заново', { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        restartBtn.on('pointerdown', () => { 
            this.sound.play('click');
            window.location.reload();
        });

        // 3. Кнопка "Продолжить"
        const continueBtn = this.add.image(this.game.config.width / 2, 670, 'button').setOrigin(0.5).setInteractive();
        const continueText = this.add.text(continueBtn.x, continueBtn.y, 'Продолжить (Ad)', { fontSize: '24px', fill: '#000' }).setOrigin(0.5);
        continueBtn.on('pointerdown', () => {
            this.sound.play('click');
            adManager.showRewarded(this, 'rewarded_continue', {
                onRewarded: () => { this.scene.start('GameScene', { continueGame: true, gridState: this.gridState, score: this.finalScore }); },
                onError: () => {
                    continueText.setText('Позже');
                    continueBtn.disableInteractive().setTint(0x888888);
                }
            });
        });
        
        // Кнопка Лидерборда (без изменений)
        if (this.ysdk && this.ysdk.features?.Leaderboards?.isFeatureAvailable) {
             const lbBtn = this.add.image(this.game.config.width - 80, 80, 'button').setInteractive();
             this.add.text(lbBtn.x, lbBtn.y, '🏆', { fontSize: '48px', fill: '#000' }).setOrigin(0.5);
             lbBtn.on('pointerdown', () => {
                this.sound.play('click');
                this.ysdk.getLeaderboards().then(lb => {
                    lb.openLeaderboard('mainLeaderboard');
                });
             });
        }
    }
}