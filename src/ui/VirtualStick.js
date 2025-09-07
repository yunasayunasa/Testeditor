
// src/ui/VirtualStick.js (マルチタッチ対応・最終完成版)

const Graphics = Phaser.GameObjects.Graphics;
const Vector2 = Phaser.Math.Vector2;
const Circle = Phaser.Geom.Circle;

export default class VirtualStick extends Phaser.GameObjects.Container {
    
    constructor(scene, config) {
        super(scene, config.x || 0, config.y || 0);

        this.baseRadius = config.baseRadius || 100;
        this.stickRadius = config.stickRadius || 50;
        this.direction = new Vector2(0, 0);

        const base = new Graphics(scene);
        base.fillStyle(0x888888, 0.5);
        base.fillCircle(0, 0, this.baseRadius);

        this.stick = new Graphics(scene);
        this.stick.fillStyle(0xcccccc, 0.8);
        this.stick.fillCircle(0, 0, this.stickRadius);
        this.add([base, this.stick]);

        this.setSize(this.baseRadius * 2, this.baseRadius * 2);
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ ここからがマルチタッチ対応の核心です ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // --- 1. インタラクティブ化 ---
        this.setInteractive(new Circle(this.baseRadius, this.baseRadius, this.baseRadius), Circle.Contains);
        this.setScrollFactor(0);
        
        // --- 2. ドラッグ可能にする ---
        // これにより、Phaserが自動的にポインターの追跡を管理してくれる
        this.scene.input.setDraggable(this);

        // --- 3. ドラッグ関連のイベントをリッスン ---
        this.on('dragstart', (pointer) => {
            // ドラッグ開始時の処理 (何もしなくても良い)
        });

        this.on('drag', (pointer, dragX, dragY) => {
            // dragX, dragYはコンテナの左上からの相対座標
            // 中心からの座標に変換
            const localX = dragX - this.baseRadius;
            const localY = dragY - this.baseRadius;
            const vec = new Vector2(localX, localY);
            
            // ノブの位置と方向を更新
            this.updateStickPosition(vec);
        });

        this.on('dragend', (pointer) => {
            // ドラッグ終了時に状態をリセット
            this.stick.setPosition(0, 0);
            this.direction.setTo(0, 0);
        });
    }
    
    /** ノブの位置と方向ベクトルを更新するコアロジック */
    updateStickPosition(vec) {
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

    shutdown() {
        if (this.scene && this.scene.input) {
            this.scene.input.off('pointermove', this.onPointerMove, this);
            this.scene.input.off('pointerup', this.onPointerUp, this);
        }
    }
}