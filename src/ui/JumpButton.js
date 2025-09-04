const Graphics = Phaser.GameObjects.Graphics;
const Text = Phaser.GameObjects.Text;

export default class JumpButton extends Phaser.GameObjects.Container {
    /**
     * @param {Phaser.Scene} scene
     * @param {object} config - x, y座標など
     */
    constructor(scene, config) {
        super(scene, config.x, config.y);

        // --- 1. ボタンの「見た目」をプログラムで描画 ---
        const radius = 65; // ボタンの半径 (直径 130px)
        
        // 背景の円
        const background = new Graphics(scene);
        background.fillStyle(0xcccccc, 0.7); // 半透明のグレー
        background.fillCircle(0, 0, radius);
        
        // 押したとき用の円 (少し濃い色)
        this.background_pressed = new Graphics(scene);
        this.background_pressed.fillStyle(0x888888, 0.8);
        this.background_pressed.fillCircle(0, 0, radius);
        this.background_pressed.setVisible(false); // 最初は非表示

        // ボタンのテキスト
        const label = new Text(scene, 0, 0, 'JUMP', {
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#111111',
            align: 'center'
        }).setOrigin(0.5);

        // --- 2. Containerに部品を追加 ---
        this.add([background, this.background_pressed, label]);
        
        // --- 3. 当たり判定とインタラクティブ化 ---
        this.setSize(radius * 2, radius * 2);
        this.setInteractive(new Phaser.Geom.Circle(0, 0, radius), Phaser.Geom.Circle.Contains);
        this.setScrollFactor(0); // UIなのでカメラに追従
        
        // --- 4. 押したときの見た目を変えるイベントリスナー ---
        this.on('pointerdown', () => {
            this.background_pressed.setVisible(true);
        });
        this.on('pointerup', () => {
            this.background_pressed.setVisible(false);
        });
        this.on('pointerout', () => {
            this.background_pressed.setVisible(false);
        });

        scene.add.existing(this);
    }
}