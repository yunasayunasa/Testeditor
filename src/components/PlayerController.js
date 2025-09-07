//
// Odyssey Engine - PlayerController Component
// Final Audited Version: Self-Sufficient Agent
//

export default class PlayerController {
    
    constructor(scene, target, params = {}) {
        this.scene = scene;
        this.target = target;
        this.moveSpeed = params.moveSpeed || 200;
        this.jumpVelocity = params.jumpVelocity || -500;
        
        // --- 1. キーボード入力の初期化 (安全確認済み) ---
        this.keyboardEnabled = !!scene.input.keyboard;
        this.cursors = this.keyboardEnabled ? scene.input.keyboard.createCursorKeys() : null;
        
        // --- 2. UI部品への参照を初期化 ---
        this.virtualStick = null;
        this.jumpButton = null;

        // --- 3. UISceneからUI部品を検索し、イベントをリッスン ---
        const uiScene = scene.scene.get('UIScene');
        if (uiScene) {
            // シーンの準備ができていなくても、参照だけは取得しておく
            this.virtualStick = uiScene.uiElements.get('virtual_stick');
            this.jumpButton = uiScene.uiElements.get('jump_button');

            // ジャンプボタンが存在すれば、その'button_pressed'イベントを待つ
            if (this.jumpButton) {
                this.jumpButton.on('button_pressed', this.jump, this);
            }
        }
    }

    update() {
        if (!this.target || !this.target.body || !this.target.active) {
            return; // ターゲットが無効なら何もしない
        }
        
        let moveX = 0;
        
        // --- キーボード入力 ---
        if (this.keyboardEnabled && this.cursors) {
            if (this.cursors.left.isDown) moveX = -1;
            if (this.cursors.right.isDown) moveX = 1;
        }

        // --- バーチャルスティック入力 ---
        if (this.virtualStick) {
            const stickDirection = this.virtualStick.direction;
            if (stickDirection.x < -0.5) moveX = -1;
            else if (stickDirection.x > 0.5) moveX = 1;
        }

        // --- 物理ボディへの適用 ---
        this.target.body.setVelocityX(moveX * this.moveSpeed);
        
        // --- キーボードジャンプ ---
        if (this.keyboardEnabled && this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.jump();
        }
    }

    jump() {
        if (this.target && this.target.body && this.target.body.touching && this.target.body.touching.down) {
            this.target.body.setVelocityY(this.jumpVelocity);
        }
    }
    
    destroy() {
        // シーン終了時に、ジャンプボタンのリスナーを安全に解除
        if (this.jumpButton) {
            this.jumpButton.off('button_pressed', this.jump, this);
        }
    }
}