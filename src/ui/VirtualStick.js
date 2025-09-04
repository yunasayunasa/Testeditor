const Container = Phaser.GameObjects.Container;
const Image = Phaser.GameObjects.Image;

export default class VirtualStick extends Container {
    constructor(scene, config) {
        super(scene, config.x, config.y);
        
        this.base = new Image(scene, 0, 0, config.texture_base);
        this.stick = new Image(scene, 0, 0, config.texture_stick);
        this.add([this.base, this.stick]);
        scene.add.existing(this);
        
        this.isStickDown = false; // プロパティ名を isDown -> isStickDown に変更 (Phaser本体の isDown との混同を避ける)
        this.direction = new Phaser.Math.Vector2(0, 0);
        this.angle = 0;
        
        this.setInteractive(new Phaser.Geom.Circle(0, 0, this.base.width / 2), Phaser.Geom.Circle.Contains);
        this.setScrollFactor(0); // UIなのでカメラに追従
        
        // --- イベントリスナーの設定 ---
        this.on('pointerdown', this.onPointerDown, this);

        // ★★★ ゲーム全体の入力マネージャーを監視するのが最も確実 ★★★
        this.scene.game.input.on('pointermove', this.onPointerMove, this);
        this.scene.game.input.on('pointerup', this.onPointerUp, this);
        
        // シーンがシャットダウンする際に、グローバルなリスナーを確実に解除する
        this.scene.events.on('shutdown', this.shutdown, this);
    }
    
    onPointerDown(pointer) {
        this.isStickDown = true;
        this.updateStickPosition(pointer);
    }

    onPointerMove(pointer) {
        // ★ 自分が押されている時だけ反応する
        if (this.isStickDown) {
            this.updateStickPosition(pointer);
        }
    }

    onPointerUp(pointer) {
        // ★ どのポインターが離されても、自分が押されているならリセット
        if (this.isStickDown) {
            this.isStickDown = false;
            this.stick.setPosition(0, 0);
            this.direction.setTo(0, 0);
            this.angle = 0;
        }
    }

    updateStickPosition(pointer) {
        const localPoint = this.getLocalPoint(pointer.x, pointer.y);
        const distance = Phaser.Math.Distance.Between(0, 0, localPoint.x, localPoint.y);
        const maxDistance = (this.base.width / 2) - (this.stick.width / 2);

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

    // --- ゲッター (状態取得用) ---
    get isLeft() { return this.direction.x < -0.5; }
    get isRight() { return this.direction.x > 0.5; }
    get isUp() { return this.direction.y < -0.5; }
    get isDown() { return this.direction.y > 0.5; }

    /**
     * シーン終了時に呼ばれ、グローバルなイベントリスナーを破棄する
     */
    shutdown() {
        this.scene.game.input.off('pointermove', this.onPointerMove, this);
        this.scene.game.input.off('pointerup', this.onPointerUp, this);
    }
}