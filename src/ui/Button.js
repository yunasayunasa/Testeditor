const Container = Phaser.GameObjects.Container;
const Graphics = Phaser.GameObjects.Graphics;
const Text = Phaser.GameObjects.Text;

export default class Button extends Container {

    constructor(scene, params) {
        // --- 1. パラメータから設定値を取得（なければデフォルト値） ---
        const x = params.x || scene.scale.width / 2;
        const y = params.y || scene.scale.height / 2;
        const label = params.label || 'ボタン';
           const shape = params.shape || 'rounded_rect'; // ★ 形状をパラメータで受け取る
        super(scene, x, y);

        // --- 2. ラベルの文字数に応じて、ボタンのサイズを動的に決定 ---
        const textMetrics = new Text(scene, 0, 0, label, { fontSize: '24px', fontStyle: 'bold' }).getMetrics();
        const width = textMetrics.width + 40; // テキストの幅 + 左右の余白
        const height = 50;
        textMetrics.destroy();

        // --- 3. 見た目を描画 ---
        this.background = new Graphics(scene)
            .fillStyle(backgroundColor, 0.8);

        // ★ 形状に応じて描画を切り替える
        if (shape === 'circle') {
            const radius = Math.max(width, height) / 2;
            this.background.fillCircle(0, 0, radius);
        } else { // rounded_rect
            this.background.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        }
            
          
        
        this.textObject = new Text(scene, 0, 0, label, { 
            fontSize: '24px', 
            fontStyle: 'bold', 
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        
        this.add([this.background, this.textObject]);

        // --- 4. 当たり判定とインタラクティブ設定 ---
        this.setSize(width, height);
        this.setInteractive(); // Containerは自動でサイズに合わせた当たり判定を作る
        
        // --- 5. イベントリスナー ---
        this.on('pointerdown', () => {
            const editorPlugin = this.scene.plugins.get('EditorPlugin');
            if (!editorPlugin || !editorPlugin.isEnabled || editorPlugin.currentMode === 'play') {
                this.emit('button_pressed', this); // 自分自身をイベントで渡す
                
                this.scene.tweens.add({ targets: this, scale: 0.95, duration: 80, yoyo: true });
            }
        });
        
        this.on('pointerover', () => this.background.setAlpha(1));
        this.on('pointerout', () => this.background.setAlpha(0.8));
    }
    
    /**
     * EditorPluginから呼ばれるためのメソッド
     */
    setText(newText) {
        this.textObject.setText(newText);
        // ★ テキストに合わせて背景と当たり判定のサイズも更新
        const textMetrics = this.textObject.getMetrics();
        const newWidth = textMetrics.width + 40;
        const newHeight = 50;
        this.setSize(newWidth, newHeight);
        this.background.clear().fillStyle(0x555555, 0.8).fillRoundedRect(-newWidth / 2, -newHeight / 2, newWidth, newHeight, 10);
        
        // 当たり判定を更新
        this.setInteractive();
    }
}