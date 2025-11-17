// /src/scenes/GameOverScene.js
import Phaser from 'phaser';
import { adManager } from '../AdManager.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOverScene'); }
    
    init(data) {
        this.finalScore = data.score;
        this.gridState = data.gridState; // Сохраняем состояние сетки
    }

    create() {
        this.add.text(this.game.config.width / 2, 200, 'GAME OVER', { fontSize: '64px', fill: '#ff0000' }).setOrigin(0.5);
        this.add.text(this.game.config.width / 2, 300, 'Final Score: ' + this.finalScore, { fontSize: '48px', fill: '#ffffff' }).setOrigin(0.5);

        // Показываем полноэкранную рекламу
        this.time.delayedCall(500, () => {
            adManager.showInterstitial(this);
        });

        // Кнопка "Restart"
        const restartBtn = this.add.image(this.game.config.width / 2, 500, 'button').setOrigin(0.5).setInteractive();
        restartBtn.on('pointerdown', () => { this.scene.start('GameScene', { continueGame: false }); }); // Явно указываем, что это не продолжение
        this.add.text(restartBtn.x, restartBtn.y, 'Restart', { fontSize: '32px', fill: '#000'}).setOrigin(0.5);

        // Кнопка "Continue for Ad"
        const continueBtn = this.add.image(this.game.config.width / 2, 650, 'button').setOrigin(0.5).setInteractive();
        const continueText = this.add.text(continueBtn.x, continueBtn.y, 'Continue (Ad)', { fontSize: '28px', fill: '#000'}).setOrigin(0.5);

        continueBtn.on('pointerdown', () => {
            adManager.showRewarded(this, {
                onRewarded: () => {
                    // ИГРОК ПОСМОТРЕЛ РЕКЛАМУ!
                    // Возвращаемся в игру, передавая флаг и СОСТОЯНИЕ СЕТКИ
                    this.scene.start('GameScene', { continueGame: true, gridState: this.gridState });
                },
                onError: () => {
                    continueText.setText('Try again later');
                    continueBtn.disableInteractive().setTint(0x888888);
                }
            });
        });
    }
}