// src/ui/VirtualStick.js (最終確定・完成版)

const Graphics = Phaser.GameObjects.Graphics;
const Vector2 = Phaser.Math.Vector2;

export default class VirtualStick extends Phaser.GameObjects.Container {
    
    /**
     * @param {Phaser.Scene} scene 
     * @param {object} config - UISceneから渡される設定オブジェクト
     */
    constructor(scene, config) {
        // コンテナ自身の位置はUISceneが設定するので、0,0で初期化
        super(scene, config.x || 0, config.y || 0);

        // --- 1. プロパティの定義 ---
        this.baseRadius = config.baseRadius || 100;
        this.stickRadius = config.stickRadius || 50;
        this.isPointerDown = false;
        
        // ★★★ 核心: 方向ベクトルを最初に正しく初期化する ★★★
        this.direction = new Vector2(0, 0);

        // --- 2. グラフィックの描画 ---
        const base = new Graphics(scene);
        base.fillStyle(0x888888, 0.5);
        base.fillCircle(0, 0, this.baseRadius);

        // スティック（ノブ）のグラフィック
        this.stick = new Graphics(scene);
        this.stick.fillStyle(0xcccccc, 0.8);
        this.stick.fillCircle(0, 0, this.stickRadius);

        // 描画したグラフィックをコンテナに追加
        this.add([base, this.stick]);

        // --- 3. 当たり判定とインタラクションの設定 ---
        this.setSize(this.baseRadius * 2, this.baseRadius * 2);
        this.setInteractive(
            new Phaser.Geom.Circle(0, 0, this.baseRadius), 
            Phaser.Geom.Circle.Contains
        );
        this.setScrollFactor(0); // カメラが動いてもUIは追従しない
        
        // --- 4. イベントリスナーの設定 ---
        // ★★★ シーン全体のポインターイベントを監視する ★★★
        this.scene.input.on('pointerdown', this.onPointerDown, this);
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);

        // ★★★ シーンが破棄される時にリスナーを自動で解除する ★★★
        this.scene.events.on('shutdown', this.shutdown, this);
    }
    
    onPointerDown(pointer) {
        // このスティックの当たり判定内でポインターが押されたかチェック
        if (this.getBounds().contains(pointer.x, pointer.y)) {
            this.isPointerDown = true;
        }
    }

    onPointerMove(pointer) {
        // ポインターが押されている間だけ処理
        if (this.isPointerDown) {
            // スティックの中心からポインターまでのローカル座標を計算
            const localPoint = this.getLocalPoint(pointer.x, pointer.y);
            const distance = localPoint.length();
            
            // 最大距離（土台の半径）を超えないように制限
            const maxDistance = this.baseRadius;

            if (distance > maxDistance) {
                // はみ出た場合、最大距離の位置に補正
                localPoint.normalize().scale(maxDistance);
            }

            // スティック（ノブ）のグラフィックを移動
            this.stick.setPosition(localPoint.x, localPoint.y);
            
            // 方向ベクトルを更新 (-1から1の範囲に正規化)
            if (maxDistance > 0) {
                this.direction.x = Phaser.Math.Clamp(localPoint.x / maxDistance, -1, 1);
                this.direction.y = Phaser.Math.Clamp(localPoint.y / maxDistance, -1, 1);
            }
        }
    }

    onPointerUp(pointer) {
        // ポインターがどの場所で離されても、状態をリセット
        if (this.isPointerDown) {
            this.isPointerDown = false;
            this.stick.setPosition(0, 0);
            this.direction.setTo(0, 0);
        }
    }
    
    /**
     * ワールド座標をコンテナのローカル座標に変換するヘルパーメソッド
     * @param {number} x - ワールドX座標
     * @param {number} y - ワールドY座標
     * @returns {Phaser.Math.Vector2}
     */
    getLocalPoint(x, y) {
        const tempMatrix = new Phaser.GameObjects.Components.TransformMatrix();
        this.getWorldTransformMatrix(tempMatrix);
        const localPoint = tempMatrix.invert().transformPoint(x, y);
        return new Vector2(localPoint.x, localPoint.y);
    }

    // --- ゲッター (Getter) ---
    // これにより、PlayerControllerから this.virtualStick.isLeft のように安全にアクセスできる
    get isLeft() { return this.direction.x < -0.5; }
    get isRight() { return this.direction.x > 0.5; }
    get isUp() { return this.direction.y < -0.5; }
    get isDown() { return this.direction.y > 0.5; }

    /**
     * シーン終了時に呼ばれ、グローバルなイベントリスナーを破棄する
     */
    shutdown() {
        if (this.scene && this.scene.input) {
            this.scene.input.off('pointerdown', this.onPointerDown, this);
            this.scene.input.off('pointermove', this.onPointerMove, this);
            this.scene.input.off('pointerup', this.onPointerUp, this);
        }
    }
}