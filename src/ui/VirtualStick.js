// src/ui/VirtualStick.js (自己update方式・最終完成版)

const Container = Phaser.GameObjects.Container;
const Graphics = Phaser.GameObjects.Graphics;
const Circle = Phaser.Geom.Circle;
const Vector2 = Phaser.Math.Vector2;

export default class VirtualStick extends Container {
    static dependencies = [];

    constructor(scene, config) {
        super(scene, config.x || 150, config.y || 550);
        
        this.pointer = null; // このスティックを操作しているポインターへの参照
        this.baseRadius = 100;
        this.stickRadius = 50;
        this.direction = new Vector2(0, 0);

        const base = new Graphics(scene).fillStyle(0x888888, 0.5).fillCircle(0, 0, this.baseRadius);
        this.stick = new Graphics(scene).fillStyle(0xcccccc, 0.8).fillCircle(0, 0, this.stickRadius);
        this.add([base, this.stick]);
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが、最も信頼性の高い入力処理です ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // --- 1. 当たり判定とインタラクティブ化 ---
        base.setInteractive(new Circle(0, 0, this.baseRadius), Circle.Contains);
        this.setScrollFactor(0).setAlpha(0.7);

        // --- 2. 押された時に、そのポインターを「所有」する ---
        base.on('pointerdown', (pointer) => {
            // 既に誰かが所有していたら何もしない（ほぼあり得ないが安全のため）
            if (this.pointer) return;
            this.pointer = pointer;
        });
        
        // --- 3. シーン全体のupを監視して、所有権を解放する ---
        // これにより、スティックの外で指を離してもリセットされる
        this.scene.input.on('pointerup', (pointer) => {
            // このスティックを所有していたポインターが離された場合のみ
            if (this.pointer && this.pointer.id === pointer.id) {
                this.pointer = null; // 所有権を解放
                this.reset();
            }
        });
        
        // --- 4. シーンに自身を更新リストに追加するよう依頼 ---
        // これにより、このオブジェクトのupdateメソッドが毎フレーム呼ばれる
        this.scene.add.existing(this);
    }

    // ★★★ 毎フレーム自動的に呼ばれるupdateメソッド ★★★
    update() {
        // ポインターを所有している間だけ、位置を更新し続ける
        if (this.pointer && this.pointer.isDown) {
            this.updateStickPosition();
        }
    }

    updateStickPosition() {
        const localX = this.pointer.x - this.x;
        const localY = this.pointer.y - this.y;
        const vec = new Vector2(localX, localY);
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
    // ...

    get isUp() { return this.direction.y < -0.5; }
    get isDown() { return this.direction.y > 0.5; }
}