//
// Odyssey Engine - VirtualStick Component
// Final Audited Version: Self-Contained Smart Component
//

const Container = Phaser.GameObjects.Container;
const Graphics = Phaser.GameObjects.Graphics;
const Circle = Phaser.Geom.Circle;
const Vector2 = Phaser.Math.Vector2;

export default class VirtualStick extends Container {
    static dependencies = [];

    constructor(scene, config) {
        super(scene, config.x || 150, config.y || 550);

        this.pointerId = null;
        this.baseRadius = 100;
        this.stickRadius = 50;
        this.direction = new Vector2(0, 0);

        const base = new Graphics(scene).fillStyle(0x888888, 0.5).fillCircle(0, 0, this.baseRadius);
        this.stick = new Graphics(scene).fillStyle(0xcccccc, 0.8).fillCircle(0, 0, this.stickRadius);
        this.add([base, this.stick]);
        
        base.setInteractive(new Circle(0, 0, this.baseRadius), Circle.Contains);
        this.setScrollFactor(0);

        base.on('pointerdown', (pointer) => {
            if (this.pointerId === null) {
                this.pointerId = pointer.id;
            }
        });

        this.scene.input.on('pointermove', (pointer) => {
            if (pointer.id === this.pointerId) {
                this.updateStickPosition(pointer);
            }
        });
        this.scene.input.on('pointerup', (pointer) => {
            if (pointer.id === this.pointerId) {
                this.pointerId = null;
                this.reset();
            }
        });

        this.scene.events.on('shutdown', () => {
             if (this.scene && this.scene.input) {
                this.scene.input.off('pointermove');
                this.scene.input.off('pointerup');
             }
        }, this);

        scene.add.existing(this);
    }

    updateStickPosition(pointer) {
        const localX = pointer.x - this.x;
        const localY = pointer.y - this.y;
        const vec = new Vector2(localX, localY);
        const distance = vec.length();

        if (distance > this.baseRadius) vec.normalize().scale(this.baseRadius);

        this.stick.setPosition(vec.x, vec.y);
        this.direction.x = Phaser.Math.Clamp(vec.x / this.baseRadius, -1, 1);
        this.direction.y = Phaser.Math.Clamp(vec.y / this.baseRadius, -1, 1);
    }

    reset() {
        this.stick.setPosition(0, 0);
        this.direction.setTo(0, 0);
    }
}