// /src/scenes/UpgradeScene.js
import Phaser from 'phaser';
import { dataManager } from '../DataManager.js';
import { GADGETS } from '../GameConfig.js';
import { localizationManager } from '../LocalizationManager.js';

export default class UpgradeScene extends Phaser.Scene {
    constructor() {
        super('UpgradeScene');
    }

    create() {
        // --- ФОН И БЛОКИРОВКА ВВОДА ---
        // Создаем затемненный фон на весь экран. 
        // Непрозрачность 0.85 для лучшей читаемости текста.
        const overlay = this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0x000000, 0.85).setOrigin(0);
        
        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Делаем фон интерактивным.
        // Это блокирует передачу кликов на сцены, находящиеся ниже (GameScene).
        overlay.setInteractive();
        overlay.on('pointerdown', () => {
            // Пустой обработчик поглощает клик
        });

        // Заголовок
        this.add.text(this.game.config.width / 2, 80, localizationManager.getString('gadgets_title'), { fontSize: '48px', fill: '#ffffff' }).setOrigin(0.5);
        
        // Текущие монеты
        this.currentCoinsText = this.add.text(this.game.config.width / 2, 140, localizationManager.getString('your_coins') + ' ' + dataManager.getCoins(), { fontSize: '32px', fill: '#ffff00' }).setOrigin(0.5);

        // Генерация карточек гаджетов
        const gadgetIds = Object.keys(GADGETS);
        gadgetIds.forEach((id, index) => {
            const yPos = 250 + index * 220;
            this.createGadgetCard(id, yPos);
        });

        // Кнопка "Назад"
        const backBtn = this.add.image(this.game.config.width / 2, this.game.config.height - 100, 'button').setOrigin(0.5).setInteractive();
        this.add.text(backBtn.x, backBtn.y, localizationManager.getString('btn_back'), { fontSize: '32px', fill: '#000000' }).setOrigin(0.5);
        
        backBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.scene.resume('GameScene');
            this.scene.stop();
        });
    }

    createGadgetCard(gadgetId, y) {
        const level = dataManager.getGadgetLevel(gadgetId);
        const cost = dataManager.getGadgetUpgradeCost(gadgetId);
        
        const gadgetName = localizationManager.getString(`gadget_${gadgetId}_name`);
        const gadgetDesc = localizationManager.getString(`gadget_${gadgetId}_desc`);
        const currentLevelText = localizationManager.getString('gadget_level', { level: level });

        // Название и уровень
        this.add.text(this.game.config.width / 2, y, `${gadgetName} ${currentLevelText}`, { fontSize: '32px', fill: '#ffffff' }).setOrigin(0.5);
        
        // Описание с переносом строк
        this.add.text(this.game.config.width / 2, y + 45, gadgetDesc, { fontSize: '22px', fill: '#cccccc', wordWrap: { width: 600 }, align: 'center' }).setOrigin(0.5);

        // Кнопка покупки
        const buyBtn = this.add.image(this.game.config.width / 2, y + 130, 'button').setOrigin(0.5).setInteractive();
        const buyBtnText = this.add.text(buyBtn.x, buyBtn.y, localizationManager.getString('btn_gadget_upgrade', { cost: cost }), { fontSize: '24px', fill: '#000'}).setOrigin(0.5);
        
        buyBtn.on('pointerdown', () => {
            this.sound.play('click');
            
            // Пытаемся улучшить через DataManager
            if (dataManager.upgradeGadget(gadgetId)) {
                // Обновляем UI монет в основной сцене
                this.scene.get('GameScene').events.emit('updateCoins', dataManager.getCoins());
                
                // Перезапускаем текущую сцену, чтобы обновить цены и уровни
                this.scene.restart();
            } else {
                // Анимация ошибки (тряска), если не хватает денег
                this.tweens.add({
                    targets: buyBtn,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 50,
                    yoyo: true,
                    repeat: 2
                });
            }
        });

        // Если монет не хватает, делаем кнопку серой и неактивной визуально
        // (Логическая проверка внутри pointerdown тоже есть, но визуальный фидбек важен)
        if (dataManager.getCoins() < cost) {
            buyBtn.setTint(0x888888).disableInteractive();
        }
    }
}