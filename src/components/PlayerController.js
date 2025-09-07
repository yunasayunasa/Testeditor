//
// Odyssey Engine - PlayerController Component
// Final Architecture: Self-Sufficient Agent
//

export default class PlayerController {
    
    constructor(scene, target, params = {}) {
        this.scene = scene;
        this.target = target;
        this.moveSpeed = params.moveSpeed || 200;
        this.jumpVelocity = params.jumpVelocity || -500;
        
        this.keyboardEnabled = !!scene.input.keyboard;
        this.cursors = this.keyboardEnabled ? scene.input.keyboard.createCursorKeys() : null;
        
        this.virtualStick = null;
        this.jumpButton = null;

        // --- UI要素を自分で探しに行く ---
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
            // ★★★ directionを直接参照する ★★★
            const stickDirection = this.virtualStick.direction;
            if (stickDirection.x < -0.5) moveX = -1;
            else if (stickDirection.x > 0.5) moveX = 1;
        }

        this.target.body.setVelocityX(moveX * this.moveSpeed);
        
        if (this.keyboardEnabled && this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.jump();
        }
    }

 
    // jumpメソッドは、キーボードとジャンプボタンの両方から呼ばれる共通の処理
    jump() {
        // ★★★ touchingがnullの場合も考慮する、より安全なチェック ★★★
        if (this.target && this.target.body && this.target.body.touching && this.target.body.touching.down) {
            this.target.body.setVelocityY(this.jumpVelocity);
        }
    }

 
      
    destroy() {
        if (this.jumpButton) {
            this.jumpButton.off('button_pressed', this.jump, this);
        }
    }
}