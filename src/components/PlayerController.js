// src/components/PlayerController.js (修正後)

export default class PlayerController {

    constructor(scene, target, params = {}) { // ★ paramsを受け取るようにする
        this.scene = scene;
        this.target = target;

        // --- 調整可能なパラメータ (paramsから上書き可能にする) ---
        this.moveSpeed = params.moveSpeed || 200;
        this.jumpVelocity = params.jumpVelocity || -500;
        
        // --- 内部的な状態 ---
        this.cursors = scene.input.keyboard.createCursorKeys();
        
        // ★★★ UI要素の検索を、より安全な方法に変更 ★★★
        this.virtualStick = null;
        this.jumpButton = null;
        const uiScene = scene.scene.get('UIScene');
        if (uiScene && uiScene.uiElements.size > 0) { // UISceneが準備完了しているか確認
            this.virtualStick = Array.from(uiScene.uiElements.values())
                                     .find(ui => ui.getData('group') === 'virtual_stick');

            this.jumpButton = Array.from(uiScene.uiElements.values())
                                     .find(ui => ui.getData('group') === 'jump_button');
        }
        
        // ★★★ ボタンが存在する場合のみ、リスナーを設定 ★★★
        if (this.jumpButton) {
            this.jumpButton.on('pointerdown', this.jump, this);
        }
    }

    update() {
        if (!this.target || !this.target.body) return;

        // ★★★ スティックが存在するかを毎フレーム確認してから使う ★★★
        const input = {
            left: this.cursors.left.isDown || (this.virtualStick && this.virtualStick.isLeft),
            right: this.cursors.right.isDown || (this.virtualStick && this.virtualStick.isRight),
            up: this.cursors.up.isDown, // キーボードジャンプは常に有効
        };
        
        const body = this.target.body;
        
        if (input.left) {
            body.setVelocityX(-this.moveSpeed);
        } else if (input.right) {
            body.setVelocityX(this.moveSpeed);
        } else {
            body.setVelocityX(0);
        }
        
        // キーボードでのジャンプ処理
        if (input.up) {
            // JustDownのような処理が必要な場合は、シーン側で別途実装する
            // ここではシンプルにisDownで判定
            this.jump();
        }
    }

    jump() {
        // ★ is-downではなく、まさにジャンプすべき瞬間（地面にいる時）だけ実行
        if (this.target && this.target.body && this.target.body.touching.down) {
            this.target.body.setVelocityY(this.jumpVelocity);
        }
    }

    destroy() {
        // コンポーネントが破棄される時に、イベントリスナーを安全に解除する
        if (this.jumpButton) {
            this.jumpButton.off('pointerdown', this.jump, this);
        }
        this.virtualStick = null;
        this.jumpButton = null;
    }
}