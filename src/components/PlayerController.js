//
// Odyssey Engine - PlayerController Component
// Final Architecture: Self-Sufficient Agent for Matter.js
//

export default class PlayerController {
    
    constructor(scene, target, params = {}) {
        this.scene = scene;
        this.target = target;
        this.moveSpeed = params.moveSpeed || 4; 
        this.jumpVelocity = params.jumpVelocity || -10;

        this.keyboardEnabled = !!scene.input.keyboard;
        this.cursors = this.keyboardEnabled ? scene.input.keyboard.createCursorKeys() : null;
        
        this.virtualStick = null;
        this.jumpButton = null;

    }

   
    // ★ メソッド名を updateWithJoystick に変更
    updateWithJoystick(joystick) {
        if (!this.target || !this.target.body || !this.target.active) return;
        
        let moveX = 0;
        
        
        if (this.keyboardEnabled && this.cursors) {
            if (this.cursors.left.isDown) moveX = -1;
            if (this.cursors.right.isDown) moveX = 1;
        }

        // ★★★ Rex Joystick の状態を読み取る ★★★
        if (joystick) {
            if (joystick.left) moveX = -1;
            else if (joystick.right) moveX = 1;
        }
        const currentVelocityY = this.target.body.velocity.y;
        this.target.setVelocityX(moveX * this.moveSpeed);
        if (moveX !== 0) {
            this.target.setVelocityY(currentVelocityY);
        }
        
        if (this.keyboardEnabled && this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.jump();
        }
    }

    jump() {
        if (this.target && this.target.body) {
            const currentVelocityY = this.target.body.velocity.y;
            if (Math.abs(currentVelocityY) < 0.1) {
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