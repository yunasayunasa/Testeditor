// src/ui/VirtualStick.js (真・マルチタッチ対応・最終完成版)

const Graphics = Phaser.GameObjects.Graphics;
const Vector2 = Phaser.Math.Vector2;
const Circle = Phaser.Geom.Circle;

export default class VirtualStick extends Phaser.GameObjects.Container {
    
    constructor(scene, config) {
        super(scene, config.x || 0, config.y || 0);

        this.baseRadius = config.baseRadius || 100;
        this.stickRadius = config.stickRadius || 50;
        this.pointerId = null; // このスティックを操作している指のID
        this.direction = new Vector2(0, 0);

        // --- 見た目の作成 ---
        const base = new Graphics(scene);
        base.fillStyle(0x888888, 0.5).fillCircle(0, 0, this.baseRadius);
        this.stick = new Graphics(scene);
        this.stick.fillStyle(0xcccccc, 0.8).fillCircle(0, 0, this.stickRadius);
        this.add([base, this.stick]);
        
        // --- 当たり判定 ---
        this.setSize(this.baseRadius * 2, this.baseRadius * 2);
        this.setScrollFactor(0);
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが、最も信頼性の高いマルチタッチ処理です ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        
        // --- 1. コンテナ自身をインタラクティブにする ---
        // これにより、このオブジェクトが入力イベントを受け取れるようになる
        this.setInteractive(new Circle(this.baseRadius, this.baseRadius, this.baseRadius), Circle.Contains);

        // --- 2. このオブジェクトに対する'pointerdown'イベントだけを監視する ---
        this.on('pointerdown', (pointer) => {
            // 既に他の指で操作中の場合は、新しい指を無視する
            if (this.pointerId !== null) return;
            
            // この指を「このスティックの所有者」として記録
            this.pointerId = pointer.id;
            
            // 押された瞬間にノブを更新
            this.updateStickPosition(pointer);
        });
        
        // --- 3. シーン全体の'pointermove'と'pointerup'を監視するのは変わらない ---
        // なぜなら、指はスティックの外側まで動くし、外側で離されるから
        this.scene.input.on('pointermove', (pointer) => {
            // このスティックを所有している指からのイベントでなければ、完全に無視
            if (pointer.id !== this.pointerId) return;
            this.updateStickPosition(pointer);
        });

        this.scene.input.on('pointerup', (pointer) => {
            // このスティックを所有している指が離された場合のみ、リセット処理を行う
            if (pointer.id !== this.pointerId) return;
            
            this.pointerId = null;
            this.stick.setPosition(0, 0);
            this.direction.setTo(0, 0);
        });

        // --- 4. シーン終了時のクリーンアップ ---
        this.scene.events.on('shutdown', () => {
            this.scene.input.off('pointermove');
            this.scene.input.off('pointerup');
        }, this);
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

    // --- ゲッター (変更なし) ---
    get isLeft() { return this.direction.x < -0.5; }
    get isRight() { return this.direction.x > 0.5; }
    get isUp() { return this.direction.y < -0.5; }
    get isDown() { return this.direction.y > 0.5; }
}