// src/components/PlayerController.js (命令待機・最終完成版)

export default class PlayerController {
    
    constructor(scene, target, params = {}) {
        this.scene = scene;
        this.target = target;
        this.moveSpeed = params.moveSpeed || 200;
        this.jumpVelocity = params.jumpVelocity || -500;
        
        this.keyboardEnabled = !!scene.input.keyboard;
        this.cursors = this.keyboardEnabled ? scene.input.keyboard.createCursorKeys() : null;
    }

    /** JumpSceneのupdateから毎フレーム呼ばれる */
    updateWithStick(stickDirection) {
        if (!this.target || !this.target.body || !this.target.active) return;
        
        let moveX = 0;
        
        // --- キーボード入力 (PC向け) ---
        if (this.keyboardEnabled && this.cursors) {
            if (this.cursors.left.isDown) moveX = -1;
            if (this.cursors.right.isDown) moveX = 1;
        }

        // --- スティック入力 (JumpSceneから渡された方向ベクトルを使う) ---
        if (stickDirection.x < -0.5) moveX = -1;
        else if (stickDirection.x > 0.5) moveX = 1;

        this.target.body.setVelocityX(moveX * this.moveSpeed);
        
        if (this.keyboardEnabled && this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.jump();
        }
    }

    // jumpメソッドはJumpSceneや自分自身から呼ばれる
    jump() {
        if (this.target && this.target.body && this.target.body.touching && this.target.body.touching.down) {
            this.target.body.setVelocityY(this.jumpVelocity);
        }
    }
}