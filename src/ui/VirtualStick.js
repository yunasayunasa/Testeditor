const Container = Phaser.GameObjects.Container;
const Graphics = Phaser.GameObjects.Graphics;

export default class VirtualStick extends Container {
    /**
     * @param {Phaser.Scene} scene 
     * @param {object} config - レイアウトJSONから渡される設定オブジェクト (x, y, width, heightなど)
     */
    constructor(scene, config) {
        super(scene, config.x, config.y);

        // --- スティックのサイズをプロパティとして定義 ---
        this.baseRadius = 100;
        this.stickRadius = 50;
        
        // --- 土台の円を描画 ---
        this.base = new Graphics(scene);
        this.base.fillStyle(0x888888, 0.5);
        this.base.fillCircle(0, 0, this.baseRadius);
        
        // --- スティック（ノブ）の円を描画 ---
        this.stick = new Graphics(scene);
        this.stick.fillStyle(0xcccccc, 0.8);
        this.stick.fillCircle(0, 0, this.stickRadius);

        this.add([this.base, this.stick]);
        
        // --- 状態管理プロパティ ---
        this.isStickDown = false;
        this.direction = new Phaser.Math.Vector2(0, 0);
        this.angle = 0;
        
        // --- インタラクション設定 ---
        this.setSize(this.baseRadius * 2, this.baseRadius * 2);
        this.setInteractive(new Phaser.Geom.Circle(0, 0, this.baseRadius), Phaser.Geom.Circle.Contains);
        this.setScrollFactor(0);
        
        // --- イベントリスナー ---
        // グローバルなポインターイベントをリッスン
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);
        // このオブジェクト自身へのポインターダウンをリッスン
        this.on('pointerdown', this.onPointerDown, this);
        // シーン終了時にリスナーをクリーンアップ
        this.scene.events.once('shutdown', this.shutdown, this);
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
            this.stick.setPosition(0, 0);
            this.direction.setTo(0, 0);
            this.angle = 0;
        }
    }

    updateStickPosition(pointer) {
        // pointer座標をこのコンテナのローカル座標に変換
        const localPoint = this.getLocalPoint(pointer.x, pointer.y);
        const distance = Phaser.Math.Distance.Between(0, 0, localPoint.x, localPoint.y);
        const maxDistance = this.baseRadius - this.stickRadius;

        // スティックが土台からはみ出さないように位置を制限
        if (distance > maxDistance) {
            const scale = maxDistance / distance;
            this.stick.setPosition(localPoint.x * scale, localPoint.y * scale);
        } else {
            this.stick.setPosition(localPoint.x, localPoint.y);
        }

        // 方向ベクトルと角度を計算
        if (maxDistance > 0) {
            this.direction.x = Phaser.Math.Clamp(this.stick.x / maxDistance, -1, 1);
            this.direction.y = Phaser.Math.Clamp(this.stick.y / maxDistance, -1, 1);
        }
        this.angle = Phaser.Math.RadToDeg(Math.atan2(this.stick.y, this.stick.x));
    }

    // --- 方向ゲッター ---
    get isLeft() { return this.direction.x < -0.5; }
    get isRight() { return this.direction.x > 0.5; }
    get isUp() { return this.direction.y < -0.5; }
    get isDown() { return this.direction.y > 0.5; }

    shutdown() {
        // メモリリークを防ぐため、グローバルなリスナーを必ず削除
        this.scene.input.off('pointermove', this.onPointerMove, this);
        this.scene.input.off('pointerup', this.onPointerUp, this);
    }
}