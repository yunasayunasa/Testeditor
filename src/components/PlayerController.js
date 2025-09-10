//
// Odyssey Engine - PlayerController Component
// Final Architecture: Force-Based Control for Matter.js
//

export default class PlayerController {
    
    constructor(scene, target, params = {}) {
        this.scene = scene;
        this.target = target;
        
        this.maxSpeed = params.maxSpeed || 5;
        this.acceleration = params.acceleration || 0.1;
        this.jumpVelocity = params.jumpVelocity || -10;

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
        
        const targetVelocityX = moveX * this.maxSpeed;
        const currentVelocityX = body.velocity.x;
        const velocityDifference = targetVelocityX - currentVelocityX;
        const forceX = this.acceleration * velocityDifference;

        this.target.applyForce({ x: forceX, y: 0 });

        const isOnGround = this.checkIsOnGround();
        let newState = this.state;

        if (!isOnGround) {
            newState = (body.velocity.y < 0) ? 'jump_up' : 'fall_down';
        } else if (Math.abs(body.velocity.x) > 0.2) {
            newState = 'walk';
        } else {
            newState = 'idle';
        }
        this.changeState(newState);
        
        if (this.keyboardEnabled && this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.jump();
        }
    }

    changeState(newState) {
        if (this.state !== newState) {
            const oldState = this.state;
            this.state = newState;
            this.target.emit('onStateChange', newState, oldState);
            console.log(`%c[PlayerController] State changed: ${oldState} -> ${newState}`, 'color: cyan');
        }
    }

    jump() {
        if (this.target && this.target.body && this.checkIsOnGround()) {
            this.target.setVelocityY(this.jumpVelocity);
            this.changeState('jump_up'); 
        }
    }

    /**
     * Matter.js用の、より信頼性の高い接地判定メソッド (Phaser 3 API修正版)
     * @returns {boolean} 地面に接しているかどうか
     */
    checkIsOnGround() {
        if (!this.target || !this.target.body) return false;
        
        const body = this.target.body;
        const bounds = body.bounds;

        // --- Step 1: ワールドに存在する全ての物理ボディを取得 ---
        const allBodies = this.scene.matter.world.getAllBodies();

        // --- Step 2: チェックするポイントを定義 ---
        const checkY = bounds.max.y + 1; // ボディの底面の少し下
        const pointsToCheck = [
            { x: bounds.min.x + 1, y: checkY }, // 左右の端を少し内側にする
            { x: body.position.x, y: checkY },
            { x: bounds.max.x - 1, y: checkY }
        ];

        // --- Step 3: 各ポイントで、Phaserの正しいAPIを使ってクエリを実行 ---
        for (const point of pointsToCheck) {
            // ★★★ これがPhaser 3における正しい呼び出し方です ★★★
            const bodiesAtPoint = this.scene.matter.query.point(allBodies, point);

            // 自分自身のボディを除外して、何かにヒットしたかを確認
            const filteredBodies = bodiesAtPoint.filter(b => b.id !== body.id);
            if (filteredBodies.length > 0) {
                return true; // 自分以外の物体が見つかれば、即座に「接地している」と判断
            }
        }
        
        return false; // ループを抜けても何も見つからなければ接地していない
    }
    
    destroy() {
       // クリーンアップ処理
    }
}