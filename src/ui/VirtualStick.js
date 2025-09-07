
const Graphics = Phaser.GameObjects.Graphics;
const Vector2 = Phaser.Math.Vector2;
const Circle = Phaser.Geom.Circle;

export default class VirtualStick extends Phaser.GameObjects.Container {
    
    constructor(scene, config) {
        super(scene, config.x || 0, config.y || 0);
        
        this.baseRadius = config.baseRadius || 100;
        this.stickRadius = config.stickRadius || 50;
        this.direction = new Vector2(0, 0);

        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        this.pointerId = null; // ★ このスティックを操作している指のIDを記憶
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        
        const base = new Graphics(scene);
        base.fillStyle(0x888888, 0.5);
        base.fillCircle(0, 0, this.baseRadius);

        this.stick = new Graphics(scene);
        this.stick.fillStyle(0xcccccc, 0.8);
        this.stick.fillCircle(0, 0, this.stickRadius);
        this.add([base, this.stick]);

        // --- 当たり判定は、コンテナ自身に、中心を合わせて設定 ---
        this.setSize(this.baseRadius * 2, this.baseRadius * 2);
        this.setInteractive(new Circle(this.baseRadius, this.baseRadius, this.baseRadius), Circle.Contains);
        this.setScrollFactor(0);
        
        // --- イベントリスナーを修正 ---
        this.on('pointerdown', this.onStickDown, this);

        // ★ グローバルなリスナーは変わらないが、中のロジックが重要になる
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);

        this.scene.events.on('shutdown', this.shutdown, this);
    }
    
    onStickDown(pointer) {
        // 誰も所有していなければ、この指が所有者になる
        if (this.pointerId === null) {
            this.pointerId = pointer.id;
            this.updateStickPosition(pointer);
        }
    }

    onPointerMove(pointer) {
        // 自分を所有している指の動きでなければ、完全に無視
        if (pointer.id === this.pointerId) {
            this.updateStickPosition(pointer);
        }
    }
    
    onPointerUp(pointer) {
        // 自分を所有していた指が離された場合のみ、リセット
        if (pointer.id === this.pointerId) {
            this.pointerId = null; // 所有権を解放
            this.stick.setPosition(0, 0);
            this.direction.setTo(0, 0);
        }
    }
    

    /** ノブの位置と方向ベクトルを更新するコアロジック */
    updateStickPosition(pointer) {
        const localPoint = this.getLocalPoint(pointer.x, pointer.y);
        const distance = localPoint.length();
        const maxDistance = this.baseRadius; // ノブの可動範囲は土台の半径いっぱいまで

        if (distance > maxDistance) {
            localPoint.normalize().scale(maxDistance);
        }

        this.stick.setPosition(localPoint.x, localPoint.y);
        
        if (maxDistance > 0) {
            this.direction.x = Phaser.Math.Clamp(localPoint.x / maxDistance, -1, 1);
            this.direction.y = Phaser.Math.Clamp(localPoint.y / maxDistance, -1, 1);
        }
    }

    getLocalPoint(x, y) {
        const tempMatrix = new Phaser.GameObjects.Components.TransformMatrix();
        this.getWorldTransformMatrix(tempMatrix);
        const localPoint = tempMatrix.invert().transformPoint(x, y);
        return new Vector2(localPoint.x, localPoint.y);
    }

    // --- ゲッター (変更なし) ---
    get isLeft() { return this.direction.x < -0.5; }
    get isRight() { return this.direction.x > 0.5; }
    get isUp() { return this.direction.y < -0.5; }
    get isDown() { return this.direction.y > 0.5; }

    shutdown() {
        if (this.scene && this.scene.input) {
            this.scene.input.off('pointermove', this.onPointerMove, this);
            this.scene.input.off('pointerup', this.onPointerUp, this);
        }
    }
}