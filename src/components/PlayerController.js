// src/components/PlayerController.js

export default class PlayerController {

    /**
     * コンストラクタ
     * @param {Phaser.Scene} scene - このコンポーネントが所属するシーン
     * @param {Phaser.GameObjects.Sprite} target - このコンポーネントが操作する対象のオブジェクト
     */
    constructor(scene, target) {
        this.scene = scene;
        this.target = target;

        // --- 調整可能なパラメータ ---
        this.moveSpeed = 200;
        this.jumpVelocity = -500;
        
        // --- 内部的な状態 ---
           this.cursors = scene.input.keyboard.createCursorKeys();
        
        // ★★★ UISceneから、UIへの参照を直接取得 ★★★
        const uiScene = scene.scene.get('UIScene');
        this.virtualStick = uiScene ? uiScene.virtualStick : null;
        this.jumpButton = uiScene ? uiScene.jumpButton : null;
        
        if (this.jumpButton) {
            this.jumpButton.on('pointerdown', this.jump, this);
        }
    }

    update() {
        if (!this.target || !this.target.body) return;
        const body = this.target.body;

        // --- 入力ソースから「意図」を読み取る ---
        const left = this.cursors.left.isDown || (this.virtualStick && this.virtualStick.isLeft);
        const right = this.cursors.right.isDown || (this.virtualStick && this.virtualStick.isRight);
        const up = this.cursors.up.isDown; // ジャンプはキーボードのUPキー専用

        // --- 「意図」に基づいて、物理ボディを操作 ---
        if (left) body.setVelocityX(-this.moveSpeed);
        else if (right) body.setVelocityX(this.moveSpeed);
        else body.setVelocityX(0);
        
        if (up) this.jump();
    }

    jump() {
        if (this.target && this.target.body && this.target.body.touching.down) {
            this.target.body.setVelocityY(this.jumpVelocity);
        }
    }

    destroy() {
        if (this.jumpButton) this.jumpButton.off('pointerdown', this.jump, this);
    }
}