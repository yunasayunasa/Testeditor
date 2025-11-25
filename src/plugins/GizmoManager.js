export default class GizmoManager {
    constructor(scene) {
        this.scene = scene;
        this.target = null;
        this.gizmoContainer = null;
        this.mode = 'move'; // 'move', 'rotate', 'scale'
        this.activeHandle = null;
    }

    setScene(scene) {
        this.scene = scene;
    }

    setMode(mode) {
        this.mode = mode;
        if (this.target) {
            this.refreshGizmos();
        }
    }

    setActiveTool(toolName) {
        // Map tool names to modes if necessary, or just pass through
        // 'hand' and 'rect' might need special handling or just be ignored by GizmoManager
        if (['move', 'rotate', 'scale'].includes(toolName)) {
            this.setMode(toolName);
        } else {
            // For 'hand' or 'rect', we might want to detach gizmos or switch to a different mode
            // For now, let's just detach gizmos if it's not a transform tool
            this.detach();
        }
    }

    attach(gameObject) {
        if (this.target === gameObject) return;
        this.detach();
        this.target = gameObject;
        this.createGizmos();
    }

    detach() {
        if (this.gizmoContainer) {
            this.gizmoContainer.destroy();
            this.gizmoContainer = null;
        }
        this.target = null;
        this.activeHandle = null;
    }

    refreshGizmos() {
        if (this.gizmoContainer) {
            this.gizmoContainer.destroy();
        }
        this.createGizmos();
    }

    createGizmos() {
        if (!this.scene || !this.target) return;

        this.gizmoContainer = this.scene.add.container(this.target.x, this.target.y);
        this.gizmoContainer.setDepth(99999); // Always on top

        if (this.mode === 'move') {
            this.createMoveGizmo();
        } else if (this.mode === 'rotate') {
            this.createRotateGizmo();
        } else if (this.mode === 'scale') {
            this.createScaleGizmo();
        }
        
        // Update loop to follow target
        this.scene.events.on('update', this.update, this);
    }

    createMoveGizmo() {
        const arrowLength = 80;
        const arrowSize = 15;

        // X Axis (Red)
        const lineX = this.scene.add.line(0, 0, 0, 0, arrowLength, 0, 0xff0000).setOrigin(0, 0);
        const arrowX = this.scene.add.triangle(arrowLength, 0, 0, -arrowSize/2, arrowSize, 0, 0, arrowSize/2, 0xff0000);
        arrowX.setInteractive({ draggable: true, useHandCursor: true });
        arrowX.setData('axis', 'x');
        arrowX.setData('type', 'move');
        this.setupHandleEvents(arrowX);

        // Y Axis (Green)
        const lineY = this.scene.add.line(0, 0, 0, 0, 0, arrowLength, 0x00ff00).setOrigin(0, 0);
        const arrowY = this.scene.add.triangle(0, arrowLength, -arrowSize/2, 0, 0, arrowSize, arrowSize/2, 0, 0x00ff00);
        arrowY.setInteractive({ draggable: true, useHandCursor: true });
        arrowY.setData('axis', 'y');
        arrowY.setData('type', 'move');
        this.setupHandleEvents(arrowY);

        // Center (Yellow) - Free move
        const center = this.scene.add.rectangle(0, 0, 15, 15, 0xffff00);
        center.setInteractive({ draggable: true, useHandCursor: true });
        center.setData('axis', 'xy');
        center.setData('type', 'move');
        this.setupHandleEvents(center);

        this.gizmoContainer.add([lineX, arrowX, lineY, arrowY, center]);
    }

    createRotateGizmo() {
        const radius = 60;
        const ring = this.scene.add.circle(0, 0, radius).setStrokeStyle(4, 0x0000ff);
        ring.setInteractive({ draggable: true, useHandCursor: true });
        ring.setData('type', 'rotate');
        this.setupHandleEvents(ring);
        
        // Visual indicator for current rotation
        const line = this.scene.add.line(0, 0, 0, 0, radius, 0, 0xffff00);
        line.rotation = this.target.rotation;
        
        this.gizmoContainer.add([ring, line]);
    }

    createScaleGizmo() {
        const lineLength = 80;
        const boxSize = 12;

        // X Axis (Red)
        const lineX = this.scene.add.line(0, 0, 0, 0, lineLength, 0, 0xff0000).setOrigin(0, 0);
        const boxX = this.scene.add.rectangle(lineLength, 0, boxSize, boxSize, 0xff0000);
        boxX.setInteractive({ draggable: true, useHandCursor: true });
        boxX.setData('axis', 'x');
        boxX.setData('type', 'scale');
        this.setupHandleEvents(boxX);

        // Y Axis (Green)
        const lineY = this.scene.add.line(0, 0, 0, 0, 0, lineLength, 0x00ff00).setOrigin(0, 0);
        const boxY = this.scene.add.rectangle(0, lineLength, boxSize, boxSize, 0x00ff00);
        boxY.setInteractive({ draggable: true, useHandCursor: true });
        boxY.setData('axis', 'y');
        boxY.setData('type', 'scale');
        this.setupHandleEvents(boxY);

        // Uniform Scale (Center)
        const center = this.scene.add.rectangle(0, 0, 15, 15, 0xffff00);
        center.setInteractive({ draggable: true, useHandCursor: true });
        center.setData('axis', 'xy');
        center.setData('type', 'scale');
        this.setupHandleEvents(center);

        this.gizmoContainer.add([lineX, boxX, lineY, boxY, center]);
    }

    setupHandleEvents(handle) {
        handle.on('dragstart', (pointer) => {
            this.activeHandle = handle;
            this.scene.input.setDraggable(this.target, false); // Disable target dragging
            
            // Store initial values
            handle.setData('startX', pointer.x);
            handle.setData('startY', pointer.y);
            handle.setData('initialTargetX', this.target.x);
            handle.setData('initialTargetY', this.target.y);
            handle.setData('initialRotation', this.target.rotation);
            handle.setData('initialScaleX', this.target.scaleX);
            handle.setData('initialScaleY', this.target.scaleY);
        });

        handle.on('drag', (pointer) => {
            this.onDrag(pointer, handle);
        });

        handle.on('dragend', () => {
            this.activeHandle = null;
            if (this.target && this.target.input) {
                this.scene.input.setDraggable(this.target, true); // Re-enable target dragging
            }
        });
    }

    onDrag(pointer, handle) {
        if (!this.target) return;

        const type = handle.getData('type');
        const axis = handle.getData('axis');
        const camera = this.scene.cameras.main;
        const zoom = camera.zoom;

        if (type === 'move') {
            const dx = (pointer.x - handle.getData('startX')) / zoom;
            const dy = (pointer.y - handle.getData('startY')) / zoom;
            
            if (axis === 'x' || axis === 'xy') {
                this.target.x = handle.getData('initialTargetX') + dx;
            }
            if (axis === 'y' || axis === 'xy') {
                this.target.y = handle.getData('initialTargetY') + dy;
            }
            
            // Update physics body if exists
            if (this.target.body) {
                // Matter.js body update (simplified)
                this.target.body.position.x = this.target.x;
                this.target.body.position.y = this.target.y;
            }

        } else if (type === 'rotate') {
            const startAngle = Phaser.Math.Angle.Between(this.target.x, this.target.y, handle.getData('startX'), handle.getData('startY'));
            const currentAngle = Phaser.Math.Angle.Between(this.target.x, this.target.y, pointer.x, pointer.y);
            const diff = currentAngle - startAngle;
            
            this.target.rotation = handle.getData('initialRotation') + diff;

        } else if (type === 'scale') {
            const startDistX = Math.abs(handle.getData('startX') - this.target.x);
            const startDistY = Math.abs(handle.getData('startY') - this.target.y);
            const currentDistX = Math.abs(pointer.x - this.target.x);
            const currentDistY = Math.abs(pointer.y - this.target.y);

            if (axis === 'x' || axis === 'xy') {
                const scaleFactor = startDistX > 0 ? currentDistX / startDistX : 1;
                this.target.scaleX = handle.getData('initialScaleX') * scaleFactor;
            }
            if (axis === 'y' || axis === 'xy') {
                const scaleFactor = startDistY > 0 ? currentDistY / startDistY : 1;
                this.target.scaleY = handle.getData('initialScaleY') * scaleFactor;
            }
        }

        this.update();
    }

    update() {
        if (this.target && this.gizmoContainer && !this.target.active) {
            this.detach(); // Target destroyed
            return;
        }

        if (this.target && this.gizmoContainer) {
            this.gizmoContainer.x = this.target.x;
            this.gizmoContainer.y = this.target.y;
            
            // Keep gizmo size constant regardless of zoom
            const camera = this.scene.cameras.main;
            this.gizmoContainer.setScale(1 / camera.zoom);
            
            if (this.mode === 'rotate') {
                // Update rotation visual
            }
        }
    }
}
