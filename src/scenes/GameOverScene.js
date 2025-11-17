// /src/scenes/GameOverScene.js
import Phaser from 'phaser';
import { adManager } from '../AdManager.js'; // Импортируем менеджер

export default class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOverScene'); }
    init(data) { this.finalScore = data.score; }

    create() {
        this.add.text(this.game.config.width / 2, 200, 'GAME OVER', { /*...*/ }).setOrigin(0.5);
        this.add.text(this.game.config.width / 2, 300, 'Final Score: ' + this.finalScore, { /*...*/ }).setOrigin(0.5);

        // --- Показываем полноэкранную рекламу ---
        // Небольшая задержка, чтобы игрок успел увидеть свой счет
        this.time.delayedCall(500, () => {
            adManager.showInterstitial(this);
        });

        // --- Кнопка "Restart" ---
        const restartBtn = this.add.image(this.game.config.width / 2, 500, 'button').setOrigin(0.5).setInteractive();
        restartBtn.on('pointerdown', () => { this.scene.start('GameScene'); });
        this.add.text(restartBtn.x, restartBtn.y, 'Restart', { /*...*/ }).setOrigin(0.5);

        // --- НОВАЯ КНОПКА: "Continue for Ad" ---
        const continueBtn = this.add.image(this.game.config.width / 2, 650, 'button').setOrigin(0.5).setInteractive();
        const continueText = this.add.text(continueBtn.x, continueBtn.y, 'Continue (Ad)', { fontSize: '28px', fill: '#000'}).setOrigin(0.5);

        continueBtn.on('pointerdown', () => {
            adManager.showRewarded(this, {
                onRewarded: () => {
                    // ИГРОК ПОСМОТРЕЛ РЕКЛАМУ!
                    // Возвращаемся в игру, передавая специальный флаг
                    this.scene.start('GameScene', { continueGame: true });
                },
                onError: () => {
                    // Если ошибка, можно сказать игроку, что реклама не загрузилась
                    continueText.setText('Try again later');
                }
            });
        });
    }
}