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
        this.base = new Graphics(scene).fillStyle(0x888888, 0.5).fillCircle(0, 0, this.baseRadius);
        this.stick = new Graphics(scene).fillStyle(0xcccccc, 0.8).fillCircle(0, 0, this.stickRadius);
        this.add([this.base, this.stick]);
        
        this.setScrollFactor(0);
        this.setAlpha(0.7); // ★ 常に半透明で表示
    }
    
    /** JumpSceneから呼ばれる: ノブの位置を更新する */
    updatePosition(pointer) {
        // ワールド座標から、このコンテナの中心を(0,0)とするローカル座標に変換
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
    
    /** JumpSceneから呼ばれる: 操作が終わったのでノブを中央に戻す */
    reset() {
        this.stick.setPosition(0, 0);
        this.direction.setTo(0, 0);
    }
}