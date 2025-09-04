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
    }

    /**
     * シーンのupdateループから、毎フレーム呼び出されるメソッド
     */
       update() {
        if (!this.target || !this.target.body) {
            return;
        }

        const body = this.target.body;

        // --- 左右の移動 (変更なし) ---
        if (this.cursors.left.isDown) {
            body.setVelocityX(-this.moveSpeed);
        } else if (this.cursors.right.isDown) {
            body.setVelocityX(this.moveSpeed);
        } else {
            body.setVelocityX(0);
        }
        
        

        // --- 1. ジャンプのコメントアウトを解除 ---
        if (this.cursors.up.isDown && body.touching.down) {
            body.setVelocityY(this.jumpVelocity);
        }
        
      
    }

    /**
     * このコンポーネントが破棄される時に呼ばれるメソッド
     * (イベントリスナーなどを解除するために使う)
     */
    destroy() {
        // (今回はキーボードカーソルをシーンから拝借しているだけなので、
        //  特別な破棄処理は不要)
        console.log(`[PlayerController] for '${this.target.name}' destroyed.`);
    }
}