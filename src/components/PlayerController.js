//
// Odyssey Engine - PlayerController Component
// Final Architecture: With Coyote Time for Robust Jumping
//

export default class PlayerController {
    
    constructor(scene, target, params = {}) {
        this.scene = scene;
        this.target = target;
        
        this.moveForce = params.moveForce || 0.01;
        this.maxSpeed = params.maxSpeed || 5;
        this.jumpVelocity = params.jumpVelocity || -10;

        // ★★★ コヨーテ・タイム用のパラメータを追加 ★★★
        this.coyoteTimeThreshold = 100; // 100ミリ秒 (0.1秒) の猶予
        this.lastGroundedTime = 0;      // 最後に地面にいた時刻

        this.keyboardEnabled = !!scene.input.keyboard;
        this.cursors = this.keyboardEnabled ? scene.input.keyboard.createCursorKeys() : null;
        
        this.state = 'idle';
        this.direction = 'right';
    }

    updateWithJoystick(joystick) {
        if (!this.target || !this.target.body || !this.target.active) {
            this.changeState('idle');
            return;
        }
        
        const body = this.target.body;
        
        // ... (入力取得と向きの変更ロジックは変更なし) ...
        let moveX = 0;
        if (this.keyboardEnabled && this.cursors) {
            if (this.cursors.left.isDown) moveX = -1;
            else if (this.cursors.right.isDown) moveX = 1;
        }
        if (joystick) {
            if (joystick.left) moveX = -1;
            else if (joystick.right) moveX = 1;
        }
        let newDirection = this.direction;
        if (moveX < 0) newDirection = 'left';
        else if (moveX > 0) newDirection = 'right';
        if (this.direction !== newDirection) {
            this.direction = newDirection;
            this.target.emit('onDirectionChange', this.direction);
        }
        
        // ... (力ベースの移動ロジックも変更なし) ...
        const currentVelocityX = body.velocity.x;
        if (moveX !== 0 && Math.abs(currentVelocityX) < this.maxSpeed) {
            this.target.applyForce({ x: moveX * this.moveForce, y: 0 });
        }

        // ▼▼▼【ここからが状態管理の核心です】▼▼▼
        
        const isOnGround = this.checkIsOnGround();

        // --- 1. 接地している瞬間を記録する ---
        if (isOnGround) {
            this.lastGroundedTime = this.scene.time.now;
        }

        // --- 2. 状態機械のロジック ---
        let newState = this.state;
        if (!isOnGround) {
            newState = (body.velocity.y < 0) ? 'jump_up' : 'fall_down';
        } else if (Math.abs(body.velocity.x) > 0.1) {
            newState = 'walk';
        } else {
            newState = 'idle';
        }
        this.changeState(newState);
        
        // ... (キーボードジャンプは変更なし) ...
        if (this.keyboardEnabled && this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.jump();
        }
    }

    jump() {
        if (!this.target || !this.target.body) return;

        // ▼▼▼【ジャンプの門番を、コヨーテ・タイムを使うように変更】▼▼▼
        const timeSinceGrounded = this.scene.time.now - this.lastGroundedTime;

        // ★★★「最後に地面にいてから、まだ猶予時間内か？」をチェックする★★★
        if (timeSinceGrounded <= this.coyoteTimeThreshold) {
            this.target.setVelocityY(this.jumpVelocity);
            this.changeState('jump_up');
            
            // 一度ジャンプしたら、猶予時間を無効化して連続ジャンプを防ぐ
            this.lastGroundedTime = 0; 
        }
    }

    // ... changeState, jump, checkIsOnGround, destroy メソッドは前回の修正のままでOK ...
    changeState(newState) {
        if (this.state !== newState) {
            const oldState = this.state;
            this.state = newState;
            this.target.emit('onStateChange', newState, oldState);
        }
    }

    jump() {
        if (this.target && this.target.body && this.checkIsOnGround()) {
            this.target.setVelocityY(this.jumpVelocity);
            this.changeState('jump_up'); 
        }
    }

    checkIsOnGround() {
        if (!this.target || !this.target.body) return false;
        const body = this.target.body;
        const bounds = body.bounds;
        const allBodies = this.scene.matter.world.getAllBodies();
        const checkY = bounds.max.y + 1;
        const pointsToCheck = [
            { x: bounds.min.x + 1, y: checkY },
            { x: body.position.x, y: checkY },
            { x: bounds.max.x - 1, y: checkY }
        ];
        for (const point of pointsToCheck) {
            const bodiesAtPoint = this.scene.matter.query.point(allBodies, point);
            const filteredBodies = bodiesAtPoint.filter(b => b.id !== body.id);
            if (filteredBodies.length > 0) return true;
        }
        return false;
    }
    
    destroy() { /* ... */ }
}