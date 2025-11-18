// /src/scenes/GameOverScene.js
import Phaser from 'phaser';
import { adManager } from '../AdManager.js';
import { analyticsManager } from '../AnalyticsManager.js'; // ДОБАВЛЕНО

export default class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOverScene'); }
    
    init(data) {
        this.finalScore = data.score;
        this.gridState = data.gridState;
        this.sessionDuration = data.sessionDuration;
        this.coinsEarned = data.coinsEarned;
    }

    create() {
        // Отправляем аналитику о завершении игры
        analyticsManager.trackGameEnd(this.finalScore, this.sessionDuration, this.coinsEarned);

        this.add.text(this.game.config.width / 2, 200, 'GAME OVER', { fontSize: '64px', fill: '#ff0000' }).setOrigin(0.5);
        this.add.text(this.game.config.width / 2, 300, 'Final Score: ' + this.finalScore, { fontSize: '48px', fill: '#ffffff' }).setOrigin(0.5);

        this.time.delayedCall(500, () => {
            adManager.showInterstitial(this);
        });

        const restartBtn = this.add.image(this.game.config.width / 2, 500, 'button').setOrigin(0.5).setInteractive();
        restartBtn.on('pointerdown', () => { 
            this.sound.play('click_sfx');
            window.location.reload();
        });
        this.add.text(restartBtn.x, restartBtn.y, 'Restart', { fontSize: '32px', fill: '#000'}).setOrigin(0.5);

        const continueBtn = this.add.image(this.game.config.width / 2, 650, 'button').setOrigin(0.5).setInteractive();
        const continueText = this.add.text(continueBtn.x, continueBtn.y, 'Continue (Ad)', { fontSize: '28px', fill: '#000'}).setOrigin(0.5);
        continueBtn.on('pointerdown', () => {
            this.sound.play('click_sfx');
            
            // --- ИСПРАВЛЕННЫЙ ВЫЗОВ ---
            // Теперь мы передаем placement 'rewarded_continue' как второй аргумент
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
    }
}