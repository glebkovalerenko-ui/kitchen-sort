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

        this.add.text(this.game.config.width / 2, 150, 'GAME OVER', { fontSize: '64px', fill: '#ff0000' }).setOrigin(0.5);
        this.add.text(this.game.config.width / 2, 250, 'Final Score: ' + this.finalScore, { fontSize: '48px', fill: '#ffffff' }).setOrigin(0.5);
        this.add.text(this.game.config.width / 2, 310, `Coins Earned: ${this.coinsEarned}`, { fontSize: '32px', fill: '#ffff00' }).setOrigin(0.5);

        try {
            this.ysdk = await YaGames.init();
            const lb = await this.ysdk.getLeaderboards();
            await lb.setLeaderboardScore('mainLeaderboard', this.finalScore);
            console.log(`Score ${this.finalScore} sent to leaderboard.`);
        } catch (err) {
            console.error('Leaderboard error:', err);
        }

        this.time.delayedCall(500, () => {
            adManager.showInterstitial(this);
        });

        const yPos = 450;

        const doubleCoinsBtn = this.add.image(this.game.config.width / 2, yPos, 'button').setScale(1.2).setInteractive();
        const doubleCoinsText = this.add.text(doubleCoinsBtn.x, doubleCoinsBtn.y, `Double Coins! (+${this.coinsEarned})`, { fontSize: '28px', fill: '#000' }).setOrigin(0.5);
        if (this.coinsEarned <= 0) {
            doubleCoinsBtn.disableInteractive().setTint(0x888888);
        }
        doubleCoinsBtn.on('pointerdown', () => {
            this.sound.play('click'); // ИЗМЕНЕНО
            adManager.showRewarded(this, 'rewarded_double_coins', {
                onRewarded: () => {
                    dataManager.addCoins(this.coinsEarned);
                    dataManager.save(true);
                    doubleCoinsBtn.disableInteractive().setTint(0x888888);
                    doubleCoinsText.setText('Done!');
                },
                onError: () => {
                    doubleCoinsText.setText('Error!');
                }
            });
        });
        
        const restartBtn = this.add.image(this.game.config.width / 2, yPos + 120, 'button').setOrigin(0.5).setInteractive();
        restartBtn.on('pointerdown', () => { 
            this.sound.play('click'); // ИЗМЕНЕНО
            window.location.reload();
        });
        this.add.text(restartBtn.x, restartBtn.y, 'Restart', { fontSize: '32px', fill: '#000' }).setOrigin(0.5);

        const continueBtn = this.add.image(this.game.config.width / 2, yPos + 240, 'button').setOrigin(0.5).setInteractive();
        const continueText = this.add.text(continueBtn.x, continueBtn.y, 'Continue (Ad)', { fontSize: '28px', fill: '#000' }).setOrigin(0.5);
        continueBtn.on('pointerdown', () => {
            this.sound.play('click'); // ИЗМЕНЕНО
            adManager.showRewarded(this, 'rewarded_continue', {
                onRewarded: () => {
                    this.scene.start('GameScene', { 
                        continueGame: true, 
                        gridState: this.gridState, 
                        score: this.finalScore 
                    });
                },
                onError: () => {
                    continueText.setText('Try again later');
                    continueBtn.disableInteractive().setTint(0x888888);
                }
            });
        });
        
        if (this.ysdk && this.ysdk.features?.Leaderboards?.isFeatureAvailable) {
             const lbBtn = this.add.image(this.game.config.width - 80, 80, 'button').setInteractive();
             this.add.text(lbBtn.x, lbBtn.y, '🏆', { fontSize: '48px', fill: '#000' }).setOrigin(0.5);
             lbBtn.on('pointerdown', () => {
                this.sound.play('click'); // ИЗМЕНЕНО
                this.ysdk.getLeaderboards().then(lb => {
                    lb.openLeaderboard('mainLeaderboard');
                });
             });
        }
    }
}