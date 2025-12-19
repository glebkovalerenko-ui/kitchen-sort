// /src/scenes/GameScene.js
import Phaser from 'phaser';
import { TILE_TYPES, GENERATORS } from '../GameConfig.js';
import { dataManager } from '../DataManager.js';
import GridManager from '../systems/GridManager.js';
import MergeSystem from '../systems/MergeSystem.js';
import InputHandler from '../systems/InputHandler.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        // ИЗМЕНЕНИЕ: Логика продолжения после просмотра рекламы (без очков, они в DataManager)
        this.shouldContinueFromGameOver = data.continueGame || false;
        this.gridStateFromGameOver = data.gridState || null;
        this.events.on('resume', this.onSceneResume, this);
    }

    create() {
        this.add.image(this.game.config.width / 2, this.game.config.height / 2, 'background_kitchen').setDisplaySize(this.game.config.width, this.game.config.height);
        this.GRID_ROWS = 5;
        this.GRID_COLS = 5;
        this.CELL_SIZE = 100;
        this.GRID_START_X = (this.game.config.width - (this.GRID_COLS * this.CELL_SIZE)) / 2;
        this.GRID_START_Y = 320; 
        
        this.ingredientsGroup = this.add.group();
        
        this.sessionStartTime = Date.now();
        this.isSpawning = false;
        
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
        
        this.events.on('trashHover', this.onTrashHover, this);
        this.events.on('trashConfirm', this.onTrashConfirm, this);
        this.events.on('trashCancel', this.onTrashCancel, this);

        this.tapParticles = this.add.particles(0, 0, 'particle', {
            speed: { min: 80, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8, end: 0 },
            blendMode: 'ADD',
            lifespan: 300,
            emitting: false
        });
        this.tapParticles.setDepth(101);
        
        this.createGeneratorDock();
        
        // ИЗМЕНЕНИЕ: Логика восстановления и старта игры теперь не управляет очками напрямую
        if (this.shouldContinueFromGameOver && this.gridStateFromGameOver) {
            this.restoreAfterAd(this.gridStateFromGameOver);
        } else {
            const savedGrid = dataManager.getGridState();
            if (savedGrid && savedGrid.length > 0) {
                this.restoreGrid(savedGrid);
            } else {
                this.startNewGame();
            }
        }
        this.events.emit('updateScore', dataManager.getTotalScore()); 
        this.events.emit('updateCoins', dataManager.getCoins());
    }

    update(time, delta) {
        for (const generatorId in GENERATORS) {
            const state = dataManager.getGeneratorState(generatorId);
            const capacity = dataManager.getCurrentGeneratorValue(generatorId, 'capacity');
            
            if (state.charges < capacity) {
                // ИЗМЕНЕНИЕ: Получаем актуальный кулдаун из двухфазной системы
                const cooldown = dataManager.getGeneratorCooldown(generatorId);
                const now = Date.now();
                const timePassed = (now - state.lastChargeTimestamp) / 1000;

                if (timePassed >= cooldown) {
                    const chargesToAdd = Math.floor(timePassed / cooldown);
                    const newCharges = Math.min(capacity, state.charges + chargesToAdd);
                    
                    if (newCharges > state.charges) {
                        // ИЗМЕНЕНИЕ: Записываем, что произошла перезарядка
                        for(let i = 0; i < chargesToAdd; i++) {
                            dataManager.recordGeneratorRestart(generatorId);
                        }
                        
                        state.charges = newCharges;
                        state.lastChargeTimestamp += chargesToAdd * cooldown * 1000;
                        dataManager.setGeneratorState(generatorId, state);
                    }
                }
            }
            this.updateGeneratorIconVisuals(generatorId);
        }
    }

    onTrashHover(gameObject) {
        gameObject.setVisible(false);
        const uiScene = this.scene.get('UIScene');
        if (uiScene) {
            uiScene.showTrashConfirmationPanel(gameObject);
        }
    }

    onTrashConfirm(gameObject) {
        this.resetAllVisuals();
        this.handleTrashDrop(gameObject);
        const uiScene = this.scene.get('UIScene');
        if (uiScene) uiScene.playTrashAnimation();
    }

    onTrashCancel(gameObject) {
        gameObject.setVisible(true);
        this.resetAllVisuals();
        this.snapToGrid(gameObject);
        this.inputHandler.isActionPending = false;
    }

    createGeneratorDock() {
        this.generatorIcons = {};
        this.generatorDock = this.add.container(
            this.game.config.width / 2,
            this.GRID_START_Y + this.GRID_ROWS * this.CELL_SIZE + 80
        );
    
        const generatorIds = Object.keys(GENERATORS);
        const spacing = 180;
        const startX = -((generatorIds.length - 1) * spacing) / 2;
        const LONG_PRESS_DURATION = 600;
        const BASE_SCALE = 0.18;
        const INFLATED_SCALE = 0.25;
    
        generatorIds.forEach((id, index) => {
            const containerX = startX + index * spacing;
            const container = this.add.container(containerX, 0);
            container.setData('startX', containerX);

            const icon = this.add.image(0, 0, `icon_${id}`).setScale(BASE_SCALE).setInteractive();
            icon.setData('baseScale', BASE_SCALE);
            
            const chargesText = this.add.text(0, 65, '', { fontSize: '28px', fill: '#fff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
            const timerText = this.add.text(0, 65, '', { fontSize: '24px', fill: '#ffdd00', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setVisible(false);
    
            container.add([icon, chargesText, timerText]);
            this.generatorDock.add(container);
    
            this.generatorIcons[id] = { container, icon, chargesText, timerText };
    
            let pressTimer = null;

            const cancelAction = () => {
                if (pressTimer) {
                    pressTimer.remove();
                    pressTimer = null;
                }
                this.tweens.killTweensOf(icon);
                this.tweens.add({
                    targets: icon,
                    scale: icon.getData('baseScale'),
                    duration: 200,
                    ease: 'Back.easeOut'
                });
            };
    
            icon.on('pointerdown', () => {
                this.tweens.killTweensOf(icon);
                icon.setData('longPressTriggered', false);
                
                pressTimer = this.time.delayedCall(LONG_PRESS_DURATION, () => {
                    icon.setData('longPressTriggered', true);
                    this.onEnterGeneratorScene(id);
                });

                this.tweens.chain({
                    targets: icon,
                    tweens: [
                        { scale: BASE_SCALE * 0.9, duration: 80, ease: 'Quad.easeOut' },
                        { scale: INFLATED_SCALE, duration: LONG_PRESS_DURATION, ease: 'Quad.easeOut' }
                    ]
                });
            });
    
            icon.on('pointerup', () => {
                if (pressTimer && pressTimer.getRemaining() > 0) {
                    cancelAction();
                    this.onQuickCollect(id);
                }
            });
    
            icon.on('pointerout', () => {
                if (pressTimer && pressTimer.getRemaining() > 0) {
                    cancelAction();
                }
            });
        });
    }
    
    playTapAnimation(target, isSuccess) {
        this.tweens.killTweensOf(target);
        this.tweens.killTweensOf(target.parentContainer);

        if (isSuccess) {
            const worldPos = new Phaser.Math.Vector2();
            target.getWorldTransformMatrix().transformPoint(0, 0, worldPos);
            this.tapParticles.emitParticleAt(worldPos.x, worldPos.y, 10);

            this.tweens.chain({
                targets: target,
                tweens: [
                    { scale: target.getData('baseScale') * 0.85, duration: 80, ease: 'Quad.easeOut' },
                    { scale: target.getData('baseScale'), duration: 250, ease: 'Back.easeOut' }
                ]
            });
        } else { 
            target.setTintFill(0xff0000);
            this.time.delayedCall(150, () => target.clearTint());
            
            const startX = target.parentContainer.getData('startX');
            target.parentContainer.x = startX;
            
            this.tweens.add({
                targets: target.parentContainer,
                x: startX + 10,
                duration: 50,
                ease: 'Power1',
                yoyo: true,
                repeat: 3
            });

            this.tweens.add({
                targets: target,
                scale: target.getData('baseScale'),
                duration: 200,
                ease: 'Quad.easeOut'
            });
        }
    }

    onEnterGeneratorScene(generatorId) {
        this.sound.play('click');
        this.scene.pause();
        this.scene.launch('GeneratorScene', { id: generatorId });
    }

    onQuickCollect(generatorId) {
        if (this.isSpawning) return;
        const icon = this.generatorIcons[generatorId].icon;

        const emptyCell = this.gridManager.findEmptyCell();
        if (!emptyCell) {
            this.playTapAnimation(icon, false);
            return;
        }

        const state = dataManager.getGeneratorState(generatorId);
        if (state.charges <= 0) {
            this.playTapAnimation(icon, false);
            return;
        }
        
        this.playTapAnimation(icon, true);

        const capacity = dataManager.getCurrentGeneratorValue(generatorId, 'capacity');
        if (state.charges === capacity) {
            // ИЗМЕНЕНИЕ: Регистрируем начало нового цикла перезарядки
            dataManager.recordGeneratorRestart(generatorId);
            state.lastChargeTimestamp = Date.now();
        }
        state.charges--;
        dataManager.setGeneratorState(generatorId, state);

        this.isSpawning = true;
        
        const itemType = GENERATORS[generatorId].produces;
        const startPos = new Phaser.Math.Vector2();
        icon.getWorldTransformMatrix().transformPoint(0, 0, startPos);

        const tempSprite = this.add.sprite(startPos.x, startPos.y, itemType).setScale(0.5);
        tempSprite.setDepth(100);

        const targetX = this.GRID_START_X + emptyCell.x * this.CELL_SIZE + this.CELL_SIZE / 2;
        const targetY = this.GRID_START_Y + emptyCell.y * this.CELL_SIZE + this.CELL_SIZE / 2;

        this.tweens.add({
            targets: tempSprite,
            x: targetX,
            y: targetY,
            scale: (this.CELL_SIZE / tempSprite.width) * 0.9,
            duration: 400,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                tempSprite.destroy();
                this.createIngredient(emptyCell.x, emptyCell.y, itemType);
                this.updateGridSave();
                this.isSpawning = false;
            }
        });
    }

    updateGeneratorIconVisuals(generatorId) {
        const ui = this.generatorIcons[generatorId];
        if (!ui) return;

        const state = dataManager.getGeneratorState(generatorId);
        const capacity = dataManager.getCurrentGeneratorValue(generatorId, 'capacity');
        
        if (state.charges > 0) {
            ui.icon.clearTint();
            ui.chargesText.setText(`${state.charges}/${capacity}`).setVisible(true);
            ui.timerText.setVisible(false);
        } else {
            ui.icon.setTint(0x888888);
            ui.chargesText.setVisible(false);
            ui.timerText.setVisible(true);
            
            // ИЗМЕНЕНИЕ: Получаем актуальный кулдаун из двухфазной системы
            const cooldown = dataManager.getGeneratorCooldown(generatorId);
            const timePassed = (Date.now() - state.lastChargeTimestamp) / 1000;
            const timeRemaining = Math.max(0, cooldown - timePassed);
            const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
            const seconds = Math.floor(timeRemaining % 60).toString().padStart(2, '0');
            ui.timerText.setText(`${minutes}:${seconds}`);
        }
    }
    
    onSceneResume() {
        for (const id in this.generatorIcons) {
            const icon = this.generatorIcons[id].icon;
            const container = this.generatorIcons[id].container;
            
            this.tweens.killTweensOf(icon);
            this.tweens.killTweensOf(container);

            icon.setScale(icon.getData('baseScale'));
            container.x = container.getData('startX');

            this.updateGeneratorIconVisuals(id);
        }
        this.events.emit('updateCoins', dataManager.getCoins());
    }

    updateGridSave() {
        dataManager.setGridState(this.saveGridState());
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
        this.updateGridSave();
    }

    handleMerge(draggedObject, targetObject, recipe) {
        this.sound.play('merge');
        
        const sourceGridPos = { x: draggedObject.getData('gridX'), y: draggedObject.getData('gridY') };
        const targetGridPos = { x: targetObject.getData('gridX'), y: targetObject.getData('gridY') };

        const spatulaLevel = dataManager.getGadgetLevel('spatula');
        const knifeLevel = dataManager.getGadgetLevel('knife');
        const scoreBonus = 1 + (spatulaLevel * 0.1);
        const coinBonus = 1 + (knifeLevel * 0.1);
        const scoreToAdd = Math.round(recipe.score * scoreBonus);
        const coinsToAdd = Math.round(recipe.coins * coinBonus);
        
        // ИЗМЕНЕНИЕ: Начисляем очки через DataManager
        dataManager.addScore(scoreToAdd);
        dataManager.addCoins(coinsToAdd);
        this.events.emit('updateScore', dataManager.getTotalScore());
        this.events.emit('updateCoins', dataManager.getCoins());
        
        const isNewUnlock = dataManager.unlockIngredient(recipe.output);
        if (isNewUnlock) {
            this.sound.play('unlock');
            this.events.emit('newRecipeUnlocked', recipe.output);
        }

        this.gridManager.removeItem(sourceGridPos.x, sourceGridPos.y);
        this.gridManager.removeItem(targetGridPos.x, targetGridPos.y);

        const targetPixelX = targetObject.x;
        const targetPixelY = targetObject.y;

        this.tweens.add({
            targets: draggedObject,
            x: targetPixelX,
            y: targetPixelY,
            duration: 100,
            ease: 'Quad.easeIn',
            onComplete: () => {
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
                            speed: { min: 50, max: 150 }, angle: { min: 0, max: 360 },
                            scale: { start: 0.8, end: 0 }, blendMode: 'ADD',
                            lifespan: 300, tint: 0xffff00, emitting: false
                        });
                        emitter.explode(16);

                        const newIngredient = this.createIngredient(targetGridPos.x, targetGridPos.y, recipe.output);
                        const finalScale = newIngredient.scale;
                        newIngredient.setScale(0);

                        this.tweens.chain({
                            targets: newIngredient,
                            tweens: [
                                { scaleX: finalScale * 1.2, scaleY: finalScale * 0.8, duration: 150, ease: 'Quad.easeOut' },
                                { scaleX: finalScale, scaleY: finalScale, duration: 200, ease: 'Back.easeOut' }
                            ],
                             onComplete: () => {
                                this.updateGridSave();
                            }
                        });
                    }
                });
            }
        });
    }

    startNewGame() {
        // ИЗМЕНЕНИЕ: Очки больше не управляются сценой
        dataManager.startSessionTracking();
        // ИЗМЕНЕНИЕ: Увеличено количество стартовых предметов
        this.addCollectedItemsToGrid(TILE_TYPES.EGG, 4);
        this.addCollectedItemsToGrid(TILE_TYPES.TOMATO, 4);
        this.updateGridSave();
    }
    
    clearBoard() {
        this.sound.play('swoosh');
        const items = this.ingredientsGroup.getChildren();
        this.tweens.add({
            targets: items,
            scale: 0,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.ingredientsGroup.clear(true, true);
                this.gridManager.clear();
                this.startNewGame(); 
                this.events.emit('updateScore', dataManager.getTotalScore());
            }
        });
    }

    addCollectedItemsToGrid(itemType, count) {
        for (let i = 0; i < count; i++) {
            const emptyCell = this.gridManager.findEmptyCell();
            if (emptyCell) {
                this.createIngredient(emptyCell.x, emptyCell.y, itemType);
            } else {
                break;
            }
        }
        this.updateGridSave();
    }
    
    // ИЗМЕНЕНИЕ: Вся логика Game Over удалена
    // triggerGameOver() {}
    // checkGameOverConditions() {}
    // areGeneratorsEmpty() {}
    // checkForPossibleMoves() {}

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
    }

    restoreAfterAd(gridState) {
        this.restoreGrid(gridState);

        if (!this.gridManager.findEmptyCell()) {
            const cellsToClear = this.ingredientsGroup.getChildren().slice();
            Phaser.Utils.Array.Shuffle(cellsToClear);
            for (let i = 0; i < 3 && i < cellsToClear.length; i++) {
                const cell = cellsToClear[i];
                this.gridManager.removeItem(cell.getData('gridX'), cell.getData('gridY'));
                cell.destroy();
            }
        }
        
        for (const id in GENERATORS) {
            const state = dataManager.getGeneratorState(id);
            const capacity = dataManager.getCurrentGeneratorValue(id, 'capacity');
            state.charges = Math.min(capacity, state.charges + 3);
            dataManager.setGeneratorState(id, state);
        }
        dataManager.save(true);
        this.updateGridSave();
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

    findItemOnGrid(itemType) {
        const items = this.ingredientsGroup.getChildren();
        return items.some(item => item.getData('type') === itemType);
    }

    getFulfillableItemPosition(itemType) {
        const item = this.ingredientsGroup.getChildren().find(i => i.getData('type') === itemType);
        if (item) {
            return new Phaser.Math.Vector2(item.x, item.y);
        }
        return null;
    }

    removeItemByType(itemType) {
        const items = this.ingredientsGroup.getChildren();
        const itemToRemove = items.find(item => item.getData('type') === itemType);

        if (itemToRemove) {
            const gridX = itemToRemove.getData('gridX');
            const gridY = itemToRemove.getData('gridY');
            this.gridManager.removeItem(gridX, gridY);
            itemToRemove.destroy();
            this.updateGridSave();
            return true;
        }
        return false;
    }

    playItemFlyAnimation(itemType, startPos, endPos, onCompleteCallback) {
        this.removeItemByType(itemType);

        const tempSprite = this.add.sprite(startPos.x, startPos.y, itemType);
        tempSprite.setScale((this.CELL_SIZE / tempSprite.width) * 0.9);
        tempSprite.setDepth(200);

        this.tweens.add({
            targets: tempSprite,
            x: endPos.x,
            y: endPos.y,
            scale: 0.2,
            duration: 500,
            ease: 'Cubic.easeIn',
            onComplete: () => {
                tempSprite.destroy();
                onCompleteCallback();
            }
        });
    }

    handleTrashDrop(item) {
        const gridX = item.getData('gridX');
        const gridY = item.getData('gridY');
        
        this.gridManager.removeItem(gridX, gridY);
        
        this.sound.play('swoosh', { rate: 2.0 }); 
        
        this.tweens.add({
            targets: item,
            scale: 0,
            alpha: 0,
            duration: 200,
            onComplete: () => {
                item.destroy();
                this.updateGridSave();
            }
        });
    }

    highlightMergeTargets(itemType, draggedItem) {
        const items = this.ingredientsGroup.getChildren();
        
        items.forEach(item => {
            if (item === draggedItem) return;

            const recipe = this.mergeSystem.findRecipe(itemType, item.getData('type'));

            if (recipe) {
                this.tweens.add({
                    targets: item,
                    scaleX: item.getData('baseScale') * 1.15,
                    scaleY: item.getData('baseScale') * 1.15,
                    duration: 400,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            } else {
                item.setAlpha(0.6);
            }
        });
    }

    resetAllVisuals() {
        const items = this.ingredientsGroup.getChildren();
        items.forEach(item => {
            this.tweens.killTweensOf(item);
            item.setScale(item.getData('baseScale'));
            item.clearTint();
            item.setAlpha(1);
        });

        const uiScene = this.scene.get('UIScene');
        if (uiScene && uiScene.resetUIHighlights) {
            uiScene.resetUIHighlights();
        }
    }
}