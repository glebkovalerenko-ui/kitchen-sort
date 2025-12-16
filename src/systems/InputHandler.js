// /src/systems/InputHandler.js

export default class InputHandler {
    constructor(scene) {
        this.scene = scene;

        this.scene.input.on('dragstart', this.onDragStart, this);
        this.scene.input.on('drag', this.onDrag, this);
        this.scene.input.on('dragend', this.onDragEnd, this);
    }

    onDragStart(pointer, gameObject) {
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
    }

    onDragEnd(pointer, gameObject) {
        if (!gameObject.scene) return;
        
        gameObject.setScale(gameObject.getData('baseScale')); 

        this.scene.resetMergeHighlights();

        const uiScene = this.scene.scene.get('UIScene');
        if (uiScene) {
            uiScene.resetHighlights(); 
            uiScene.setTrashHighlight(false);
        }

        // ПРОВЕРКА ДРОПА В UI (ЗАКАЗЫ)
        let orderDropIndex = -1;
        if (uiScene) {
            // Передаем координаты указателя напрямую, так как UI использует глобальную проверку
            orderDropIndex = uiScene.checkOrderDrop(pointer.x, pointer.y, gameObject.getData('type'));
        }

        if (orderDropIndex !== -1) {
            const gridX = gameObject.getData('gridX');
            const gridY = gameObject.getData('gridY');
            
            // Удаляем из логики сетки
            this.scene.gridManager.removeItem(gridX, gridY);
            this.scene.updateGridSave();
            
            // Передаем визуальный объект в UI для анимации уничтожения
            uiScene.handleDragFulfill(orderDropIndex, gameObject);
            return;
        }

        // ПРОВЕРКА ДРОПА В КОРЗИНУ
        if (uiScene && uiScene.checkOverlapWithTrash(pointer.x, pointer.y)) {
             this.scene.handleTrashDrop(gameObject);
             uiScene.playTrashAnimation();
             return;
        }

        // ДРОП В СЕТКУ (GAME SCENE)
        const gridX = Math.floor((pointer.x - this.scene.GRID_START_X) / this.scene.CELL_SIZE);
        const gridY = Math.floor((pointer.y - this.scene.GRID_START_Y) / this.scene.CELL_SIZE);
        
        if (this.scene.gridManager.isValidGridPosition(gridX, gridY)) {
             this.scene.handleDrop(gameObject, gridX, gridY);
        } else {
             this.scene.snapToGrid(gameObject);
        }
    }
}