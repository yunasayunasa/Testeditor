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

   
    
    update(time, delta) {
        // --- ステップ1: ターゲットの存在確認 ---
        if (!this.target || !this.target.active) {
             console.log("[PC-Debug] Target is null or inactive. Skipping.");
            return;
        }
        
        // --- ステップ2: 物理ボディの存在確認 ---
        const body = this.target.body;
        if (!body) {
            console.warn(`[PC-Debug] Target '${this.target.name}' has NO physics body. Skipping.`);
            return;
        }

        // --- ステップ3: 入力状態の取得 ---
        let moveX = 0;
        if (this.cursors.left.isDown) moveX = -1;
        if (this.cursors.right.isDown) moveX = 1;

        if (this.virtualStick) {
            if (this.virtualStick.isLeft) moveX = -1;
            if (this.virtualStick.isRight) moveX = 1;
        }
        
        // ★★★ 核心となるデバッグログ ★★★
        if (moveX !== 0) {
            console.log(`[PC-Debug] Frame ${Math.round(time)}: Input detected. moveX = ${moveX}. Applying velocity...`);
            console.log(`[PC-Debug] Body before velocity change:`, {
                x: body.x,
                y: body.y,
                vx: body.velocity.x,
                vy: body.velocity.y,
                isStatic: body.isStatic,
                allowGravity: body.allowGravity,
                moves: body.moves
            });
        }
        // ★★★★★★★★★★★★★★★★★★★★★★

        // --- ステップ4: 物理ボディへの速度設定 ---
        body.setVelocityX(moveX * this.moveSpeed);

        // --- ステップ5: ジャンプ入力 ---
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.jump();
        }
    }

    jump() {
        if (this.target && this.target.body && this.target.body.touching.down) {
            console.log("[PC-Debug] Jump condition met. Applying velocity.");
            this.target.body.setVelocityY(this.jumpVelocity);
        }
    }

    // ... (destroy は変更なし) ...
}

    destroy() {
        // コンポーネントが破棄される時に、イベントリスナーを安全に解除する
        if (this.jumpButton) {
            this.jumpButton.off('pointerdown', this.jump, this);
        }
    }
}