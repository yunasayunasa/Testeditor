// src/ui/VirtualStick.js (固定式・純粋表示部品・最終完成版)

const Graphics = Phaser.GameObjects.Graphics;
const Vector2 = Phaser.Math.Vector2;

export default class VirtualStick extends Phaser.GameObjects.Container {
    
    constructor(scene, config) {
        // ★★★ configで渡された固定位置に表示する ★★★
        super(scene, config.x || 150, config.y || 550);

        this.baseRadius = 100;
        this.stickRadius = 50;
        this.direction = new Vector2(0, 0);

      // --- 見た目の作成 ---
    const base = new Graphics(scene).fillStyle(0x888888, 0.5).fillCircle(0, 0, this.baseRadius);
        this.stick = new Graphics(scene).fillStyle(0xcccccc, 0.8).fillCircle(0, 0, this.stickRadius);
        this.add([base, this.stick]);
        
        // ★★★ 当たり判定をbaseグラフィックに設定 ★★★
        base.setInteractive(new Circle(0, 0, this.baseRadius), Circle.Contains);
        // ★ ドラッグ可能にするのはbase
        scene.input.setDraggable(base);

        this.setScrollFactor(0);
        this.setAlpha(0.7);

        // ★★★ baseのdragイベントをリッスンする ★★★
        base.on('drag', (pointer, dragX, dragY) => {
            const vec = new Vector2(dragX, dragY);
        this.updatePositionWithVector(vec);
    });
    base.on('dragend', (pointer) => {
        this.reset();
    });
}

// メソッド名を変更して役割を明確化
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
}}