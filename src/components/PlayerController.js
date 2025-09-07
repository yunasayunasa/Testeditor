// src/components/PlayerController.js (Matter.js対応・最終完成版)

export default class PlayerController {
    
    constructor(scene, target, params = {}) {
        this.scene = scene;
        this.target = target;
        this.moveSpeed = params.moveSpeed || 4; // ★ Matter.js用に値を調整 (4くらいが丁度良い)
        this.jumpVelocity = params.jumpVelocity || -10; // ★ Matter.js用に値を調整

        this.keyboardEnabled = !!scene.input.keyboard;
        this.cursors = this.keyboardEnabled ? scene.input.keyboard.createKeys() : null;
        
        this.virtualStick = null;
        this.jumpButton = null;

        const uiScene = scene.scene.get('UIScene');
        if (uiScene) {
            this.virtualStick = uiScene.uiElements.get('virtual_stick');
            this.jumpButton = uiScene.uiElements.get('jump_button');

            if (this.jumpButton) {
                this.jumpButton.on('button_pressed', this.jump, this);
            }
        }
    }

    update() {
        if (!this.target || !this.target.body || !this.target.active) return;
        
        let moveX = 0;
        
        if (this.keyboardEnabled && this.cursors) {
            if (this.cursors.left.isDown) moveX = -1;
            if (this.cursors.right.isDown) moveX = 1;
        }

        if (this.virtualStick) {
            const stickDirection = this.virtualStick.direction;
            if (stickDirection.x < -0.5) moveX = -1;
            else if (stickDirection.x > 0.5) moveX = 1;
        }

        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが、Matter.jsでキャラクターを動かす魔法です ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        
        // --- 1. 現在の垂直方向の速度を維持する ---
        const currentVelocityY = this.target.body.velocity.y;

        // --- 2. 新しい速度を設定する ---
        // this.target.body ではなく、gameObject(this.target)自身がメソッドを持つ
        this.target.setVelocityX(moveX * this.moveSpeed);
        
        // --- 3. 水平移動中は、垂直速度を元に戻す ---
        // これをしないと、移動中に重力が効かなくなることがある
        if (moveX !== 0) {
            this.target.setVelocityY(currentVelocityY);
        }
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        
        if (this.keyboardEnabled && this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.jump();
        }
    }

    jump() {
        // Matter.jsでは、touchingプロパティは存在しない。
        // 代わりに、センサーを使って接地判定をするのが一般的だが、
        // 今回はシンプルに「垂直速度がほぼゼロの時」にジャンプ可能とする
        if (this.target && this.target.body) {
            const currentVelocityY = this.target.body.velocity.y;
            if (Math.abs(currentVelocityY) < 0.1) { // ほぼ静止しているか
                // ★ 垂直方向の速度を直接設定してジャンプさせる
                this.target.setVelocityY(this.jumpVelocity);
            }
        }
    }
    
    destroy() {
        if (this.jumpButton) {
            this.jumpButton.off('button_pressed', this.jump, this);
        }
    }
}