//
// Odyssey Engine - PlayerController Component
// Final Architecture: Simple Force Method for Stable Control
//

export default class PlayerController {
    
    constructor(scene, target, params = {}) {
        this.scene = scene;
        this.target = target;
        
        // --- パラメータをより直感的に変更 ---
        this.moveForce = params.moveForce || 0.01;      // 左右に押す力の強さ
        this.maxSpeed = params.maxSpeed || 5;           // 最高速度
        this.jumpVelocity = params.jumpVelocity || -10; // ジャンプの初速

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
        
        // --- 1. 入力から、目標とする移動方向（-1, 0, 1）を取得 (変更なし) ---
        let moveX = 0;
        if (this.keyboardEnabled && this.cursors) {
            if (this.cursors.left.isDown) moveX = -1;
            else if (this.cursors.right.isDown) moveX = 1;
        }
        if (joystick) {
            if (joystick.left) moveX = -1;
            else if (joystick.right) moveX = 1;
        }

        // --- 2. 向きの変更を検知 (変更なし) ---
        let newDirection = this.direction;
        if (moveX < 0) newDirection = 'left';
        else if (moveX > 0) newDirection = 'right';
        if (this.direction !== newDirection) {
            this.direction = newDirection;
            this.target.emit('onDirectionChange', this.direction);
        }
        
        // ▼▼▼【ここが振動を止めるための、新しい物理制御ロジックです】▼▼▼

        const currentVelocityX = body.velocity.x;

        // --- 3. 入力があり、かつ最高速度に達していない場合のみ力を加える ---
        if (moveX !== 0 && Math.abs(currentVelocityX) < this.maxSpeed) {
            // ★★★ 非常にシンプル: 入力方向に、決まった大きさの力を加えるだけ ★★★
            this.target.applyForce({ x: moveX * this.moveForce, y: 0 });
        }

        // 減速は、Matter.jsの摩擦(friction)に完全に任せる。
        // 何もしなければ、摩擦で自然に止まる。
        
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        // --- 4. 状態機械のロジック (変更なし) ---
        const isOnGround = this.checkIsOnGround();
        let newState = this.state;

        if (!isOnGround) {
            newState = (body.velocity.y < 0) ? 'jump_up' : 'fall_down';
        } else if (Math.abs(body.velocity.x) > 0.1) { // 閾値は少し調整
            newState = 'walk';
        } else {
            newState = 'idle';
        }
        this.changeState(newState);
        
        // --- 5. キーボードジャンプ (変更なし) ---
        if (this.keyboardEnabled && this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.jump();
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