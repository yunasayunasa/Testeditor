//
// Odyssey Engine - VirtualStick Component
// Version: 3.0 (Clean Room Implementation)
//

// Phaserのグローバルオブジェクトから、必要なクラスを安全に取得
const Container = Phaser.GameObjects.Container;
const Graphics = Phaser.GameObjects.Graphics;
const Circle = Phaser.Geom.Circle;
const Vector2 = Phaser.Math.Vector2;

export default class VirtualStick extends Container {

    // uiRegistryの前処理が参照するための静的プロパティ
    static dependencies = [];

    constructor(scene, config) {
        // configから渡される座標、あるいはデフォルトの座標(150, 550)にコンテナを配置
        super(scene, config.x || 150, config.y || 550);

        // --- 1. プロパティの定義 ---
        this.baseRadius = 100;
        this.stickRadius = 50;
        this.direction = new Vector2(0, 0); // 方向ベクトルを初期化
        this.pointer = null; // 操作中のポインターを保持する変数

        // --- 2. 見た目の作成 ---
        // 土台となる円 (半透明の灰色)
        const base = new Graphics(scene)
            .fillStyle(0x888888, 0.5)
            .fillCircle(0, 0, this.baseRadius);

        // 操作するノブ (不透明の明るい灰色)
        this.stick = new Graphics(scene)
            .fillStyle(0xcccccc, 0.8)
            .fillCircle(0, 0, this.stickRadius);
        
        // 作成したグラフィックをコンテナに追加
        this.add([base, this.stick]);

        // --- 3. 当たり判定とインタラクションの設定 ---
        // 土台(base)のグラフィックに、見た目と完全に一致する円形の当たり判定を設定
        base.setInteractive(new Circle(0, 0, this.baseRadius), Circle.Contains);

        // --- 4. 自身をシーンの更新ループとカメラから独立させる ---
        this.setScrollFactor(0);
        
        // --- 5. イベントリスナーの設定 ---
        // 土台が押された時に、そのポインターを「所有」する
        base.on('pointerdown', (pointer) => {
            if (!this.pointer) { // 誰も所有していなければ
                this.pointer = pointer;
            }
        });

        // 画面全体のポインターupを監視する
        this.scene.input.on('pointerup', (pointer) => {
            // 所有しているポインターが離された場合のみリセット
            if (this.pointer && this.pointer.id === pointer.id) {
                this.pointer = null;
                this.reset();
            }
        });
        
        // --- 6. このコンテナをシーンに追加して、updateループを開始させる ---
        scene.add.existing(this);
    }

    // --- 7. 毎フレーム実行される更新処理 ---
    update() {
        // ポインターを所有している（＝スティックが操作されている）間のみ処理を実行
        if (this.pointer && this.pointer.isDown) {
            this.updateStickPosition();
        }
    }

    // --- 8. ノブの位置と方向を計算するコアロジック ---
    updateStickPosition() {
        const localX = this.pointer.x - this.x;
        const localY = this.pointer.y - this.y;
        const vec = new Vector2(localX, localY);
        const distance = vec.length();
        const maxDistance = this.baseRadius;

        if (distance > maxDistance) {
            vec.normalize().scale(maxDistance);
        }

        this.stick.setPosition(vec.x, vec.y);
        
        if (maxDistance > 0) {
            this.direction.x = Phaser.Math.Clamp(vec.x / maxDistance, -1, 1);
            this.direction.y = Phaser.Math.Clamp(vec.y / maxDistance, -1, 1);
        }
    }

    // --- 9. スティックの状態をリセットする ---
    reset() {
        this.stick.setPosition(0, 0);
        this.direction.setTo(0, 0);
    }
}