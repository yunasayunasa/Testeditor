// src/ui/VirtualStick.js (ポインターID管理・最終完成版)

const Graphics = Phaser.GameObjects.Graphics;
const Vector2 = Phaser.Math.Vector2;
const Circle = Phaser.Geom.Circle;

export default class VirtualStick extends Phaser.GameObjects.Container {
    
    constructor(scene, config) {
        super(scene, config.x || 0, config.y || 0);

        // --- 1. プロパティ定義 ---
        this.baseRadius = config.baseRadius || 100;
        this.stickRadius = config.stickRadius || 50;
        this.pointerId = null; // ★ このスティックを操作しているポインターのID
        this.direction = new Vector2(0, 0);

        // --- 2. グラフィック描画 ---
        const base = new Graphics(scene);
        base.fillStyle(0x888888, 0.5);
        base.fillCircle(0, 0, this.baseRadius);

        this.stick = new Graphics(scene);
        this.stick.fillStyle(0xcccccc, 0.8);
        this.stick.fillCircle(0, 0, this.stickRadius);
        this.add([base, this.stick]);

        // --- 3. 当たり判定とインタラクション ---
        // ★★★ setInteractiveをコンテナ自身に設定するのではなく、土台(base)に設定するのがより確実 ★★★
        base.setInteractive(new Circle(0, 0, this.baseRadius), Circle.Contains);
        this.setScrollFactor(0);
        
        // --- 4. イベントリスナー ---
        // ★★★ base(土台)のpointerdownを監視する ★★★
        base.on('pointerdown', this.onStickDown, this);

        // ★★★ シーン全体のmoveとupを監視するのは変わらない ★★★
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);

        this.scene.events.on('shutdown', this.shutdown, this);
    }
    
    /** スティックがタッチされた時の処理 */
    onStickDown(pointer) {
        // 既に他の指で操作中の場合は何もしない
        if (this.pointerId !== null) return;
        
        // このタッチのIDを記録
        this.pointerId = pointer.id;
        
        // ★ 押された瞬間にノブを更新
        this.updateStickPosition(pointer);
    }

    /** ポインターが動いた時の処理 */
    onPointerMove(pointer) {
        // このスティックを操作している指でなければ、処理を無視
        if (pointer.id !== this.pointerId) return;
        
        this.updateStickPosition(pointer);
    }
    
    /** ポインターが離された時の処理 */
    onPointerUp(pointer) {
        // このスティックを操作している指でなければ、処理を無視
        if (pointer.id !== this.pointerId) return;

        // 状態をリセット
        this.pointerId = null;
        this.stick.setPosition(0, 0);
        this.direction.setTo(0, 0);
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