// src/ui/VirtualStick.js (イベント局所化・最終完成版)

const Graphics = Phaser.GameObjects.Graphics;
const Vector2 = Phaser.Math.Vector2;
const Circle = Phaser.Geom.Circle;

export default class VirtualStick extends Phaser.GameObjects.Container {
    
    constructor(scene, config) {
        super(scene, config.x || 0, config.y || 0);

        this.baseRadius = config.baseRadius || 100;
        this.stickRadius = config.stickRadius || 50;
        this.direction = new Vector2(0, 0);

        const base = new Graphics(scene).fillStyle(0x888888, 0.5).fillCircle(0, 0, this.baseRadius);
        this.stick = new Graphics(scene).fillStyle(0xcccccc, 0.8).fillCircle(0, 0, this.stickRadius);
        this.add([base, this.stick]);
        
        this.setSize(this.baseRadius * 2, this.baseRadius * 2);
        this.setScrollFactor(0);
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが、Phaserの作法に則った、最も正しい実装です ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        
        // --- 1. インタラクティブ化 ---
        this.setInteractive(new Circle(this.baseRadius, this.baseRadius, this.baseRadius), Circle.Contains);
        
        // --- 2. ドラッグ可能にする ---
        this.scene.input.setDraggable(this);

        // --- 3. イベントリスナーを、全て自分自身(this)に設定する ---
        this.on('drag', (pointer, dragX, dragY) => {
            const localX = dragX - this.baseRadius;
            const localY = dragY - this.baseRadius;
            const vec = new Vector2(localX, localY);
            this.updateStickPosition(vec);
        });

        // ★ 'dragend' は、このスティックをドラッグしていた指が離れた時にのみ発火する
        this.on('dragend', (pointer) => {
            this.resetStick();
        });

        // ★ 'pointerup' も自分自身に設定する
        // (ドラッグせずにタップしてすぐ離した場合などに対応)
        this.on('pointerup', (pointer) => {
            this.resetStick();
        });

        // ★ ドラッグ中に指がオブジェクトの外に出た場合もリセット
        this.on('pointerout', (pointer) => {
            // isDownプロパティで、指がまだ画面に触れているかを確認
            if (pointer.isDown) return;
            this.resetStick();
        });
    }
    /** ノブの位置と方向ベクトルを更新するコアロジック */
    updateStickPosition(pointer) {
        // ワールド座標から、このコンテナの中心を(0,0)とするローカル座標に変換
        const localX = pointer.x - this.x;
        const localY = pointer.y - this.y;
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
   resetStick() {
        this.stick.setPosition(0, 0);
        this.direction.setTo(0, 0);
    }

    // --- ゲッター (変更なし) ---
    get isLeft() { return this.direction.x < -0.5; }
    get isRight() { return this.direction.x > 0.5; }
    get isUp() { return this.direction.y < -0.5; }
    get isDown() { return this.direction.y > 0.5; }
}