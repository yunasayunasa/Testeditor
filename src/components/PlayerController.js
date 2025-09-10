//
// Odyssey Engine - PlayerController Component
// Final Architecture: Force-Based Control for Matter.js
//

export default class PlayerController {
    
    constructor(scene, target, params = {}) {
        this.scene = scene;
        this.target = target;
        
        // --- パラメータの強化 ---
        this.maxSpeed = params.maxSpeed || 5;          // 最高速度
        this.acceleration = params.acceleration || 0.1;  // 加速力
        this.jumpVelocity = params.jumpVelocity || -10;    // ジャンプの初速

        this.keyboardEnabled = !!scene.input.keyboard;
        this.cursors = this.keyboardEnabled ? scene.input.keyboard.createCursorKeys() : null;
        
        this.state = 'idle';
        this.direction = 'right';
    }

    /**
     * JumpSceneのupdateから毎フレーム呼ばれる
     * @param {object} joystick - Rex Virtual Joystick のインスタンス
     */
    updateWithJoystick(joystick) {
        if (!this.target || !this.target.body || !this.target.active) {
            this.changeState('idle');
            return;
        }
        
        const body = this.target.body;
        
        // --- 1. 入力から、目標とする移動方向（-1, 0, 1）を取得 ---
        let moveX = 0;
        if (this.keyboardEnabled && this.cursors) {
            if (this.cursors.left.isDown) moveX = -1;
            else if (this.cursors.right.isDown) moveX = 1;
        }
        if (joystick) {
            if (joystick.left) moveX = -1;
            else if (joystick.right) moveX = 1;
        }

        // --- 2. 向きの変更を検知し、イベントを発行 ---
        let newDirection = this.direction;
        if (moveX < 0) newDirection = 'left';
        else if (moveX > 0) newDirection = 'right';
        if (this.direction !== newDirection) {
            this.direction = newDirection;
            this.target.emit('onDirectionChange', this.direction);
        }
        
        // ▼▼▼【ここからが物理制御の核心です】▼▼▼

        // --- 3. 目標速度と現在の速度の差から、加えるべき力を計算 ---
        const targetVelocityX = moveX * this.maxSpeed;
        const currentVelocityX = body.velocity.x;
        const velocityDifference = targetVelocityX - currentVelocityX;

        // 加える力の計算（目標速度に近づくように、差分に応じた力を加える）
        const forceX = this.acceleration * velocityDifference;

        // --- 4. 物理エンジンに「力を加える」よう依頼 ---
        // これにより、他のコンポーネントからの力と安全に共存できる
        this.target.applyForce({ x: forceX, y: 0 });

        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        // --- 5. 状態機械のロジック (変更なし、ただし接地判定を強化) ---
        const isOnGround = this.checkIsOnGround();
        let newState = this.state;

        if (!isOnGround) {
            newState = (body.velocity.y < 0) ? 'jump_up' : 'fall_down';
        } else if (Math.abs(body.velocity.x) > 0.2) { // 少し閾値を上げる
            newState = 'walk';
        } else {
            newState = 'idle';
        }
        this.changeState(newState);
        
        // --- 6. キーボードジャンプ (変更なし) ---
        if (this.keyboardEnabled && this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.jump();
        }
    }

    /**
     * 状態を変更し、変更があった場合のみイベントを発行する (変更なし)
     */
    changeState(newState) {
        if (this.state !== newState) {
            const oldState = this.state;
            this.state = newState;
            this.target.emit('onStateChange', newState, oldState);
            console.log(`%c[PlayerController] State changed: ${oldState} -> ${newState}`, 'color: cyan');
        }
    }

    /**
     * ジャンプ命令
     */
    jump() {
        if (this.target && this.target.body && this.checkIsOnGround()) {
            // ジャンプは初速を与える「一度きりの命令」なので、setVelocityYは適切
            this.target.setVelocityY(this.jumpVelocity);
            this.changeState('jump_up'); 
        }
    }

    /**
     * Matter.js用の、より信頼性の高い接地判定メソッド
     * @returns {boolean} 地面に接しているかどうか
     */
    checkIsOnGround() {
        if (!this.target || !this.target.body) return false;
        
        const world = this.scene.matter.world;
        const body = this.target.body;
        const bounds = body.bounds;
        const checkY = bounds.max.y + 1; // ボディの底面の少し下をチェック

        // ボディの底面の左右と中央の3点をチェック
        const pointsToCheck = [
            { x: bounds.min.x, y: checkY },
            { x: body.position.x, y: checkY },
            { x: bounds.max.x, y: checkY }
        ];

        for (const point of pointsToCheck) {
            const bodies = world.queryPoint(point);
            if (bodies.length > 1) { // 1つ以上（自分自身以外）のボディがあれば接地している
                return true;
            }
        }
        return false;
    }
    
    destroy() {
       // クリーンアップ処理
    }
}