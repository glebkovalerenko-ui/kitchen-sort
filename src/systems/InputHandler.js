// /src/systems/InputHandler.js

export default class InputHandler {
    constructor(scene) {
        this.scene = scene;
        this.draggedObject = null;
        this.isActionPending = false;

        this.scene.input.on('dragstart', this.onDragStart, this);
        this.scene.input.on('drag', this.onDrag, this);
        this.scene.input.on('dragend', this.onDragEnd, this);
    }

    onDragStart(pointer, gameObject) {
        this.draggedObject = gameObject;
        this.isActionPending = false;

        this.scene.sound.play('swoosh', { volume: 0.7 });
        this.scene.children.bringToTop(gameObject);
        
        gameObject.setScale(gameObject.getData('baseScale') * 1.15);

        const itemType = gameObject.getData('type');
        
        this.scene.highlightMergeTargets(itemType, gameObject);

        const uiScene = this.scene.scene.get('UIScene');
        if (uiScene) {
            uiScene.highlightMatchingOrders(itemType);
            uiScene.setTrashHighlight(true);
        }
    }
    
    onDrag(pointer, gameObject, dragX, dragY) {
        gameObject.setPosition(dragX, dragY);

        if (this.isActionPending) return;

        const uiScene = this.scene.scene.get('UIScene');
        if (!uiScene) return;

        // 1. Проверка наведения на корзину
        if (uiScene.checkOverlapWithTrash(pointer.x, pointer.y)) {
            this.isActionPending = true;
            this.scene.events.emit('trashHover', gameObject);
            return;
        }

        // 2. Проверка наведения на заказ
        const orderDropIndex = uiScene.checkOrderDrop(pointer.x, pointer.y, gameObject.getData('type'));
        if (orderDropIndex !== -1) {
            this.isActionPending = true;
            
            const gridX = gameObject.getData('gridX');
            const gridY = gameObject.getData('gridY');
            this.scene.gridManager.removeItem(gridX, gridY);
            this.scene.updateGridSave();
            
            uiScene.handleDragFulfill(orderDropIndex, gameObject);
        }
    }

    onDragEnd(pointer, gameObject) {
        // Если действие уже в процессе (например, ждем подтверждения удаления), ничего не делаем
        if (this.isActionPending) {
            this.draggedObject = null;
            return;
        }

        if (gameObject.active) {
            gameObject.setScale(gameObject.getData('baseScale')); 
            
            this.scene.resetMergeHighlights();

            const uiScene = this.scene.scene.get('UIScene');
            if (uiScene) {
                uiScene.resetHighlights(); 
                uiScene.setTrashHighlight(false);
            }

            const gridX = Math.floor((pointer.x - this.scene.GRID_START_X) / this.scene.CELL_SIZE);
            const gridY = Math.floor((pointer.y - this.scene.GRID_START_Y) / this.scene.CELL_SIZE);
            
            if (this.scene.gridManager.isValidGridPosition(gridX, gridY)) {
                 this.scene.handleDrop(gameObject, gridX, gridY);
            } else {
                 this.scene.snapToGrid(gameObject);
            }
        }
        
        this.draggedObject = null;
    }
}