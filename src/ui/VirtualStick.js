// src/ui/VirtualStick.js (グローバルオブジェクト版・最終完成版)

// ★★★ import文は全て削除 ★★★

// ★ Phaserのグローバルオブジェクトからクラスを取得
const Container = Phaser.GameObjects.Container;
const Graphics = Phaser.GameObjects.Graphics;
const Circle = Phaser.Geom.Circle;
const Vector2 = Phaser.Math.Vector2;

export default class VirtualStick extends Container {
    // ★★★ 規約のために、空のdependenciesを定義しておく ★★★
    static dependencies = [];

    constructor(scene, config) {
        super(scene, config.x || 150, config.y || 550);

        this.baseRadius = 100;
        this.stickRadius = 50;
        this.direction = new Vector2(0, 0);

        const base = new Graphics(scene).fillStyle(0x888888, 0.5).fillCircle(0, 0, this.baseRadius);
        this.stick = new Graphics(scene).fillStyle(0xcccccc, 0.8).fillCircle(0, 0, this.stickRadius);
        this.add([base, this.stick]);
        
        base.setInteractive(new Circle(0, 0, this.baseRadius), Circle.Contains);
        scene.input.setDraggable(base);

        this.setScrollFactor(0);
        this.setAlpha(0.7);

        base.on('drag', (pointer, dragX, dragY) => {
            const vec = new Vector2(dragX, dragY);
            this.updatePositionWithVector(vec);
        });
        base.on('dragend', (pointer) => {
            this.reset();
        });
    }

    updatePositionWithVector(vec) {
        const distance = vec.length();
        const maxDistance = this.baseRadius;
        if (distance > maxDistance) vec.normalize().scale(maxDistance);
        this.stick.setPosition(vec.x, vec.y);
        
        if (maxDistance > 0) {
            this.direction.x = Phaser.Math.Clamp(vec.x / maxDistance, -1, 1);
            this.direction.y = Phaser.Math.Clamp(vec.y / maxDistance, -1, 1);
        }
    }

    reset() {
        this.stick.setPosition(0, 0);
        this.direction.setTo(0, 0);
    }
    
    get isLeft() { return this.direction.x < -0.5; }
    get isRight() { return this.direction.x > 0.5; }
    get isUp() { return this.direction.y < -0.5; }
    get isDown() { return this.direction.y > 0.5; }
}