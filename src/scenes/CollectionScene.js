// /src/scenes/CollectionScene.js
import Phaser from 'phaser';
import { dataManager } from '../DataManager.js';
import { TILE_TYPES } from '../GameConfig.js';
import { localizationManager } from '../LocalizationManager.js';

export default class CollectionScene extends Phaser.Scene {
    constructor() {
        super('CollectionScene');
    }

    create() {
        // --- ФОН И БЛОКИРОВКА ВВОДА ---
        // Создаем затемненный фон на весь экран
        // Увеличили непрозрачность до 0.85 для лучшей читаемости
        const overlay = this.add.rectangle(0, 0, this.game.config.width, this.game.config.height, 0x000000, 0.85).setOrigin(0);

        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Делаем фон интерактивным.
        // Это перехватывает все клики/тапы и не дает им пройти сквозь эту сцену
        // к сцене GameScene, которая находится ниже.
        overlay.setInteractive();
        overlay.on('pointerdown', () => { 
            // Пустой обработчик поглощает событие клика
        });

        // Заголовок
        this.add.text(this.game.config.width / 2, 100, localizationManager.getString('collection_title'), { fontSize: '48px', fill: '#ffffff' }).setOrigin(0.5);

        // Логика сетки предметов
        const allItems = Object.values(TILE_TYPES).filter(type => type !== 0);
        const cols = 5;
        const cellWidth = 120;
        const cellHeight = 120;
        
        // Центрируем сетку
        const startX = (this.game.config.width - (cols * cellWidth)) / 2 + cellWidth / 2;
        const startY = 250;

        allItems.forEach((itemKey, index) => {
            const x = startX + (index % cols) * cellWidth;
            const y = startY + Math.floor(index / cols) * cellHeight;
            
            if (dataManager.isUnlocked(itemKey)) {
                // Если предмет открыт - показываем спрайт
                const sprite = this.add.sprite(x, y, itemKey);
                // Масштабируем спрайт, чтобы он вписался в ячейку (с небольшим отступом)
                sprite.setScale((cellWidth / sprite.width) * 0.8);
            } else {
                // Если закрыт - показываем знак вопроса
                this.add.text(x, y, '?', { fontSize: '64px', fill: '#ffffff' }).setOrigin(0.5);
            }
        });

        // Кнопка "Назад"
        const backBtn = this.add.image(this.game.config.width / 2, this.game.config.height - 100, 'button').setOrigin(0.5).setInteractive();
        this.add.text(backBtn.x, backBtn.y, localizationManager.getString('btn_back'), { fontSize: '32px', fill: '#000'}).setOrigin(0.5);
        
        backBtn.on('pointerdown', () => {
            this.sound.play('click');
            this.scene.resume('GameScene');
            this.scene.stop();
        });
    }
}