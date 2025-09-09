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
        
          this.state = 'idle'; // 初期状態は 'idle' (待機)
        this.direction = 'right'; // 初期方向は 'right'
    }
   /**
     * JumpSceneのupdateから毎フレーム呼ばれる
     * @param {object} joystick - Rex Virtual Joystick のインスタンス
     */
    updateWithJoystick(joystick) {
        // --- 1. ガード節: ターゲットが存在しない場合は 'idle' 状態にして終了 ---
        if (!this.target || !this.target.body || !this.target.active) {
            this.changeState('idle');
            return;
        }
        
        // --- 2. 入力から、左右の移動意志を取得 ---
        let moveX = 0;
        if (this.keyboardEnabled && this.cursors) {
            if (this.cursors.left.isDown) moveX = -1;
            else if (this.cursors.right.isDown) moveX = 1;
        }
        if (joystick) {
            if (joystick.left) moveX = -1;
            else if (joystick.right) moveX = 1;

              // --- 1. 新しい向きを判断する ---
        let newDirection = this.direction;
        if (moveX < 0) {
            newDirection = 'left';
        } else if (moveX > 0) {
            newDirection = 'right';
        }

        // --- 2. 向きが変化した瞬間だけ、イベントを発行する ---
        if (this.direction !== newDirection) {
            this.direction = newDirection;
            this.target.emit('onDirectionChange', this.direction);
            console.log(`%c[PlayerController] Direction changed: -> ${this.direction}`, 'color: magenta');
        }
        }
        
        // --- 3. 物理ボディを操作 ---
        const body = this.target.body;
        const currentVelocityY = body.velocity.y;
        this.target.setVelocityX(moveX * this.moveSpeed);
        // 水平移動中は、垂直速度を維持 (重力の影響を受け続けるため)
        if (moveX !== 0) {
            this.target.setVelocityY(currentVelocityY);
        }
        
        // ★★★ 4. 物理状態から、新しい状態を判断する ★★★
        let newState = this.state;

        // Matter.jsの接地判定は、垂直速度が非常に小さいことで判断するのが一般的
        const isOnGround = Math.abs(body.velocity.y) < 0.1;

        if (!isOnGround) {
            // 地面にいない場合
            newState = (body.velocity.y < 0) ? 'jump_up' : 'fall_down';
        } else if (Math.abs(body.velocity.x) > 0.1) {
            // 地面にいて、水平に動いている場合
            newState = 'walk';
        } else {
            // 地面にいて、動いていない場合
            newState = 'idle';
        }

        // --- 5. 状態が変化した瞬間だけ、イベントを発行する ---
        this.changeState(newState);
        
        // --- 6. キーボードジャンプ処理 ---
        if (this.keyboardEnabled && this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.jump();
        }
    }

    /**
     * 状態を変更し、変更があった場合のみイベントを発行する
     * @param {string} newState - 新しい状態名
     */
    changeState(newState) {
        if (this.state !== newState) {
            const oldState = this.state;
            this.state = newState;
            
            // ★ ターゲットオブジェクト自身に、イベントを発行！
            this.target.emit('onStateChange', newState, oldState);
            console.log(`%c[PlayerController] State changed: ${oldState} -> ${newState}`, 'color: cyan');
        }
    }

    /**
     * JumpSceneやキーボード入力から呼び出される
     */
    jump() {
        if (this.target && this.target.body) {
            // 接地している場合のみジャンプを許可
            if (Math.abs(this.target.body.velocity.y) < 0.1) {
                this.target.setVelocityY(this.jumpVelocity);
                // ★ ジャンプした瞬間に、状態を強制的に 'jump_up' に変更
                this.changeState('jump_up'); 
            }
        }
    }
    
    destroy() {
        if (this.jumpButton) {
            this.jumpButton.off('button_pressed', this.jump, this);
        }
    }

    
}