// src/components/PlayerController.js (超防御的・デバッグ強化版)

export default class PlayerController {

    constructor(scene, target, params = {}) {
        this.scene = scene;
        this.target = target;
        this.params = params; // パラメータを保持

        this.moveSpeed = params.moveSpeed || 200;
        this.jumpVelocity = params.jumpVelocity || -500;
        
        // ★★★ 1. キーボードが存在するかどうかを確認 ★★★
        this.keyboardEnabled = !!scene.input.keyboard; // キーボードサポートの有無をbooleanで保存
        this.cursors = null; // nullで初期化
        if (this.keyboardEnabled) {
            // キーボードが存在する場合のみ、カーソルキーを生成
            this.cursors = scene.input.keyboard.createCursorKeys();
            console.log("[PlayerController] Keyboard input is enabled.");
        } else {
            console.log("[PlayerController] Keyboard input is not available.");
        }
        
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

   
    
      update(time, delta) {
        if (!this.target || !this.target.body || !this.target.active) return;
        
        let moveX = 0;
        
        // ★★★ 2. キーボードが有効な場合のみ、キー入力をチェック ★★★
        if (this.keyboardEnabled && this.cursors) {
            if (this.cursors.left.isDown) moveX = -1;
            if (this.cursors.right.isDown) moveX = 1;
        }

        if (this.virtualStick) {
            if (this.virtualStick.isLeft) moveX = -1;
            if (this.virtualStick.isRight) moveX = 1;
        }

        this.target.body.setVelocityX(moveX * this.moveSpeed);

        // ★★★ 3. キーボードが有効な場合のみ、ジャンプ入力をチェック ★★★
        if (this.keyboardEnabled && this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.jump();
        }
    }

    jump() {
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