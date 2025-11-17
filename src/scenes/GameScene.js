// /src/scenes/GameScene.js

import Phaser from 'phaser';
import { TILE_TYPES, RECIPES, SPAWNABLE_INGREDIENTS } from '../gameConfig.js';
import { dataManager } from '../DataManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        this.shouldContinue = data.continueGame || false;
        this.savedGridState = data.gridState || null;
    }

    create() {
        // --- 1. Настройка сетки и игровых переменных ---
        this.GRID_ROWS = 5;
        this.GRID_COLS = 5;
        this.CELL_SIZE = 100;
        this.GRID_START_X = (this.game.config.width - (this.GRID_COLS * this.CELL_SIZE)) / 2;
        this.GRID_START_Y = (this.game.config.height - (this.GRID_ROWS * this.CELL_SIZE)) / 2;
        
        this.score = 0;
        this.grid = Array(this.GRID_ROWS).fill(0).map(() => Array(this.GRID_COLS).fill(TILE_TYPES.EMPTY));
        this.ingredientsGroup = this.add.group();

        this.drawGrid();
        
        // --- 2. Настройка логики Drag & Drop ---
        this.input.on('dragstart', this.onDragStart, this);
        this.input.on('drag', this.onDrag, this);
        this.input.on('dragend', this.onDragEnd, this);

        // --- 3. Запуск UI сцены ---
        this.scene.launch('UIScene');

        // --- 4. Логика старта игры ---
        if (this.shouldContinue && this.savedGridState) {
            console.log('Continuing game...');
            this.restoreGrid(this.savedGridState);
        } else {
            console.log('Starting new game...');
            this.score = 0; // Убедимся, что счет сброшен
            this.events.emit('updateScore', this.score);
            this.spawnInitialIngredients();
        }
    }

    // --- Методы для перетаскивания ---
    onDragStart(pointer, gameObject) {
        this.children.bringToTop(gameObject);
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

        const targetGridX = targetObject.getData('gridX');
        const targetGridY = targetObject.getData('gridY');

        const spatulaLevel = dataManager.getGadgetLevel('spatula');
        const knifeLevel = dataManager.getGadgetLevel('knife');
        
        const scoreBonus = 1 + (spatulaLevel * 0.1);
        const coinBonus = 1 + (knifeLevel * 0.1);

        const scoreToAdd = Math.round(recipe.score * scoreBonus);
        const coinsToAdd = Math.round(recipe.coins * coinBonus);

        this.score += scoreToAdd;
        dataManager.addCoins(coinsToAdd);
        dataManager.save();

        this.events.emit('updateScore', this.score);
        this.events.emit('updateCoins', dataManager.getCoins());
    
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
        this.checkAndSpawn(2); // Заменяем прямой вызов спауна на проверку
    }

    spawnInitialIngredients() {
        for (let i = 0; i < 10; i++) { // Увеличим начальное количество для динамики
            this.spawnNewIngredient();
        }
    }
    
    checkAndSpawn(count) {
        for (let i = 0; i < count; i++) {
            this.spawnNewIngredient();
        }
        
        // После спауна проверяем, не закончилась ли игра
        const emptyCell = this.findEmptyCell();
        if (!emptyCell) {
            // Если пустых ячеек нет, проверяем наличие ходов
            if (!this.checkForPossibleMoves()) {
                this.triggerGameOver();
            }
        }
    }

    spawnNewIngredient() {
        const emptyCell = this.findEmptyCell();
        if (emptyCell) {
            const randomType = Phaser.Math.RND.pick(SPAWNABLE_INGREDIENTS);
            this.createIngredient(emptyCell.x, emptyCell.y, randomType);
        }
    }

    triggerGameOver() {
        console.log("GAME OVER! No more moves.");
        const currentGridState = this.saveGridState();
        this.scene.stop('UIScene');
        this.scene.start('GameOverScene', { score: this.score, gridState: currentGridState });
    }

    // --- НОВЫЕ И ИЗМЕНЕННЫЕ МЕТОДЫ ---

    checkForPossibleMoves() {
        const typeCounts = {};
        for (let y = 0; y < this.GRID_ROWS; y++) {
            for (let x = 0; x < this.GRID_COLS; x++) {
                const tile = this.grid[y][x];
                if (tile !== TILE_TYPES.EMPTY) {
                    const type = tile.getData('type');
                    typeCounts[type] = (typeCounts[type] || 0) + 1;
                }
            }
        }

        for (const type in typeCounts) {
            if (typeCounts[type] >= 2) {
                console.log(`Found possible move for type: ${type}`);
                return true; // Найден возможный ход
            }
        }

        return false; // Ходов нет
    }

    saveGridState() {
        const state = [];
        for (let y = 0; y < this.GRID_ROWS; y++) {
            for (let x = 0; x < this.GRID_COLS; x++) {
                const tile = this.grid[y][x];
                if (tile !== TILE_TYPES.EMPTY) {
                    state.push({ x, y, type: tile.getData('type') });
                }
            }
        }
        return state;
    }

    restoreGrid(gridState) {
        // Очищаем текущее поле
        this.ingredientsGroup.clear(true, true);
        this.grid = Array(this.GRID_ROWS).fill(0).map(() => Array(this.GRID_COLS).fill(TILE_TYPES.EMPTY));

        // Восстанавливаем из сохранения
        gridState.forEach(item => {
            this.createIngredient(item.x, item.y, item.type);
        });

        // Очищаем 3 случайные ячейки, чтобы дать игроку шанс
        const cellsToClear = [];
        this.ingredientsGroup.getChildren().forEach(child => {
            cellsToClear.push(child);
        });
        
        Phaser.Utils.Array.Shuffle(cellsToClear);

        for (let i = 0; i < 3; i++) {
            if (cellsToClear[i]) {
                const cell = cellsToClear[i];
                const gridX = cell.getData('gridX');
                const gridY = cell.getData('gridY');
                this.grid[gridY][gridX] = TILE_TYPES.EMPTY;
                cell.destroy();
            }
        }
    }


    // --- Вспомогательные методы (без изменений) ---
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