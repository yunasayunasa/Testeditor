// src/ui/JumpButton.js (マルチタッチ対応・最終完成版)

const Graphics = Phaser.GameObjects.Graphics;
const Text = Phaser.GameObjects.Text;
const Circle = Phaser.Geom.Circle;

export default class JumpButton extends Phaser.GameObjects.Container {

    constructor(scene, config) {
        super(scene, config.x || 0, config.y || 0);

        const radius = config.radius || 65;
        const labelText = config.label || 'JUMP';

        const background = new Graphics(scene);
        background.fillStyle(0xcccccc, 0.7).fillCircle(0, 0, radius);
        
        this.background_pressed = new Graphics(scene);
        this.background_pressed.fillStyle(0x888888, 0.8).fillCircle(0, 0, radius).setVisible(false);

        const label = new Text(scene, 0, 0, labelText, {
            fontSize: '32px', fontStyle: 'bold', color: '#111111', align: 'center'
        }).setOrigin(0.5);

     
        this.add([background, this.background_pressed, label]);
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが、全てを解決する最後の修正です ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // コンテナ自身ではなく、背景(background)をインタラクティブにする
        background.setInteractive(new Circle(0, 0, radius), Circle.Contains);
        
        this.setScrollFactor(0);
        
        // ★ イベントリスナーを、コンテナ(this)ではなく、背景(background)に設定する
        background.on('pointerdown', () => {
            this.background_pressed.setVisible(true);
            // ★★★ PlayerControllerがリッスンするのはコンテナのイベントなので、中から外へイベントを中継する ★★★
            this.emit('pointerdown');
        });
        background.on('pointerup', () => this.background_pressed.setVisible(false) );
        background.on('pointerout', () => this.background_pressed.setVisible(false) );
    }
}