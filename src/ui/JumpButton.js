// src/ui/JumpButton.js (当たり判定修正・最終完成版)

const Graphics = Phaser.GameObjects.Graphics;
const Text = Phaser.GameObjects.Text;
const Circle = Phaser.Geom.Circle;

export default class JumpButton extends Phaser.GameObjects.Container {

    constructor(scene, config) {
        super(scene, config.x || 0, config.y || 0);

        const radius = config.radius || 65;
        const labelText = config.label || 'JUMP';

        // --- 1. 見た目の作成 (変更なし) ---
        const background = new Graphics(scene);
        background.fillStyle(0xcccccc, 0.7);
        background.fillCircle(0, 0, radius);
        
        this.background_pressed = new Graphics(scene);
        this.background_pressed.fillStyle(0x888888, 0.8);
        this.background_pressed.fillCircle(0, 0, radius);
        this.background_pressed.setVisible(false);

        const label = new Text(scene, 0, 0, labelText, {
            fontSize: '32px', fontStyle: 'bold', color: '#111111', align: 'center'
        }).setOrigin(0.5);

        this.add([background, this.background_pressed, label]);
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ ここからが、操作感を改善する究極の修正です ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // --- 2. コンテナ自身のサイズを設定 ---
        // これにより、コンテナの範囲が明確になります
        this.setSize(radius * 2, radius * 2);

        // --- 3. 当たり判定を、コンテナの中心基準ではなく、左上基準で設定 ---
        // new Circle(x, y, radius) の x, y は、当たり判定の中心座標です。
        // コンテナの幅と高さの半分を指定することで、当たり判定がコンテナの中心に完璧に一致します。
        const hitArea = new Circle(radius, radius, radius);
        this.setInteractive(hitArea, Circle.Contains);
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        this.setScrollFactor(0);
        
        this.on('pointerdown', (pointer) => {
            // ★ イベントの伝播をここで止めるのが最も安全
            pointer.event.stopPropagation();
            
            console.log("%c[JumpButton] Pointer Down Event FIRED!", "color: orange; font-weight: bold;");
            this.background_pressed.setVisible(true);
        });

        // upとoutのリスナーは、シーン全体で監視する方が、ボタンの外で指を離した場合にも対応できてより確実
        const onPointerUpOrOut = () => {
            if (this.background_pressed.visible) {
                this.background_pressed.setVisible(false);
            }
        };
        this.scene.input.on('pointerup', onPointerUpOrOut, this);
        this.scene.input.on('pointerout', onPointerUpOrOut, this); // ゲームウィンドウから出た場合
        
        // シーン終了時にリスナーを解除
        this.scene.events.on('shutdown', () => {
            this.scene.input.off('pointerup', onPointerUpOrOut, this);
            this.scene.input.off('pointerout', onPointerUpOrOut, this);
        }, this);
    }

    // updateValueメソッドは規約のために残しておいてOK
    updateValue(state) {}
}