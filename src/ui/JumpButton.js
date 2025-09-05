const Container = Phaser.GameObjects.Container;
const Graphics = Phaser.GameObjects.Graphics;
const Text = Phaser.GameObjects.Text;

export default class JumpButton extends Container {
    // ★★★ 1. 依存関係を静的に宣言 ★★★
    // このコンポーネントはゲーム変数(f)に依存しないため、空配列を宣言
    static dependencies = [];

    /**
     * @param {Phaser.Scene} scene
     * @param {object} config - UISceneから渡される設定オブジェクト (x, yなど)
     */
    constructor(scene, config) {
        // ★★★ 2. コンストラクタの引数をconfigオブジェクトから受け取るように変更 ★★★
        // コンテナ自身の位置はUISceneが設定するので、superにconfigのx, yは渡さない
        super(scene, 0, 0);

        // --- ボタンの「見た目」をプログラムで描画 (変更なし) ---
        const radius = 65;
        
        const background = new Graphics(scene);
        background.fillStyle(0xcccccc, 0.7);
        background.fillCircle(0, 0, radius);
        
        this.background_pressed = new Graphics(scene);
        this.background_pressed.fillStyle(0x888888, 0.8);
        this.background_pressed.fillCircle(0, 0, radius);
        this.background_pressed.setVisible(false);

        const label = new Text(scene, 0, 0, 'JUMP', {
            fontSize: '32px',
            fontStyle: 'bold',
            color: '#111111',
            align: 'center'
        }).setOrigin(0.5);

        // --- Containerに部品を追加 (変更なし) ---
        this.add([background, this.background_pressed, label]);
        
        // --- 当たり判定とインタラクティブ化 (変更なし) ---
        // ★★★ 自己完結しているこのコンポーネントでは、ここで設定しても問題ない
        this.setSize(radius * 2, radius * 2);
        this.setInteractive(new Phaser.Geom.Circle(0, 0, radius), Phaser.Geom.Circle.Contains);
        this.setScrollFactor(0);
        
        // --- 押したときの見た目を変えるイベントリスナー (変更なし) ---
        this.on('pointerdown', () => {
            this.background_pressed.setVisible(true);
        });
        this.on('pointerup', () => {
            this.background_pressed.setVisible(false);
        });
        this.on('pointerout', () => {
            this.background_pressed.setVisible(false);
        });

        // ★★★ 3. UISceneがadd.existing(this)を呼ぶので、ここでの追加は不要 ★★★
        // scene.add.existing(this);
    }
    
    // ★★★ 4. (推奨) 規約に準拠するため、空のupdateValueメソッドを追加 ★★★
    updateValue(state) {
        // このコンポーネントは状態変数に応じて表示を更新する必要はない
    }
}