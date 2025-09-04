export default class PlayerController {

    constructor(scene, target) {
        this.scene = scene;
        this.target = target;

        // --- 調整可能なパラメータ ---
        this.moveSpeed = 200;
        this.jumpVelocity = -500;
        
        // --- 内部的な状態 ---
        this.cursors = scene.input.keyboard.createCursorKeys();
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが新しいUISceneアーキテクチャとの正しい連携方法です ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        const uiScene = scene.scene.get('UIScene');
        if (uiScene) {
            // UISceneのuiElementsマップから、名前でUIを取得する
            this.virtualStick = uiScene.uiElements.get('virtual_stick');
            this.jumpButton = uiScene.uiElements.get('jump_button'); // jump_buttonも同様
        } else {
            this.virtualStick = null;
            this.jumpButton = null;
        }
        
        if (this.jumpButton) {
            this.jumpButton.on('pointerdown', this.jump, this);
        }
    }

    update() {
        if (!this.target || !this.target.body) return;

        const input = {
            left: this.cursors.left.isDown || (this.virtualStick && this.virtualStick.isLeft),
            right: this.cursors.right.isDown || (this.virtualStick && this.virtualStick.isRight),
            up: this.cursors.up.isDown,
        };
        
        const body = this.target.body;
        
        if (input.left) {
            body.setVelocityX(-this.moveSpeed);
        } else if (input.right) {
            body.setVelocityX(this.moveSpeed);
        } else {
            body.setVelocityX(0);
        }
        
        if (input.up) {
            this.jump();
        }
    }

    jump() {
        if (this.target && this.target.body && this.target.body.touching.down) {
            this.target.body.setVelocityY(this.jumpVelocity);
        }
    }

    destroy() {
        // コンポーネントが破棄される時に、イベントリスナーを解除する
        if (this.jumpButton) {
            this.jumpButton.off('pointerdown', this.jump, this);
        }
    }
}