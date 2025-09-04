// src/ui/VirtualStick.js

const
Container = Phaser.GameObjects.Container;
const
Image = Phaser.GameObjects.Image;

export
default
class
VirtualStick
extends
Container {
    /**
     * コンストラクタ
     * @param {Phaser.Scene} scene
     * @param {object} config - { x, y, texture_base, texture_stick }
     */
    constructor(scene, config) {
        super(scene, config.x, config.y);

        this.base = new Image(scene, 0, 0, config.texture_base);
        this.stick = new Image(scene, 0, 0, config.texture_stick);
        
        this.add([this.base, this.stick]);
        scene.add.existing(this);
        
        // --- 状態プロパティ ---
        this.isDown = false;
        this.direction = { x: 0, y: 0 }; // -1 to 1
        this.angle = 0; // degrees
        
        // --- インタラクティブ設定 ---
        this.setInteractive(new Phaser.Geom.Circle(0, 0, this.base.width / 2), Phaser.Geom.Circle.Contains);
        this.setScrollFactor(0); // カメラが動いても、UIは画面に固定
        
        // --- イベントリスナー ---
        this.on('pointerdown', this.onPointerDown, this);
        // シーン全体でpointermoveとupを監視する
        this.scene.input.on('pointermove', this.onPointerMove, this);
        this.scene.input.on('pointerup', this.onPointerUp, this);
        
        // シーン終了時にリスナーをクリーンアップ
        this.scene.events.on('shutdown', this.destroy, this);
    }

    onPointerDown(pointer) {
        this.isDown = true;
        this.updateStickPosition(pointer);
    }

    onPointerMove(pointer) {
        if (this.isDown) {
            this.updateStickPosition(pointer);
        }
    }

    onPointerUp(pointer) {
        this.isDown = false;
        // スティックを中央に戻す
        this.stick.setPosition(0, 0);
        this.direction = { x: 0, y: 0 };
        this.angle = 0;
    }

    updateStickPosition(pointer) {
        const localPoint = this.getLocalPoint(pointer.x, pointer.y);
        const distance = Phaser.Math.Distance.Between(0, 0, localPoint.x, localPoint.y);
        const maxDistance = this.base.width / 2 - this.stick.width / 4;

        if (distance > maxDistance) {
            // スティックが外側の円周上を移動するように制限
            const
scale = maxDistance / distance;
            this.stick.setPosition(localPoint.x * scale, localPoint.y * scale);
        }
else {
            this.stick.setPosition(localPoint.x, localPoint.y);
        }
        
        // 状態を更新
        this.direction.x = Phaser.Math.Clamp(this.stick.x / maxDistance, -1, 1);
        this.direction.y = Phaser.Math.Clamp(this.stick.y / maxDistance, -1, 1);
        this.angle = Phaser.Math.RadToDeg(Math.atan2(this.stick.y, this.stick.x));
    }

    // ★★★ PlayerControllerが参照するための、便利なゲッター ★★★
    get isLeft() { return this.direction.x < -0.5; }
    get isRight() { return this.direction.x > 0.5; }
    get isUp() { return this.direction.y < -0.5; }
    get isDown() { return this.direction.y > 0.5; }
    
    destroy() {
        this.scene.input.off('pointermove', this.onPointerMove, this);
        this.scene.input.off('pointerup', this.onPointerUp, this);
        super.destroy();
    }
}