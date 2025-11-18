// /src/scenes/GameScene.js

import Phaser from 'phaser';
import { TILE_TYPES, GENERATORS } from '../gameConfig.js';
import { dataManager } from '../DataManager.js';
import GridManager from '../systems/GridManager.js';
import MergeSystem from '../systems/MergeSystem.js';
import InputHandler from '../systems/InputHandler.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        this.shouldContinue = data.continueGame || false;
        this.savedGridState = data.gridState || null;
        this.initialScore = data.score || 0;
        this.events.on('resume', this.onSceneResume, this);
    }

    create() {
        this.add.image(this.game.config.width / 2, this.game.config.height / 2, 'background_kitchen').setDisplaySize(this.game.config.width, this.game.config.height);
        this.GRID_ROWS = 5;
        this.GRID_COLS = 5;
        this.CELL_SIZE = 100;
        this.GRID_START_X = (this.game.config.width - (this.GRID_COLS * this.CELL_SIZE)) / 2;
        this.GRID_START_Y = (this.game.config.height - (this.GRID_ROWS * this.CELL_SIZE)) / 2;
        this.score = this.initialScore;
        this.ingredientsGroup = this.add.group();
        
        this.gridManager = new GridManager(this);
        this.mergeSystem = new MergeSystem();
        this.inputHandler = new InputHandler(this);

        this.input.once('pointerdown', () => {
            if (this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }
        });
        const music = this.sound.get('music');
        if (!music || !music.isPlaying) {
            this.sound.play('music', { loop: true, volume: 0.4 });
        }
        
        this.scene.launch('UIScene');
        this.events.emit('updateScore', this.score); 
        this.createGeneratorIcons();

        if (this.shouldContinue && this.savedGridState) {
            this.restoreGrid(this.savedGridState);
        } else {
            this.startNewGame();
        }
    }

    handleDrop(draggedObject, gridX, gridY) {
        if (this.gridManager.isValidGridPosition(gridX, gridY)) {
            const targetObject = this.gridManager.getItemAt(gridX, gridY);
            if (targetObject && targetObject !== draggedObject) {
                const recipe = this.mergeSystem.findRecipe(draggedObject.getData('type'), targetObject.getData('type'));
                if (recipe) {
                    this.handleMerge(draggedObject, targetObject, recipe);
                    return;
                }
            }
        }
        
        this.snapToGrid(draggedObject);
        this.checkGameOverConditions();
    }

    handleMerge(draggedObject, targetObject, recipe) {
        this.sound.play('merge_sfx');
        
        const sourceGridPos = { x: draggedObject.getData('gridX'), y: draggedObject.getData('gridY') };
        const targetGridPos = { x: targetObject.getData('gridX'), y: targetObject.getData('gridY') };

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
        const isNewUnlock = dataManager.unlockIngredient(recipe.output);
        if (isNewUnlock) {
            this.sound.play('unlock_sfx');
            console.log('NEW UNLOCK:', recipe.output);
        }

        this.gridManager.removeItem(sourceGridPos.x, sourceGridPos.y);
        this.gridManager.removeItem(targetGridPos.x, targetGridPos.y);

        const targetPixelX = targetObject.x;
        const targetPixelY = targetObject.y;

        this.tweens.add({
            targets: [draggedObject, targetObject],
            scale: 0,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                draggedObject.destroy();
                targetObject.destroy();
                const emitter = this.add.particles(targetPixelX, targetPixelY, 'particle', {
                    speed: { min: 50, max: 150 },
                    angle: { min: 0, max: 360 },
                    scale: { start: 0.8, end: 0 },
                    blendMode: 'ADD',
                    lifespan: 300,
                    tint: 0xffff00,
                    emitting: false
                });
                emitter.explode(16);
                const newIngredient = this.createIngredient(targetGridPos.x, targetGridPos.y, recipe.output);
                const finalScale = newIngredient.scale;
                newIngredient.setScale(0);
                this.tweens.add({
                    targets: newIngredient,
                    scale: finalScale,
                    duration: 300,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        this.checkGameOverConditions();
                    }
                });
            }
        });
    }

    onSceneResume() {
        console.log('GameScene has resumed.');
        this.updateGeneratorIcons();
    }

    createGeneratorIcons() {
        const iconStyle = { fontSize: '28px', fill: '#fff', stroke: '#000', strokeThickness: 5 };
        this.generatorIcons = {};
        const coopIcon = this.add.image(this.GRID_START_X - 80, this.GRID_START_Y + 70, 'icon_coop').setScale(0.15).setInteractive();
        const coopChargesText = this.add.text(coopIcon.x, coopIcon.y + 80, '', iconStyle).setOrigin(0.5);
        coopIcon.on('pointerdown', () => {
            this.sound.play('click_sfx');
            this.scene.pause();
            this.scene.launch('GeneratorScene', { id: 'coop' });
        });
        this.generatorIcons.coop = { icon: coopIcon, text: coopChargesText };
        const greenhouseIcon = this.add.image(this.GRID_START_X + this.GRID_COLS * this.CELL_SIZE + 80, this.GRID_START_Y + 70, 'icon_greenhouse').setScale(0.15).setInteractive();
        const greenhouseChargesText = this.add.text(greenhouseIcon.x, greenhouseIcon.y + 80, '', iconStyle).setOrigin(0.5);
        greenhouseIcon.on('pointerdown', () => {
            this.sound.play('click_sfx');
            this.scene.pause();
            this.scene.launch('GeneratorScene', { id: 'greenhouse' });
        });
        this.generatorIcons.greenhouse = { icon: greenhouseIcon, text: greenhouseChargesText };
        this.updateGeneratorIcons();
        this.time.addEvent({ delay: 1000, callback: this.updateGeneratorIcons, callbackScope: this, loop: true });
    }
    
    updateGeneratorIcons() {
        if (!this.scene.isActive()) return;
        for (const id in this.generatorIcons) {
            const state = dataManager.getGeneratorState(id);
            const capacity = dataManager.getCurrentGeneratorValue(id, 'capacity');
            this.generatorIcons[id].text.setText(`${state.charges}/${capacity}`);
        }
    }

    startNewGame() {
        this.addCollectedItemsToGrid(TILE_TYPES.EGG, 2);
        this.addCollectedItemsToGrid(TILE_TYPES.TOMATO, 2);
        this.checkGameOverConditions();
    }

    addCollectedItemsToGrid(itemType, count) {
        for (let i = 0; i < count; i++) {
            const emptyCell = this.gridManager.findEmptyCell();
            if (emptyCell) {
                this.createIngredient(emptyCell.x, emptyCell.y, itemType);
            } else {
                console.warn('No empty space to add collected items!');
                break;
            }
        }
        this.checkGameOverConditions();
    }

    triggerGameOver() {
        console.log("GAME OVER! No more moves.");
        this.sound.play('gameover_sfx');
        const currentGridState = this.saveGridState();
        this.scene.stop('UIScene');
        this.scene.start('GameOverScene', { score: this.score, gridState: currentGridState });
    }
    
    checkGameOverConditions() {
        if (this.checkForPossibleMoves()) {
            return;
        }
        const boardIsFull = !this.gridManager.findEmptyCell();
        const generatorsAreEmpty = this.areGeneratorsEmpty();
        if (boardIsFull || generatorsAreEmpty) {
            this.triggerGameOver();
        } else {
            console.log("No moves on board, but player can still add items. Game continues.");
        }
    }

    areGeneratorsEmpty() {
        for (const id in GENERATORS) {
            const state = dataManager.getGeneratorState(id);
            if (state.charges > 0) {
                return false;
            }
        }
        return true;
    }

    checkForPossibleMoves() {
        const items = this.ingredientsGroup.getChildren();
        const typeCounts = {};
        for(const item of items) {
            const type = item.getData('type');
            if(!typeCounts[type]) {
                typeCounts[type] = [];
            }
            typeCounts[type].push(item);
        }
        for (const type in typeCounts) {
            if (typeCounts[type].length >= 2) {
                if (this.mergeSystem.findRecipe(type, type)) {
                    return true;
                }
            }
            for (const otherType in typeCounts) {
                if (type === otherType) continue;
                if (this.mergeSystem.findRecipe(type, otherType)) {
                    return true;
                }
            }
        }
        console.log('No possible moves found.');
        return false;
    }

    saveGridState() {
        const state = [];
        const items = this.ingredientsGroup.getChildren();
        for (const item of items) {
            state.push({ 
                x: item.getData('gridX'), 
                y: item.getData('gridY'), 
                type: item.getData('type') 
            });
        }
        return state;
    }
    
    restoreGrid(gridState) {
        this.ingredientsGroup.clear(true, true);
        this.gridManager.clear();
        
        gridState.forEach(item => {
            this.createIngredient(item.x, item.y, item.type);
        });

        if (!this.gridManager.findEmptyCell()) {
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
                    this.gridManager.removeItem(gridX, gridY);
                    cell.destroy();
                }
            }
        }
        
        for (const id in GENERATORS) {
            const state = dataManager.getGeneratorState(id);
            const capacity = dataManager.getCurrentGeneratorValue(id, 'capacity');
            state.charges = Math.min(capacity, state.charges + 2);
            dataManager.setGeneratorState(id, state);
        }
        dataManager.save();
        this.updateGeneratorIcons();
        this.checkGameOverConditions();
    }

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
        this.gridManager.placeItem(gridX, gridY, ingredient);
        this.ingredientsGroup.add(ingredient);
        return ingredient;
    }

    snapToGrid(gameObject) {
        const gridX = gameObject.getData('gridX');
        const gridY = gameObject.getData('gridY');
        const pixelX = this.GRID_START_X + gridX * this.CELL_SIZE + this.CELL_SIZE / 2;
        const pixelY = this.GRID_START_Y + gridY * this.CELL_SIZE + this.CELL_SIZE / 2;
        gameObject.setPosition(pixelX, pixelY);
    }
}