//
// Odyssey Engine - PlayerController Component
// src/components/PlayerController.js
export default class PlayerController {
    
    constructor(scene, target, params = {}) {
        this.scene = scene;
        this.gameObject = target;
        this.moveForce = params.moveForce || 0.01;
        this.maxSpeed = params.maxSpeed || 5;
        this.jumpVelocity = params.jumpVelocity || -10;
        this.coyoteTimeThreshold = 100;
        this.lastGroundedTime = 0;

        // --- コンストラクタでは、変数を安全な初期値で定義するだけ ---
        this.cursors = null;
        this.joystick = null; // ★ joystickのプロパティも初期化
        this.keyboardEnabled = false;
        this.isInitialized = false; // ★ 初期化済みかどうかのフラグ

        this.state = 'idle';
        this.direction = 'right';
    }
serialize() {
        return {};
    }

    deserialize(data) {
        // No state to restore for now
    }
    initKeyboard() {
        if (this.isInitialized) return;

        if (this.scene?.input?.keyboard) {
            this.keyboardEnabled = true;
            this.cursors = this.scene.input.keyboard.createCursorKeys();
            console.log("%c[PlayerController] Keyboard cursors initialized successfully.", 'color: lightgreen');
        } else {
            console.warn("[PlayerController] Keyboard input system not available during initKeyboard().");
            this.keyboardEnabled = false;
        }
        this.isInitialized = true;
    }

    update(time, delta) {
        // ★ 1. 最初に、一度だけ初期化処理を呼び出す
        if (!this.isInitialized) {
            this.initKeyboard();
        }
        
        // ★ 2. 毎フレーム、シーンから最新のジョイスティックへの参照を取得する
        //    (resumeで再生成されるため、この処理は必須)
        this.joystick = this.scene.joystick;

        if (!this.gameObject?.scene || !this.gameObject.active) {
            return;
        }

        // --- 以下、元のupdateメソッドの処理 (一部修正) ---

        if (this.state === 'hiding') {
            if (this.gameObject?.body) this.gameObject.setVelocity(0, 0);
            return;
        }

        if (!this.gameObject.body) {
            this.changeState('idle');
            return;
        }
        
        const body = this.gameObject.body;
        
        let moveX = 0;

        // ▼▼▼【ここがロード時のエラーを解決する核心部分】▼▼▼
        // this.cursors が初期化済みであることを確認してからアクセスする
        if (this.keyboardEnabled && this.cursors) { 
            if (this.cursors.left.isDown) moveX = -1;
            else if (this.cursors.right.isDown) moveX = 1;
        }
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        // this.joystick が存在することを確認してからアクセスする
        if (this.joystick) {
            if (this.joystick.left) moveX = -1;
            else if (this.joystick.right) moveX = 1;
        }
        
        let newDirection = this.direction;
        if (moveX < 0) newDirection = 'left';
        else if (moveX > 0) newDirection = 'right';
        if (this.direction !== newDirection) {
            this.direction = newDirection;
            this.gameObject.emit('onDirectionChange', this.direction);
        }
        
        const newVelocityX = moveX * this.maxSpeed;
        const currentVelocityY = body.velocity.y;
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
        
        // this.cursors が初期化済みであることを確認してからアクセスする
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