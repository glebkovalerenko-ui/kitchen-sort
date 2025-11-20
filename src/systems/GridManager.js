// /src/systems/GridManager.js
import { TILE_TYPES } from '../GameConfig.js';

export default class GridManager {
    constructor(scene) {
        this.scene = scene;
        this.rows = scene.GRID_ROWS;
        this.cols = scene.GRID_COLS;
        this.grid = Array(this.rows).fill(0).map(() => Array(this.cols).fill(TILE_TYPES.EMPTY));
    }

    // Помещает объект в логическую сетку
    placeItem(x, y, item) {
        this.grid[y][x] = item;
    }

    // Убирает объект из логической сетки
    removeItem(x, y) {
        this.grid[y][x] = TILE_TYPES.EMPTY;
    }

    // Возвращает объект в ячейке
    getItemAt(x, y) {
        return this.grid[y][x];
    }

    // Ищет случайную пустую ячейку
    findEmptyCell() {
        const emptyCells = [];
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.grid[y][x] === TILE_TYPES.EMPTY) {
                    emptyCells.push({ x, y });
                }
            }
        }
        return Phaser.Math.RND.pick(emptyCells) || null;
    }

    // Проверяет, валидны ли координаты
    isValidGridPosition(x, y) {
        return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
    }

    // Очищает всю сетку
    clear() {
        this.grid = Array(this.rows).fill(0).map(() => Array(this.cols).fill(TILE_TYPES.EMPTY));
    }
}