// src/components/PlayerController.js (超防御的・デバッグ強化版)

export default class PlayerController {

    constructor(scene, target, params = {}) {
        this.scene = scene;
        this.target = target;
        this.params = params; // パラメータを保持

        this.moveSpeed = params.moveSpeed || 200;
        this.jumpVelocity = params.jumpVelocity || -500;
        
        this.cursors = scene.input.keyboard.createCursorKeys();
        
        this.virtualStick = null;
        this.jumpButton = null;

        // ★★★ UISceneの準備ができてからUI要素を探すように修正 ★★★
        const uiScene = scene.scene.get('UIScene');
        if (uiScene && uiScene.scene.isActive()) {
            // UISceneがすでに準備完了している場合
            if (uiScene.uiElements.size > 0) {
                this.findUiElements(uiScene);
            } else {
                // まだ準備中の場合、一度だけイベントを待つ
                uiScene.events.once('scene-ready', () => this.findUiElements(uiScene), this);
            }
        }
    }

    /**
     * UISceneから操作用のUI要素を検索し、プロパティに格納する
     * @param {Phaser.Scene} uiScene - UISceneのインスタンス
     */
    findUiElements(uiScene) {
        this.virtualStick = Array.from(uiScene.uiElements.values())
                                 .find(ui => ui.getData('group') === 'virtual_stick');
        this.jumpButton = Array.from(uiScene.uiElements.values())
                                 .find(ui => ui.getData('group') === 'jump_button');
        
        console.log(`[PlayerController] UI Search Complete. Stick found: ${!!this.virtualStick}, Button found: ${!!this.jumpButton}`);

        if (this.jumpButton) {
            this.jumpButton.off('pointerdown', this.jump, this); // 念のため既存のリスナーを解除
            this.jumpButton.on('pointerdown', this.jump, this);
        }
    }

    update() {
        // ターゲットオブジェクトが存在し、物理ボディを持っているか確認
        if (!this.target || !this.target.body || !this.target.active) {
            return; // ターゲットが無効なら何もしない
        }

        // --- 入力状態を安全に取得 ---
        let moveX = 0;
        
        // キーボード入力
        if (this.cursors.left.isDown) {
            moveX = -1;
        } else if (this.cursors.right.isDown) {
            moveX = 1;
        }

        // バーチャルスティック入力 (キーボード入力を上書き)
        if (this.virtualStick) { // ★ null チェック
            if (this.virtualStick.isLeft) {
                moveX = -1;
            } else if (this.virtualStick.isRight) {
                moveX = 1;
            }
        }

        // --- 物理ボディを操作 ---
        this.target.body.setVelocityX(moveX * this.moveSpeed);

        // --- ジャンプ入力 (キーボード) ---
        // JustDownを使うことで、押しっぱなしでの連続ジャンプを防ぐ
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.jump();
        }
    }

    jump() {
        // ターゲットが地面に接している場合のみジャンプを許可
        if (this.target && this.target.body && this.target.body.touching.down) {
            this.target.body.setVelocityY(this.jumpVelocity);
        }
    }

    destroy() {
        // コンポーネントが破棄される時に、イベントリスナーを安全に解除する
        if (this.jumpButton) {
            this.jumpButton.off('pointerdown', this.jump, this);
        }
    }
}