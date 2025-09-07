const Container = Phaser.GameObjects.Container;
const Graphics = Phaser.GameObjects.Graphics;

export default class VirtualStick extends Container {
    // ★★★ 1. 依存関係を静的に宣言 ★★★
    // このコンポーネントはゲーム変数(f)に依存しないため、空配列を宣言
    static dependencies = [];

    /**
     * @param {Phaser.Scene} scene 
     * @param {object} config - UISceneから渡される設定オブジェクト (x, yなど)
     */
    constructor(scene, config) {
        // ★★★ 2. コンストラクタの引数をconfigオブジェクトから受け取るように変更 ★★★
        // コンテナ自身の位置はUISceneが設定するので、config.x, config.y はsuperに渡さない
        super(scene, 0, 0);

        // --- スティックのサイズをプロパティとして定義 (変更なし) ---
        this.baseRadius = 100;
        this.stickRadius = 50;
        
        // --- 土台の円を描画 (変更なし) ---
        this.base = new Graphics(scene);
        this.base.fillStyle(0x888888, 0.5);
        this.base.fillCircle(0, 0, this.baseRadius);
        
        // --- スティック（ノブ）の円を描画 (変更なし) ---
        this.stick = new Graphics(scene);
        this.stick.fillStyle(0xcccccc, 0.8);
        this.stick.fillCircle(0, 0, this.stickRadius);

        this.add([this.base, this.stick]);
        
        // --- 状態管理プロパティ (変更なし) ---
        this.isStickDown = false;
        this.direction = new Phaser.Math.Vector2(0, 0);
        this.angle = 0;
        
        // --- インタラクション設定 (変更なし) ---
        // ★★★ setSizeとsetInteractiveはUISceneのregisterUiElementで行うのが望ましいが、
        // ★★★ 自己完結しているこのコンポーネントでは、ここで設定しても問題ない
        this.setSize(this.baseRadius * 2, this.baseRadius * 2);
        this.setInteractive(new Phaser.Geom.Circle(0, 0, this.baseRadius), Phaser.Geom.Circle.Contains);
        this.setScrollFactor(0);
        
        // --- イベントリスナー (変更なし) ---
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);
        this.on('pointerdown', this.onPointerDown, this);
        
        // ★★★ 3. destroyメソッドでリスナーを解除するように変更 ★★★
        // シーンのshutdownイベントよりも、コンポーネント自身のdestroyイベントで
        // 解除する方が、より堅牢で自己完結した設計になる
        this.scene.events.on('destroy', this.destroy, this);
    }
    
    // ★★★ 4. (推奨) 規約に準拠するため、空のupdateValueメソッドを追加 ★★★
    updateValue(state) {
        // このコンポーネントは状態変数に応じて表示を更新する必要はない
    }

    update() {
        if (!this.isStickDown) return;

        // ★★★ 入力ポインターをシーンから直接取得する ★★★
        const pointer = this.scene.input.activePointer;

        const tempMatrix = new Phaser.GameObjects.Components.TransformMatrix();
        this.getWorldTransformMatrix(tempMatrix);
        const localPoint = tempMatrix.invert().transformPoint(pointer.x, pointer.y);

        // ... (以降の座標計算ロジックは、updateStickPositionと全く同じ)
        const distance = Phaser.Math.Distance.Between(0, 0, localPoint.x, localPoint.y);
        const maxDistance = this.baseRadius - this.stickRadius;

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

    onPointerDown(pointer) {
        this.isStickDown = true;
        // ★ ここでは更新しない
    }
    onPointerMove(pointer) {
        // ★ ここでは更新しない
    }
    onPointerUp(pointer) {
        this.isStickDown = false;
        this.stick.setPosition(0, 0);
        this.direction.setTo(0, 0);
        this.angle = 0;
    }

    // --- 方向ゲッター (変更なし) ---
    get isLeft() { return this.direction.x < -0.5; }
    get isRight() { return this.direction.x > 0.5; }
    get isUp() { return this.direction.y < -0.5; }
    get isDown() { return this.direction.y > 0.5; }

    // ★★★ 6. shutdownメソッドをdestroyメソッドにリネーム＆修正 ★★★
    destroy(fromScene) {
        // メモリリークを防ぐため、グローバルなリスナーを必ず削除
        if (this.scene && this.scene.input) {
            this.scene.input.off('pointermove', this.onPointerMove, this);
            this.scene.input.off('pointerup', this.onPointerUp, this);
        }
        // 親のdestroyを呼び出す
        super.destroy(fromScene);
    }
}