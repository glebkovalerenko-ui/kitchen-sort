// /src/scenes/GameScene.js

import Phaser from 'phaser';
import { TILE_TYPES, RECIPES, SPAWNABLE_INGREDIENTS } from '../gameConfig.js';

import { dataManager } from '../DataManager.js';

// Теперь мы экспортируем класс, чтобы main.js мог его импортировать
export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    // --- НОВЫЙ МЕТОД: init ---
    // Он вызывается перед create и получает данные от другой сцены
    init(data) {
        // Если мы пришли со сцены GameOver после просмотра рекламы
        this.shouldContinue = data.continueGame || false;
    }

    create() {
        // --- 1. Настройка сетки и игровых переменных ---
        this.GRID_ROWS = 5;
        this.GRID_COLS = 5;
        this.CELL_SIZE = 100;
        this.GRID_START_X = (this.game.config.width - (this.GRID_COLS * this.CELL_SIZE)) / 2;
        this.GRID_START_Y = (this.game.config.height - (this.GRID_ROWS * this.CELL_SIZE)) / 2;
        
        this.score = 0;
        // scoreText теперь создается в UIScene.js

        // Создаем логическую модель сетки (массив массивов), заполненный нулями (пустыми ячейками)
        this.grid = Array(this.GRID_ROWS).fill(0).map(() => Array(this.GRID_COLS).fill(TILE_TYPES.EMPTY));
        
        // Группа для хранения всех визуальных объектов-ингредиентов
        this.ingredientsGroup = this.add.group();

        this.drawGrid(); // Отрисовываем сетку
        
        // --- 2. Настройка логики Drag & Drop ---
        this.input.on('dragstart', this.onDragStart, this);
        this.input.on('drag', this.onDrag, this);
        this.input.on('dragend', this.onDragEnd, this);

        // --- 3. Запускаем UI сцену ---
        // launch() запускает сцену параллельно, в отличие от start(), который перезапускает
        this.scene.launch('UIScene');

        // --- 4. Первоначальный спаун ---
        this.spawnInitialIngredients();

        // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
        if (this.shouldContinue) {
            // Если мы продолжаем игру, нам нужно восстановить состояние
            // Но для MVP мы просто начнем заново, но с небольшим бонусом
            // TODO: Реализовать настоящее восстановление
            console.log('Continuing game...');
            this.spawnInitialIngredients();
        } else {
            // Если это новая игра, начинаем как обычно
            this.spawnInitialIngredients();
        }

        this.scene.launch('UIScene');
    }

    // --- Методы для перетаскивания ---
    onDragStart(pointer, gameObject) {
        this.children.bringToTop(gameObject); // Поднимаем объект наверх
        gameObject.setScale(gameObject.getData('baseScale') * 1.1);
    }
    
    onDrag(pointer, gameObject, dragX, dragY) {
        gameObject.setPosition(dragX, dragY);
    }

    onDragEnd(pointer, gameObject) {
        if (!gameObject.scene) return;
        gameObject.setScale(gameObject.getData('baseScale')); 
        
        const gridX = Math.floor((pointer.x - this.GRID_START_X) / this.CELL_SIZE);
        const gridY = Math.floor((pointer.y - this.GRID_START_Y) / this.CELL_SIZE);

        if (this.isValidGridPosition(gridX, gridY)) {
            const targetObject = this.grid[gridY][gridX];
            if (targetObject && targetObject.getData('type') === gameObject.getData('type') && targetObject !== gameObject) {
                this.handleMerge(gameObject, targetObject);
            } else {
                this.snapToGrid(gameObject);
            }
        } else {
            this.snapToGrid(gameObject);
        }
    }

    // --- Основные игровые методы ---
    handleMerge(draggedObject, targetObject) {
        this.sound.play('merge_sfx');
        const type = draggedObject.getData('type');
        const recipe = RECIPES[type];

        if (!recipe) {
            this.snapToGrid(draggedObject);
            return;
        }

        // Получаем координаты целевой ячейки до того, как начнем все удалять.
        const targetGridX = targetObject.getData('gridX');
        const targetGridY = targetObject.getData('gridY');

        // Получаем уровни гаджетов
        const spatulaLevel = dataManager.getGadgetLevel('spatula');
        const knifeLevel = dataManager.getGadgetLevel('knife');
        
        // Рассчитываем бонусы (10% за уровень)
        const scoreBonus = 1 + (spatulaLevel * 0.1);
        const coinBonus = 1 + (knifeLevel * 0.1);

        // Применяем бонусы к наградам
        const scoreToAdd = Math.round(recipe.score * scoreBonus);
        const coinsToAdd = Math.round(recipe.coins * coinBonus);

        this.score += scoreToAdd;
        dataManager.addCoins(coinsToAdd); // Добавляем монеты через менеджер
        dataManager.save(); // Сохраняем прогресс (включая монеты)

        // Отправляем события в UIScene
        this.events.emit('updateScore', this.score);
        this.events.emit('updateCoins', dataManager.getCoins()); // Новое событие!
    

        // Сообщаем менеджеру данных, что мы открыли новый ингредиент
        const isNewUnlock = dataManager.unlockIngredient(recipe.mergeTo);
        if (isNewUnlock) {
            console.log('NEW UNLOCK:', recipe.mergeTo);
            // TODO: Показать красивую анимацию "Новый рецепт открыт!"
        }

        this.grid[draggedObject.getData('gridY')][draggedObject.getData('gridX')] = TILE_TYPES.EMPTY;
        this.grid[targetGridY][targetGridX] = TILE_TYPES.EMPTY;
        draggedObject.destroy();
        targetObject.destroy();

        this.createIngredient(targetGridX, targetGridY, recipe.mergeTo);
        this.spawnNewIngredients(2);
    }

    spawnInitialIngredients() {
        for (let i = 0; i < 5; i++) {
            this.spawnNewIngredients(1, true); // initialSpawn = true
        }
    }
    
    spawnNewIngredients(count, initialSpawn = false) {
        for (let i = 0; i < count; i++) {
            const emptyCell = this.findEmptyCell();
            if (emptyCell) {
                const randomType = Phaser.Math.RND.pick(SPAWNABLE_INGREDIENTS);
                this.createIngredient(emptyCell.x, emptyCell.y, randomType);
            } else if (!initialSpawn) {
                // Запускаем Game Over только если это не первоначальный спаун
                console.log("GAME OVER!");
                this.scene.stop('UIScene');
                this.scene.start('GameOverScene', { score: this.score });
                break;
            }
        }
    }

    // --- Вспомогательные методы ---
    createIngredient(gridX, gridY, type) {
        const pixelX = this.GRID_START_X + gridX * this.CELL_SIZE + this.CELL_SIZE / 2;
        const pixelY = this.GRID_START_Y + gridY * this.CELL_SIZE + this.CELL_SIZE / 2;

        const ingredient = this.add.sprite(pixelX, pixelY, type);
        
        const scale = (this.CELL_SIZE / ingredient.width) * 0.9;
        ingredient.setScale(scale);
        ingredient.setData('baseScale', scale);

        ingredient.setInteractive();
        this.input.setDraggable(ingredient);
        
        ingredient.setData({ type: type, gridX: gridX, gridY: gridY });
        
        this.grid[gridY][gridX] = ingredient;
        this.ingredientsGroup.add(ingredient);
        
        return ingredient;
    }

    findEmptyCell() {
        const emptyCells = [];
        for (let y = 0; y < this.GRID_ROWS; y++) {
            for (let x = 0; x < this.GRID_COLS; x++) {
                if (this.grid[y][x] === TILE_TYPES.EMPTY) {
                    emptyCells.push({ x, y });
                }
            }
        }
        return Phaser.Math.RND.pick(emptyCells) || null;
    }

    snapToGrid(gameObject) {
        const gridX = gameObject.getData('gridX');
        const gridY = gameObject.getData('gridY');
        const pixelX = this.GRID_START_X + gridX * this.CELL_SIZE + this.CELL_SIZE / 2;
        const pixelY = this.GRID_START_Y + gridY * this.CELL_SIZE + this.CELL_SIZE / 2;
        gameObject.setPosition(pixelX, pixelY);
    }
    
    isValidGridPosition(gridX, gridY) {
        return gridX >= 0 && gridX < this.GRID_COLS && gridY >= 0 && gridY < this.GRID_ROWS;
    }

    drawGrid() {
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0xaaaaaa, 0.6);
        for (let i = 0; i <= this.GRID_COLS; i++) {
            const x = this.GRID_START_X + i * this.CELL_SIZE;
            graphics.moveTo(x, this.GRID_START_Y);
            graphics.lineTo(x, this.GRID_START_Y + this.GRID_ROWS * this.CELL_SIZE);
        }
        for (let i = 0; i <= this.GRID_ROWS; i++) {
            const y = this.GRID_START_Y + i * this.CELL_SIZE;
            graphics.moveTo(this.GRID_START_X, y);
            graphics.lineTo(this.GRID_START_X + this.GRID_COLS * this.CELL_SIZE, y);
        }
        graphics.strokePath();
    }
}