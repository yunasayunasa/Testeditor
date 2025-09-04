const Container = Phaser.GameObjects.Container;
const Graphics = Phaser.GameObjects.Graphics;

export default class VirtualStick extends Container {
    constructor(scene, config) {
        // x, y 座標は config から受け取る
        super(scene, config.x, config.y);

        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ ここからが、画像を使わない図形描画の実装です ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // --- 1. スティックのサイズを定義 ---
        const baseRadius = 100; // 土台の円の半径
        const stickRadius = 50; // スティックの円の半径
        
        // --- 2. 土台の円を描画 ---
        this.base = new Graphics(scene);
        this.base.fillStyle(0x888888, 0.5); // 半透明のグレー
        this.base.fillCircle(0, 0, baseRadius);
        
        // --- 3. スティック（ノブ）の円を描画 ---
        this.stick = new Graphics(scene);
        this.stick.fillStyle(0xcccccc, 0.8); // 少し明るいグレー
        this.stick.fillCircle(0, 0, stickRadius);

        this.add([this.base, this.stick]);
        scene.add.existing(this);
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ ここまでの描画部分以外は、元のコードとほぼ同じです ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        
        this.isStickDown = false;
        this.direction = new Phaser.Math.Vector2(0, 0);
        this.angle = 0;
        
        // 当たり判定のサイズを、描画した土台の半径に合わせる
        this.setSize(baseRadius * 2, baseRadius * 2);
        this.setInteractive(new Phaser.Geom.Circle(0, 0, baseRadius), Phaser.Geom.Circle.Contains);
        this.setScrollFactor(0);
        
        this.scene.game.input.on('pointermove', this.onPointerMove, this);
        this.scene.game.input.on('pointerup', this.onPointerUp, this);
        this.on('pointerdown', this.onPointerDown, this);
        this.scene.events.on('shutdown', this.shutdown, this);
    }
    
    onPointerDown(pointer) {
        this.isStickDown = true;
        this.updateStickPosition(pointer);
    }

    onPointerMove(pointer) {
        if (this.isStickDown) {
            this.updateStickPosition(pointer);
        }
    }

    onPointerUp(pointer) {
        if (this.isStickDown) {
            this.isStickDown = false;
            // Graphicsオブジェクトは .x, .y で位置を動かす
            this.stick.setPosition(0, 0);
            this.direction.setTo(0, 0);
            this.angle = 0;
        }
    }

    updateStickPosition(pointer) {
        const localPoint = this.getLocalPoint(pointer.x, pointer.y);
        const distance = Phaser.Math.Distance.Between(0, 0, localPoint.x, localPoint.y);
        // ★ スティックの最大移動距離を、土台とスティックの半径から計算
        const maxDistance = this.width / 2 - this.stick.width / 2;

        if (distance > maxDistance) {
            const scale = maxDistance / distance;
            this.stick.setPosition(localPoint.x * scale, localPoint.y * scale);
        } else {
            this.stick.setPosition(localPoint.x, localPoint.y);
        }

        if (maxDistance > 0) {
            this.direction.x = Phaser.Math.Clamp(this.stick.x / maxDistance, -1, 1);
            this.direction.y = Phaser.Math.Clamp(this.stick.y / maxDistance, -1, 1);
        }
        this.angle = Phaser.Math.RadToDeg(Math.atan2(this.stick.y, this.stick.x));
    }

    get isLeft() { return this.direction.x < -0.5; }
    get isRight() { return this.direction.x > 0.5; }
    get isUp() { return this.direction.y < -0.5; }
    get isDown() { return this.direction.y > 0.5; }

    shutdown() {
        this.scene.game.input.off('pointermove', this.onPointerMove, this);
        this.scene.game.input.off('pointerup', this.onPointerUp, this);
    }
}