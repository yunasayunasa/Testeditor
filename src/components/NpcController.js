// in src/components/NpcController.js

export default class NpcController {
    
    constructor(scene, owner, params = {}) {
        this.scene = owner.scene;
        this.gameObject = owner;
        
        // NPC用のパラメータ
        this.moveSpeed = params.moveSpeed || 2;

        // 内部状態の管理用プロパティ（PlayerControllerから引き継ぎ）
        this.state = 'idle';
        this.direction = 'right'; // デフォルトの向き

        // ▼▼▼ 削除するプロパティ ▼▼▼
        // this.moveForce, this.maxSpeed, this.jumpVelocity
        // this.coyoteTimeThreshold, this.lastGroundedTime
        // this.keyboardEnabled, this.cursors
    }
   // updateは削除する。NpcControllerは自律的に動かず、命令を待つだけにする。
    // update(time, delta) { /* ... */ }

    // moveメソッドが、イベント発火の責任も持つ
    move(vx = 0, vy = 0) {
        if (!this.gameObject || !this.gameObject.body) return;
        this.gameObject.setVelocity(vx, vy); // Y方向も受け取れるように
        
        // ★★★ 速度が設定された「直後」に、アニメ用の状態を判定・発火する ★★★
        this.updateAnimationTriggers(vx, vy);
    }
    
    stop() {
        if (!this.gameObject || !this.gameObject.body) return;
        this.gameObject.setVelocity(0, 0);
        this.updateAnimationTriggers(0, 0); // ★ 停止時もイベント発火
    }
    
    /**
     * ★★★ 新しい、外部から向きを命令するためのメソッド ★★★
     * @param {string} newDirection - 'left' または 'right'
     */
    face(newDirection) {
        if (this.direction !== newDirection && (newDirection === 'left' || newDirection === 'right')) {
            const oldDirection = this.direction;
            this.direction = newDirection;
            this.gameObject.emit('onDirectionChange', newDirection, oldDirection);
        }
    }

    /**
     * 速度に基づいてアニメーション用のイベントを発火させるヘルパーメソッド
     * (PlayerControllerから移植し、単純化)
     * @param {number} vx - 現在のX方向の速度
     * @param {number} vy - 現在のY方向の速度
     */
    updateAnimationTriggers(vx, vy) {
        const oldState = this.state;
        
        // Y方向の速度を見て、ジャンプ/落下状態を判定
        if (vy < -0.1) {
            this.state = 'jump_up';
        } else if (vy > 0.1) {
            this.state = 'fall_down';
        } 
        // X方向の速度を見て、歩行/待機状態を判定
        else if (Math.abs(vx) > 0.1) {
            this.state = 'walk';
        } else {
            this.state = 'idle';
        }

        if (this.state !== oldState) {
            this.gameObject.emit('onStateChange', this.state, oldState);
        }
        
        // 向きの判定とイベント発火
        const oldDirection = this.direction;
        if (vx < -0.1) {
            this.direction = 'left';
        } else if (vx > 0.1) {
            this.direction = 'right';
        }
        
        if (this.direction !== oldDirection) {
            this.gameObject.emit('onDirectionChange', this.direction, oldDirection);
        }
    }
    
    // update, updateWithJoystick, jump, checkIsOnGround は不要なので削除
    
    /**
     * コンポーネントが破棄されるときに呼ばれる（念のため用意）
     */
    destroy() {
        this.gameObject = null;
        this.scene = null;
    }
}

NpcController.define = {
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