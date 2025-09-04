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

        // --- 1. まず、全ての入力ソースから「意図」を読み取る ---
        const input = {
            left: this.cursors.left.isDown || (this.virtualStick && this.virtualStick.isLeft),
            right: this.cursors.right.isDown || (this.virtualStick && this.virtualStick.isRight),
            up: this.cursors.up.isDown, // キーボードのUPキー
            // (仮想スティックの上方向は、将来的に別のジャンプアクションなどに使える)
        };

        // --- 2. 読み取った「意図」に基づいて、物理ボディを操作する ---
        const body = this.target.body;
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが、エラーを解決する、正しい書き方です ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // Arcade Physicsの場合 (横スクロール)
        if (input.left) {
            body.setVelocityX(-this.moveSpeed);
        } else if (input.right) {
            body.setVelocityX(this.moveSpeed);
        } else {
            body.setVelocityX(0);
        }
        
        // ジャンプはキーボードのUPキーからのみ
        if (input.up) {
            this.jump();
        }

        // (Matter.js用の8方向移動ロジックは、将来のためにコメントアウトしておくのが安全)
        /*
        if (this.scene.physics.config.default === 'matter') {
            const velocity = new Phaser.Math.Vector2(0, 0);
            if (input.left) velocity.x = -1;
            else if (input.right) velocity.x = 1;
            if (input.up) velocity.y = -1;
            else if (input.down) velocity.y = 1;
            
            velocity.normalize().scale(this.moveSpeed);
            body.setVelocity(velocity.x, velocity.y);
        }
        */
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