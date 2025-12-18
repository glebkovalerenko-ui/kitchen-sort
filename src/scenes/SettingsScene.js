// /src/scenes/SettingsScene.js
import Phaser from 'phaser';
import { localizationManager } from '../LocalizationManager.js';
import { dataManager } from '../DataManager.js';

export default class SettingsScene extends Phaser.Scene {
    constructor() {
        super('SettingsScene');
    }

    create() {
        const overlay = this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0x000000, 0.85).setOrigin(0);
        overlay.setInteractive();

        this.add.text(this.game.config.width / 2, 100, localizationManager.getString('settings_title'), { fontSize: '48px', fill: '#ffffff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);

        const centerX = this.game.config.width / 2;
        let currentY = 250;
        const spacing = 120;

        // 1. Кнопка Звука
        const isMuted = dataManager.isMuted();
        const soundBtn = this.add.image(centerX, currentY, 'button').setScale(1.2).setInteractive();
        const soundText = this.add.text(centerX, currentY, isMuted ? localizationManager.getString('settings_sound_off') : localizationManager.getString('settings_sound_on'), { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        
        soundBtn.on('pointerdown', () => {
            this.sound.play('click');
            const newMuteState = !dataManager.isMuted();
            dataManager.setMuted(newMuteState);
            this.sound.mute = newMuteState;
            soundText.setText(newMuteState ? localizationManager.getString('settings_sound_off') : localizationManager.getString('settings_sound_on'));
            
            const uiScene = this.scene.get('UIScene');
            if (uiScene) uiScene.applyMuteState(); 
        });
        currentY += spacing;

        // 2. Кнопка Коллекции
        const collectionBtn = this.add.image(centerX, currentY, 'button').setScale(1.2).setInteractive();
        this.add.text(centerX, currentY, localizationManager.getString('btn_collection'), { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        collectionBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.scene.launch('CollectionScene');
            // ИЗМЕНЕНИЕ: Останавливаем текущую сцену, чтобы она не оставалась под новой
            this.scene.stop();
        });
        currentY += spacing;

        // 3. Кнопка Магазина
        const shopBtn = this.add.image(centerX, currentY, 'button').setScale(1.2).setInteractive();
        this.add.text(centerX, currentY, localizationManager.getString('btn_upgrades'), { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        shopBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.scene.launch('UpgradeScene');
            // ИЗМЕНЕНИЕ: Останавливаем текущую сцену, чтобы она не оставалась под новой
            this.scene.stop();
        });
        currentY += spacing;

        // Кнопка НАЗАД
        const backBtn = this.add.image(centerX, this.game.config.height - 100, 'button').setInteractive();
        this.add.text(centerX, this.game.config.height - 100, localizationManager.getString('btn_back'), { fontSize: '32px', fill: '#000' }).setOrigin(0.5);
        
        backBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.scene.resume('GameScene');
            this.scene.stop();
        });
    }
}