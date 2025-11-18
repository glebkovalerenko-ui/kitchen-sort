// /src/systems/InputHandler.js

export default class InputHandler {
    constructor(scene) {
        this.scene = scene;

        this.scene.input.on('dragstart', this.onDragStart, this);
        this.scene.input.on('drag', this.onDrag, this);
        this.scene.input.on('dragend', this.onDragEnd, this);
    }

    onDragStart(pointer, gameObject) {
        this.scene.sound.play('swoosh_sfx', { volume: 0.7 });
        this.scene.children.bringToTop(gameObject);
        gameObject.setScale(gameObject.getData('baseScale') * 1.1);
    }
    
    onDrag(pointer, gameObject, dragX, dragY) {
        gameObject.setPosition(dragX, dragY);
    }

    onDragEnd(pointer, gameObject) {
        if (!gameObject.scene) return;
        gameObject.setScale(gameObject.getData('baseScale')); 
        
        const gridX = Math.floor((pointer.x - this.scene.GRID_START_X) / this.scene.CELL_SIZE);
        const gridY = Math.floor((pointer.y - this.scene.GRID_START_Y) / this.scene.CELL_SIZE);
        
        // Просто сообщаем главной сцене, что произошло событие
        this.scene.handleDrop(gameObject, gridX, gridY);
    }
}