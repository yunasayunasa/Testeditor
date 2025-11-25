
export default class GizmoManager {
    constructor(plugin) {
        this.plugin = plugin;
        this.scene = null;
        this.editorPlugin = null;
        this.activeTool = 'select'; // select, move, rotate, scale
        this.attachedObject = null;
        
        this.gizmoContainer = null;
        this.graphics = null;
        
        this.dragState = {
            isDragging: false,
            axis: null, // 'x', 'y', 'xy', 'rotate', 'scaleX', 'scaleY', 'scaleUniform'
            startX: 0,
            startY: 0,
            initialObjectX: 0,
            initialObjectY: 0,
            initialObjectAngle: 0,
            initialObjectScaleX: 1,
            initialObjectScaleY: 1
        };

        this.handleSize = 100;
        this.hitSize = 20;
    }

    setScene(scene) {
        this.scene = scene;
        if (this.gizmoContainer) {
            this.gizmoContainer.destroy();
        }
        if (this.scene) {
            this.gizmoContainer = this.scene.add.container(0, 0);
            this.gizmoContainer.setDepth(99999); // Topmost
            this.graphics = this.scene.add.graphics();
            this.gizmoContainer.add(this.graphics);
            this.redrawGizmos();
        }
    }

    setActiveTool(tool) {
        this.activeTool = tool;
        this.redrawGizmos();
    }

    attach(object) {
        this.attachedObject = object;
        this.redrawGizmos();
    }

    detach() {
        this.attachedObject = null;
        if (this.gizmoContainer) {
            this.gizmoContainer.setVisible(false);
        }
    }

    update() {
        if (!this.scene || !this.gizmoContainer) return;

        if (this.attachedObject && this.attachedObject.active) {
            this.gizmoContainer.setVisible(true);
            this.gizmoContainer.setPosition(this.attachedObject.x, this.attachedObject.y);
            this.gizmoContainer.setRotation(this.attachedObject.rotation);
            
            // Keep gizmo size constant relative to camera zoom?
            // For now, let's just keep it simple.
        } else {
            this.gizmoContainer.setVisible(false);
        }
    }

    redrawGizmos() {
        if (!this.graphics || !this.gizmoContainer) return;
        this.graphics.clear();
        
        if (!this.attachedObject || this.activeTool === 'select') {
            this.gizmoContainer.setVisible(false);
            return;
        }

        this.gizmoContainer.setVisible(true);
        const size = this.handleSize;
        const arrowSize = 15;

        // Reset rotation for move/scale to be axis aligned? 
        // Unity move gizmo is usually world aligned or local aligned.
        // Let's stick to local for now as it's easier with container rotation.
        
        if (this.activeTool === 'move') {
            // X Axis (Red)
            this.graphics.lineStyle(4, 0xff0000);
            this.graphics.beginPath();
            this.graphics.moveTo(0, 0);
            this.graphics.lineTo(size, 0);
            this.graphics.strokePath();
            this.graphics.fillStyle(0xff0000);
            this.graphics.fillTriangle(size, 0, size - arrowSize, -arrowSize/2, size - arrowSize, arrowSize/2);

            // Y Axis (Green)
            this.graphics.lineStyle(4, 0x00ff00);
            this.graphics.beginPath();
            this.graphics.moveTo(0, 0);
            this.graphics.lineTo(0, size);
            this.graphics.strokePath();
            this.graphics.fillStyle(0x00ff00);
            this.graphics.fillTriangle(0, size, -arrowSize/2, size - arrowSize, arrowSize/2, size - arrowSize);
            
            // Center (XY Plane)
            this.graphics.fillStyle(0x0000ff, 0.5);
            this.graphics.fillRect(0, 0, 20, 20);

        } else if (this.activeTool === 'rotate') {
            // Circle (Blue)
            this.graphics.lineStyle(4, 0x0000ff);
            this.graphics.strokeCircle(0, 0, size);
            this.graphics.fillStyle(0x0000ff, 0.1);
            this.graphics.fillCircle(0, 0, size);

        } else if (this.activeTool === 'scale') {
             // X Axis (Red)
            this.graphics.lineStyle(4, 0xff0000);
            this.graphics.beginPath();
            this.graphics.moveTo(0, 0);
            this.graphics.lineTo(size, 0);
            this.graphics.strokePath();
            this.graphics.fillStyle(0xff0000);
            this.graphics.fillRect(size - 10, -5, 10, 10);

            // Y Axis (Green)
            this.graphics.lineStyle(4, 0x00ff00);
            this.graphics.beginPath();
            this.graphics.moveTo(0, 0);
            this.graphics.lineTo(0, size);
            this.graphics.strokePath();
            this.graphics.fillStyle(0x00ff00);
            this.graphics.fillRect(-5, size - 10, 10, 10);
            
             // Center (Uniform)
            this.graphics.fillStyle(0xaaaaaa, 0.5);
            this.graphics.fillRect(-10, -10, 20, 20);
        }
    }

    onPointerDown(pointer) {
        if (!this.attachedObject || !this.gizmoContainer || !this.gizmoContainer.visible) return false;

        // Transform pointer to local space of gizmo container
        // Note: Container rotation affects this.
        const localPoint = this.gizmoContainer.pointToContainer(pointer);
        const x = localPoint.x;
        const y = localPoint.y;
        const size = this.handleSize;
        const hit = this.hitSize;

        this.dragState.axis = null;

        if (this.activeTool === 'move') {
            // Check Center
            if (x >= 0 && x <= hit && y >= 0 && y <= hit) this.dragState.axis = 'xy';
            // Check X
            else if (x >= 0 && x <= size + hit && Math.abs(y) <= hit) this.dragState.axis = 'x';
            // Check Y
            else if (y >= 0 && y <= size + hit && Math.abs(x) <= hit) this.dragState.axis = 'y';

        } else if (this.activeTool === 'rotate') {
            const dist = Math.sqrt(x*x + y*y);
            if (Math.abs(dist - size) <= hit) this.dragState.axis = 'rotate';

        } else if (this.activeTool === 'scale') {
             // Check Center
            if (Math.abs(x) <= hit && Math.abs(y) <= hit) this.dragState.axis = 'scaleUniform';
            // Check X
            else if (x >= 0 && x <= size + hit && Math.abs(y) <= hit) this.dragState.axis = 'scaleX';
            // Check Y
            else if (y >= 0 && y <= size + hit && Math.abs(x) <= hit) this.dragState.axis = 'scaleY';
        }

        if (this.dragState.axis) {
            this.dragState.isDragging = true;
            this.dragState.startX = pointer.worldX;
            this.dragState.startY = pointer.worldY;
            this.dragState.initialObjectX = this.attachedObject.x;
            this.dragState.initialObjectY = this.attachedObject.y;
            this.dragState.initialObjectAngle = this.attachedObject.angle;
            this.dragState.initialObjectScaleX = this.attachedObject.scaleX;
            this.dragState.initialObjectScaleY = this.attachedObject.scaleY;
            
            // Disable camera pan/zoom while dragging gizmo
            this.scene.input.setTopOnly(true); // Ensure we consume the event
            return true; // Consumed
        }
        return false;
    }

    onPointerMove(pointer) {
        if (!this.dragState.isDragging || !this.attachedObject) return false;

        const dx = pointer.worldX - this.dragState.startX;
        const dy = pointer.worldY - this.dragState.startY;

        // For local transformations, we might need to project dx/dy onto local axes.
        // But for now, let's implement World Space Move and Local Space Rotate/Scale?
        // Actually, container is rotated, so localPoint logic in PointerDown was local.
        // But dx/dy here are world.
        
        // Let's keep it simple: Move is World Space for now (even if gizmo is rotated, which is confusing).
        // If gizmo rotates with object, Move X should move along object's Right vector.
        
        const radians = this.attachedObject.rotation;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        
        // Project world dx/dy to local dx/dy
        const localDx = dx * cos + dy * sin;
        const localDy = -dx * sin + dy * cos;

        if (this.activeTool === 'move') {
            if (this.dragState.axis === 'xy') {
                this.attachedObject.x = this.dragState.initialObjectX + dx;
                this.attachedObject.y = this.dragState.initialObjectY + dy;
            } else if (this.dragState.axis === 'x') {
                // Move along local X axis
                this.attachedObject.x = this.dragState.initialObjectX + localDx * cos;
                this.attachedObject.y = this.dragState.initialObjectY + localDx * sin;
            } else if (this.dragState.axis === 'y') {
                // Move along local Y axis
                this.attachedObject.x = this.dragState.initialObjectX - localDy * sin;
                this.attachedObject.y = this.dragState.initialObjectY + localDy * cos;
            }
        } else if (this.activeTool === 'rotate') {
             // Calculate angle from center
             const centerX = this.attachedObject.x;
             const centerY = this.attachedObject.y;
             const startAngle = Phaser.Math.Angle.Between(centerX, centerY, this.dragState.startX, this.dragState.startY);
             const currentAngle = Phaser.Math.Angle.Between(centerX, centerY, pointer.worldX, pointer.worldY);
             const deltaAngle = Phaser.Math.RadToDeg(currentAngle - startAngle);
             this.attachedObject.setAngle(this.dragState.initialObjectAngle + deltaAngle);

        } else if (this.activeTool === 'scale') {
            // Scale is tricky because it depends on initial scale
            // Simple implementation:
            const scaleFactor = 0.01;
            if (this.dragState.axis === 'scaleUniform') {
                 // Use distance from center or just dx+dy
                 const delta = localDx + localDy; // rough approximation
                 const s = Math.max(0.1, this.dragState.initialObjectScaleX + delta * scaleFactor);
                 this.attachedObject.setScale(s);
            } else if (this.dragState.axis === 'scaleX') {
                const s = Math.max(0.1, this.dragState.initialObjectScaleX + localDx * scaleFactor);
                this.attachedObject.scaleX = s;
            } else if (this.dragState.axis === 'scaleY') {
                const s = Math.max(0.1, this.dragState.initialObjectScaleY + localDy * scaleFactor);
                this.attachedObject.scaleY = s;
            }
        }
        
        // Update Gizmo position
        this.update();
        
        // Notify Plugin to update Inspector
        if (this.plugin) {
            this.plugin.updatePropertyPanel();
        }

        return true;
    }

    onPointerUp(pointer) {
        if (this.dragState.isDragging) {
            this.dragState.isDragging = false;
            this.dragState.axis = null;
            return true;
        }
        return false;
    }
}
