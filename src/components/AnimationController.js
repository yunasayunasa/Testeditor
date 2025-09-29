// in src/components/AnimationController.js

export default class AnimationController {
    constructor(scene, owner, params = {}) {
        this.gameObject = owner;
        // ★★★ "scene"引数は使わず、ownerから直接シーンを取得する ★★★
        this.scene = owner.scene; 

        this.animPrefix = params.prefix || owner.getData('anim_prefix') || owner.name.split('_')[0]; 
        
        console.log(`[AnimationController] Initialized for '${owner.name}'. Using prefix: '${this.animPrefix}'. Scene key: '${this.scene.scene.key}'`);
        
        this.lastState = 'idle';
        this.lastDirection = 'right';
    }
    
    start() {
        if (this.gameObject.on) {
            this.gameObject.on('onStateChange', this.handleStateChange, this);
            this.gameObject.on('onDirectionChange', this.handleDirectionChange, this);
        }
        this.updateAnimation();
    }

    handleStateChange(newState, oldState) {
        if (this.lastState !== newState) {
            this.lastState = newState;
            this.updateAnimation();
        }
    }

    handleDirectionChange(newDirection, oldDirection) {
        if (this.lastDirection !== newDirection) {
            this.lastDirection = newDirection;
            this.updateAnimation();
        }
    }

    updateAnimation() {
        // ★★★ 安全装置を追加 ★★★
        if (!this.gameObject || !this.gameObject.active || !this.scene) return;
        
        let directionSuffix = this.lastDirection;
        let flipX = false;
        
        if (directionSuffix.includes('left')) {
            flipX = true;
            directionSuffix = directionSuffix.replace('left', 'right');
        }
        
        let animKey;
        if (this.lastState === 'idle') {
            animKey = `${this.animPrefix}_idle`;
        } else {
            animKey = `${this.animPrefix}_${this.lastState}_${directionSuffix}`;
        }

        const currentAnimKey = this.gameObject.anims.currentAnim ? this.gameObject.anims.currentAnim.key : null;
        if (currentAnimKey === animKey) {
            return; 
        }

        // ★★★ シーンのアニメーションマネージャーを直接参照して存在確認 ★★★
        if (this.scene.anims.exists(animKey)) {
            this.gameObject.setFlipX(flipX);
            this.gameObject.play(animKey, true);
        } else {
            console.error(`[AnimationController] ERROR: Animation key '${animKey}' NOT FOUND in scene '${this.scene.scene.key}'!`);
            
            const idleKey = `${this.animPrefix}_idle`;
            if (currentAnimKey !== idleKey && this.scene.anims.exists(idleKey)) {
                this.gameObject.play(idleKey, true);
            } else {
                this.gameObject.stop();
            }
        }
    }

    destroy() {
        if (this.gameObject && this.gameObject.off) {
            this.gameObject.off('onStateChange', this.handleStateChange, this);
            this.gameObject.off('onDirectionChange', this.handleDirectionChange, this);
        }
    }
}