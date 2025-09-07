//
// Odyssey Engine - JumpButton Component
// Final Architecture: Pure Display Lamp
//

const Container = Phaser.GameObjects.Container;
const Graphics = Phaser.GameObjects.Graphics;
const Text = Phaser.GameObjects.Text;

export default class JumpButton extends Container {

    static dependencies = [];

    constructor(scene, config) {
        // configで渡された固定位置、あるいはデフォルト位置(1100, 550)に表示
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

        this.add([background, this.background_pressed, label]);
        
        // --- 入力機能は一切持たない ---
        // setInteractive() や .on() は、ここでは呼び出さない

        // --- シーンに追加 ---
        this.setScrollFactor(0);
        scene.add.existing(this);
    }
    
    /**
     * [JumpSceneから命令] ボタンの押下状態に応じて、見た目を変更する
     * @param {boolean} isPressed - ボタンが押されているかどうか
     */
    setPressed(isPressed) {
        this.background_pressed.setVisible(isPressed);
    }
}