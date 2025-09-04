// src/ui/VirtualStick.js (新規作成)

const Container = Phaser.GameObjects.Container;
const Image = Phaser.GameObjects.Image;

export default class VirtualStick extends Container {
    constructor(scene, config) {
        super(scene, config.x, config.y);
        this.base = new Image(scene, 0, 0, config.texture_base);
        this.stick = new Image(scene, 0, 0, config.texture_stick);
        this.add([this.base, this.stick]);
        scene.add.existing(this);
        
        this.isDown = false;
        this.direction = { x: 0, y: 0 };
        this.angle = 0;
        
        this.setInteractive(new Phaser.Geom.Circle(0, 0, this.base.width / 2), Phaser.Geom.Circle.Contains);
        this.setScrollFactor(0);
        
        this.on('pointerdown', this.onPointerDown, this);
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);
        
        this.scene.events.on('shutdown', this.destroy, this);
    }
    onPointerDown(pointer) { this.isDown = true; this.updateStickPosition(pointer); }
    onPointerMove(pointer) { if (this.isDown) this.updateStickPosition(pointer); }
    onPointerUp(pointer) {
        this.isDown = false;
        this.stick.setPosition(0, 0);
        this.direction = { x: 0, y: 0 };
        this.angle = 0;
    }
    updateStickPosition(pointer) {
        const localPoint = this.getLocalPoint(pointer.x, pointer.y);
        const distance = Phaser.Math.Distance.Between(0, 0, localPoint.x, localPoint.y);
        const maxDistance = this.base.width / 2 - this.stick.width / 4;
        if (distance > maxDistance) {
            const scale = maxDistance / distance;
            this.stick.setPosition(localPoint.x * scale, localPoint.y * scale);
        } else {
            this.stick.setPosition(localPoint.x, localPoint.y);
        }
        this.direction.x = Phaser.Math.Clamp(this.stick.x / maxDistance, -1, 1);
        this.direction.y = Phaser.Math.Clamp(this.stick.y / maxDistance, -1, 1);
        this.angle = Phaser.Math.RadToDeg(Math.atan2(this.stick.y, this.stick.x));
    }
    get isLeft() { return this.direction.x < -0.5; }
    get isRight() { return this.direction.x > 0.5; }
    get isUp() { return this.direction.y < -0.5; }
    get isDown() { return this.direction.y > 0.5; }
    destroy() {
        this.scene.input.off('pointermove', this.onPointerMove, this);
        this.scene.input.off('pointerup', this.onPointerUp, this);
        super.destroy();
    }
}