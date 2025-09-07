// src/ui/JumpButton.js (グローバルオブジェクト版・最終完成版)

const Container = Phaser.GameObjects.Container;
const Graphics = Phaser.GameObjects.Graphics;
const Text = Phaser.GameObjects.Text;
const Circle = Phaser.Geom.Circle;

export default class JumpButton extends Container {
    static dependencies = [];

    constructor(scene, config) {
        super(scene, config.x || 0, config.y || 0);
        const radius = 65;
        
        const background = new Graphics(scene).fillStyle(0xcccccc, 0.7).fillCircle(0, 0, radius);
        this.background_pressed = new Graphics(scene).fillStyle(0x888888, 0.8).fillCircle(0, 0, radius).setVisible(false);
        const label = new Text(scene, 0, 0, 'JUMP', { /* ... */ }).setOrigin(0.5);
        this.add([background, this.background_pressed, label]);
        
        background.setInteractive(new Circle(0, 0, radius), Circle.Contains);
        this.setScrollFactor(0);
        
        background.on('pointerdown', () => {
            this.background_pressed.setVisible(true);
            this.emit('button_pressed');
        });
        background.on('pointerup', () => this.background_pressed.setVisible(false));
        background.on('pointerout', () => this.background_pressed.setVisible(false));
    }
}