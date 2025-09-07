//
// Odyssey Engine - JumpButton Component
// Final Architecture: Self-Contained Smart Component
//

const Container = Phaser.GameObjects.Container;
const Graphics = Phaser.GameObjects.Graphics;
const Text = Phaser.GameObjects.Text;
const Circle = Phaser.Geom.Circle;

export default class JumpButton extends Container {
    static dependencies = [];

    constructor(scene, config) {
        super(scene, config.x || 1100, config.y || 550);
        const radius = 65;
        // --- 見た目の作成 ---
        const background = new Graphics(scene)
            .fillStyle(0xcccccc, 0.7)
            .fillCircle(0, 0, radius);
            
        this.background_pressed = new Graphics(scene)
            .fillStyle(0x888888, 0.8)
            .fillCircle(0, 0, radius)
            .setVisible(false); // 押された時の見た目は、最初は非表示

        const label = new Text(scene, 0, 0, 'JUMP', { 
            fontSize: '32px', 
            fontStyle: 'bold', 
            color: '#111111', 
            align: 'center' 
        }).setOrigin(0.5);

        // --- 当たり判定をbackgroundに設定 ---
        background.setInteractive(new Circle(0, 0, radius), Circle.Contains);
        this.setScrollFactor(0);
        
        // --- イベントリスナーをbackgroundで完結させる ---
        background.on('pointerdown', () => {
            this.background_pressed.setVisible(true);
            this.emit('button_pressed'); // ★ PlayerControllerがリッスンする信号
        });
        background.on('pointerup', () => this.background_pressed.setVisible(false));
        background.on('pointerout', () => this.background_pressed.setVisible(false));

        scene.add.existing(this);
    }
}