//
// Odyssey Engine - PlayerController Component
// Final Architecture: With Coyote Time for Robust Jumping
//

export default class PlayerController {
    
    constructor(scene, target, params = {}) {
        this.scene = scene;
        this.gameObject = target; // ★★★ this.target を this.gameObject に変更 ★★★
      //   this.scene.events.on('update', this.update, this);
        this.moveForce = params.moveForce || 0.01;
        this.maxSpeed = params.maxSpeed || 5;
        this.jumpVelocity = params.jumpVelocity || -10;

        this.coyoteTimeThreshold = 100;
        this.lastGroundedTime = 0;

        this.keyboardEnabled = !!scene.input.keyboard;
        this.cursors = this.keyboardEnabled ? scene.input.keyboard.createCursorKeys() : null;
        
        this.state = 'idle';
        this.direction = 'right';
    }

    /**
     * ★★★ 新設：シリアライズ処理 ★★★
     * PlayerControllerの状態をセーブデータに書き出す。
     * @returns {object} 保存すべき状態のオブジェクト
     */
    serialize() {
        // 今のところPlayerController自体に保存すべき特別な状態はないので、
        // 空のオブジェクトを返すだけで十分。
        // （例：もし無敵時間などがあれば { isInvincible: this.isInvincible } のように返す）
        return {
            // 将来の拡張のために空のオブジェクトを返す
        };
    }

    /**
     * ★★★ 新設：デシリアライズ処理 ★★★
     * セーブデータからPlayerControllerの状態を復元する。
     * @param {object} data - serialize()が返したオブジェクト
     */
    deserialize(data) {
        // セーブデータから復元すべき状態があれば、ここで適用する。
        // 今は何もしなくてよい。
        // （例：this.isInvincible = data.isInvincible;）
    }

    update(time, delta) {
          // もし、自分が所属するGameObjectが、もはやシーンに存在しない、
    // あるいは非アクティブになっているなら、自分は「ゴースト」である。
    // 即座に全ての処理を中断し、二度と動かないようにする。
    if (!this.gameObject || !this.gameObject.scene || !this.gameObject.active) {
        // (オプション) デバッグ用に、ゴーストが動こうとしたことを記録する
        // console.warn("[PlayerController] Ghost instance detected. Halting update.");
        return;
    }
        const joystick = this.scene.joystick; // ★ シーンから直接取得

        if (this.state === 'hiding') {
            if (this.gameObject?.body) this.gameObject.setVelocity(0, 0);
            return;
        }
        // ★★★ this.target を this.gameObject に変更 ★★★
        if (!this.gameObject || !this.gameObject.body || !this.gameObject.active) {
            this.changeState('idle');
            return;
        }
        
        // ★★★ this.target を this.gameObject に変更 ★★★
        const body = this.gameObject.body;
        
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
            // ★★★ this.target を this.gameObject に変更 ★★★
            this.gameObject.emit('onDirectionChange', this.direction);
        }
        
        // applyForceをやめて、setVelocityで直接速度を制御する

    // 1. 新しいX方向の速度を計算する
    const newVelocityX = moveX * this.maxSpeed;

    // 2. Y方向の速度は現在のものを維持する（ジャンプ中に落下が止まらないように）
    const currentVelocityY = body.velocity.y;

    // 3. 計算した速度を物理ボディに直接設定する
    this.gameObject.setVelocity(newVelocityX, currentVelocityY);

        const isOnGround = this.checkIsOnGround();

        if (isOnGround) {
            this.lastGroundedTime = this.scene.time.now;
        }

        let newState = this.state;
        if (!isOnGround) {
            newState = (body.velocity.y < 0) ? 'jump_up' : 'fall_down';
        } else if (Math.abs(body.velocity.x) > 0.1) {
            newState = 'walk';
        } else {
            newState = 'idle';
        }
        this.changeState(newState);
        
        if (this.keyboardEnabled && this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.jump();
        }
    }

    jump() {
        // ★★★ this.target を this.gameObject に変更 ★★★
        if (!this.gameObject || !this.gameObject.body) return;

        const timeSinceGrounded = this.scene.time.now - this.lastGroundedTime;

        if (timeSinceGrounded <= this.coyoteTimeThreshold) {
            // ★★★ this.target を this.gameObject に変更 ★★★
            this.gameObject.setVelocityY(this.jumpVelocity);
            this.changeState('jump_up');
            
            this.lastGroundedTime = 0; 
        }
    }

    changeState(newState) {
        if (this.state !== newState) {
            const oldState = this.state;
            this.state = newState;
            // ★★★ this.target を this.gameObject に変更 ★★★
            this.gameObject.emit('onStateChange', newState, oldState);
        }
    }

    checkIsOnGround() {
        // ★★★ this.target を this.gameObject に変更 ★★★
        if (!this.gameObject || !this.gameObject.body) return false;
        const body = this.gameObject.body;
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
    

    toggleHiding(hidingSpot) {
    // ▼▼▼【ここからデバッグログを追加】▼▼▼
    console.group(`%c[DEBUG] PlayerController.toggleHiding Called!`, 'color: lightgreen; font-weight: bold;');
    console.log(`Current state is: '${this.state}'`);

    if (this.state === 'hiding') {
        console.log("Action: Calling unhide()...");
        this.unhide();
    } else {
        console.log("Action: Calling hide()...");
        this.hide(hidingSpot);
    }
    console.groupEnd();
}
// in src/components/PlayerController.js

// ★★★ カテゴリを変更する、最終・確定版 ★★★
hide(hidingSpot) {
    if (this.state === 'hiding') return;
    const oldState = this.state;
    this.state = 'hiding';
    this.gameObject.emit('onStateChange', 'hiding', oldState);
    
    this.gameObject.setAlpha(0.5);
    
    if (this.gameObject.body) {
        const physicsDefine = this.scene.registry.get('physics_define');
        if (physicsDefine?.categories.HIDDEN) {
            // ★ カテゴリを'HIDDEN'に変更する
            this.gameObject.setCollisionCategory(physicsDefine.categories.HIDDEN);
        }
    }
    
    this.gameObject.setData('group', 'hidden');
}

// ★★★ カテゴリを元に戻す、最終・確定版 ★★★
unhide() {
    if (this.state !== 'hiding') return;
    
    this.gameObject.setAlpha(1); 
    
    if (this.gameObject.body) {
        const physicsDefine = this.scene.registry.get('physics_define');
        if (physicsDefine?.categories.player) {
            // ★ カテゴリを'player'に戻す
            this.gameObject.setCollisionCategory(physicsDefine.categories.player);
        }
    }

    this.gameObject.setData('group', 'player');
    
    const oldState = this.state;
    this.state = 'idle';
    this.gameObject.emit('onStateChange', 'idle', oldState);
}
    destroy()
    {
    //this.scene.events.off('update', this.update, this); 
}
}

PlayerController.define = {
    params: [
        { 
            key: 'moveSpeed',
            type: 'range',
            label: 'moveSpeed',
            min: 1,
            max: 20,
            step: 0.5,
            defaultValue: 4
        }
        // ★ 将来的にジャンプ力などもパラメータにしたくなったら、ここに追加する
        // { key: 'jumpVelocity', type: 'range', ... }
    ]
};