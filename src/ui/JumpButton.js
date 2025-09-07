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
        
            this.setSize(radius * 2, radius * 2);
        this.setInteractive(new Circle(radius, radius, radius), Circle.Contains);
        this.setScrollFactor(0);
        
        // ★★★ 全てのリスナーを自分自身(this)に設定する ★★★
        this.on('pointerdown', () => {
            this.background_pressed.setVisible(true);
            // PlayerControllerはこの'pointerdown'をリッスンしているので、
            // イベントを発火させるだけで仕事は完了
        });
        
        this.on('pointerup', () => {
            this.background_pressed.setVisible(false);
        });

        // ボタンの外で指を離した場合にも対応
        this.on('pointerout', () => {
            this.background_pressed.setVisible(false);
        });
    }
}