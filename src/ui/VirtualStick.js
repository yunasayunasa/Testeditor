// src/ui/VirtualStick.js (純粋表示部品・最終完成版)

const Graphics = Phaser.GameObjects.Graphics;
const Vector2 = Phaser.Math.Vector2;

export default class VirtualStick extends Phaser.GameObjects.Container {
    
    constructor(scene, config) {
        super(scene, config.x || 0, config.y || 0);

        this.baseRadius = 100;
        this.stickRadius = 50;
        this.direction = new Vector2(0, 0);
        this.basePosition = new Vector2(config.x || 150, config.y || 550); // デフォルト位置

        this.base = new Graphics(scene).fillStyle(0x888888, 0.5).fillCircle(0, 0, this.baseRadius);
        this.stick = new Graphics(scene).fillStyle(0xcccccc, 0.8).fillCircle(0, 0, this.stickRadius);
        this.add([this.base, this.stick]);
        
        this.setScrollFactor(0);
        this.setAlpha(0); // ★ 最初は透明にしておく
    }

    /** JumpSceneから呼ばれる: スティックを表示して、操作を開始する */
    show(x, y) {
        this.setPosition(x, y); // タッチされた位置に移動
        this.setAlpha(1);
    }
    
    /** JumpSceneから呼ばれる: ノブの位置を更新する */
    updatePosition(pointer) {
        const localX = pointer.x - this.x;
        const localY = pointer.y - this.y;
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
    
    /** JumpSceneから呼ばれる: 指が離れたので、非表示にして状態をリセット */
    hideAndReset() {
        this.setAlpha(0);
        this.setPosition(this.basePosition.x, this.basePosition.y); // デフォルト位置に戻す
        this.stick.setPosition(0, 0);
        this.direction.setTo(0, 0);
    }
}