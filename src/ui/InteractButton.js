// in src/ui/InteractButton.js (新規作成)

import Button from './Button.js'; // ★ 汎用ボタンクラスをインポート

export default class InteractButton extends Button { // ★ Buttonクラスを継承

    constructor(scene, params) {
        // --- 1. 親クラス(Button)のコンストラクタを呼び出す ---
        //    これにより、背景の描画やテキストの設定などは、すべてButtonクラスがやってくれる
        super(scene, params);

        // --- 2. 既存の'onClick'イベントリスナーを一度クリアする ---
        //    (親クラスが登録した「tweensを実行する」リスナーを上書きするため)
        this.off('onClick');
        
        // --- 3. このクラス専用の、新しい'onClick'リスナーを登録する ---
        this.on('onClick', this.fireInteractEvent, this);
    }
    
    /**
     * ★★★ このクラスの心臓部 ★★★
     * クリックされたときに、'interact_button_pressed'イベントを発火させる。
     */
    fireInteractEvent() {
        // JumpSceneやGameSceneなど、現在アクティブなゲームプレイシーンを探す
        const gameScene = this.scene.scene.manager.getScenes(true).find(s =>
            s.scene.key !== 'UIScene' &&
            s.scene.key !== 'SystemScene' &&
            s.scene.key !== 'PreloadScene'
        );

        if (gameScene) {
            // 見つけたゲームシーンのイベントバスに、イベントを発火させる
            gameScene.events.emit('interact_button_pressed');
            console.log(`[InteractButton] Fired 'interact_button_pressed' on scene '${gameScene.scene.key}'.`);
        } else {
            console.warn('[InteractButton] Could not find an active game scene to fire event on.');
        }
    }

    
    /**
     * EditorPluginからラベルテキストを変更されたときに呼ばれるメソッド
     */
    setText(newText) {
        this.textObject.setText(newText);
        
        // テキストの更新に合わせて、背景と当たり判定のサイズも更新する
        const textWidth = this.textObject.width;
        const textHeight = this.textObject.height;
        const newWidth = textWidth + 40;
        const newHeight = textHeight + 20;

        this.updateBackground(this.shape, newWidth, newHeight, this.backgroundColor);
        this.setSize(newWidth, newHeight);
        
        // インタラクティブエリアも更新
        this.setInteractive();
    }
     /** ★★★ 新規メソッド：スケールを変更する ★★★ */
    setVisualScale(scaleX, scaleY) {
        // コンテナ自体のスケールを変更
        this.setScale(scaleX, scaleY ?? scaleX); // YがなければXと同じ値を使う
    }
    
    /** ★★★ 新規メソッド：背景テクスチャを変更する ★★★ */
    setBackgroundTexture(textureKey) {
        // Graphicsではなく、Imageを背景として使っている場合
        // if (this.background instanceof Phaser.GameObjects.Image) {
        //     this.background.setTexture(textureKey);
        // }
        // Graphicsを使っている場合は、色を変えるのが一般的
        // この機能は、ボタンの構造によって実装が変わります
    }
    /**
     * ★★★ 新規ヘルパーメソッド ★★★
     * 背景の形状を描画する処理を、再利用可能なメソッドとして分離
     */
    updateBackground(shape, width, height, color) {
        this.shape = shape; // 形状を記憶
        this.backgroundColor = color; // 色を記憶

        this.background.clear().fillStyle(color, 0.8);

        if (shape === 'circle') {
            const radius = Math.max(width, height) / 2;
            this.background.fillCircle(0, 0, radius);
        } else { // rounded_rect
            this.background.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        }
    }
}