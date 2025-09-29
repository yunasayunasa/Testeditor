// in src/components/AnimationController.js

export default class AnimationController {
    constructor(scene, owner, params = {}) {
        this.gameObject = owner;

        this.animPrefix = params.prefix || owner.getData('anim_prefix') || owner.name.split('_')[0]; 
        
        console.log(`[AnimationController] Initialized for '${owner.name}'. Using animation prefix: '${this.animPrefix}'`);
        
        // --- 1. 内部状態を先に保持 ---
        this.lastState = 'idle';
        this.lastDirection = 'right';

        // --- 2. イベントリスナーを登録 ---
        if (this.gameObject.on) {
            this.gameObject.on('onStateChange', this.handleStateChange, this);
            this.gameObject.on('onDirectionChange', this.handleDirectionChange, this);
        }

        // ▼▼▼【これが最後の修正です】▼▼▼
        // --------------------------------------------------------------------
        // --- 3. 初期状態のアニメーションを即座に適用する ---
        //    少し遅延させて呼び出すことで、他のコンポーネントの準備が整うのを待つ
        setTimeout(() => {
            if (this.gameObject && this.gameObject.active) {
                this.updateAnimation();
            }
        }, 0);
        // --------------------------------------------------------------------
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    }
    

    // stateが変化したときに呼ばれる
    handleStateChange(newState, oldState) {
        this.lastState = newState;
        this.updateAnimation();
    }

    // directionが変化したときに呼ばれる
    handleDirectionChange(newDirection, oldDirection) {
        this.lastDirection = newDirection;
        this.updateAnimation();
    }

    // in src/components/AnimationController.js

// ... (constructorや他のメソッドはそのまま) ...

// アニメーションを更新するメインロजिक
updateAnimation() {
    if (!this.gameObject || !this.gameObject.scene || !this.gameObject.active || !this.gameObject.play) return;
    
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
    
    // ▼▼▼【ここから修正版デバッグコード】▼▼▼
    
    // 安全に現在のアニメーションキーを取得する
    const currentAnimKey = this.gameObject.anims.currentAnim ? this.gameObject.anims.currentAnim.key : null;
    
    // ログを出力して状況を把握する
    // console.log(`[AnimationController] State: '${this.lastState}', Direction: '${this.lastDirection}'. Attempting to play key: '${animKey}'`);
    
    // 再生しようとしているアニメーションが、既に再生中のものと同じなら、何もしない
    if (currentAnimKey === animKey) {
        return; 
    }

    // 目的のアニメーションが存在するかチェック
    if (this.gameObject.anims.exists(animKey)) {
        // console.log(`%cSUCCESS: Animation key '${animKey}' found. Playing.`, 'color: green; font-weight: bold;');
        this.gameObject.setFlipX(flipX);
        this.gameObject.play(animKey, true);
    } else {
        // 存在しない場合、エラーをコンソールに出力
        console.error(`%c[AnimationController] ERROR: Animation key '${animKey}' NOT FOUND!`, 'color: red; font-weight: bold;');
        
        // 代わりにアイドルアニメーションを再生しようと試みる (フォールバック)
        const idleKey = `${this.animPrefix}_idle`;
        if (currentAnimKey !== idleKey && this.gameObject.anims.exists(idleKey)) {
            this.gameObject.play(idleKey, true);
        } else if (!this.gameObject.anims.exists(idleKey)) {
            // アイドルすらない場合はアニメーションを停止
            this.gameObject.stop();
        }
    }
    // ▲▲▲【ここまで修正版デバッグコード】▲▲▲
}

// ... (destroyメソッドなどはそのまま) ...

    destroy() {
        // コンポーネントが破棄されるときに、リスナーを解除する
        if (this.gameObject.off) {
            this.gameObject.off('onStateChange', this.handleStateChange, this);
            this.gameObject.off('onDirectionChange', this.handleDirectionChange, this);
        }
    }
}

/*
アニメーションキーの命名規則:
アニメーションキーは、必ず**[プレフィックス]_[状態]_[向き]**という形式で命名しなければならない。
例: player_walk_right, slime_idle_down
（idleのように向きがないものは[プレフィックス]_[状態]）
アニメーションの対称性:
左向きのアニメーション（walk_leftなど）は作らず、右向きのアニメーション（walk_right）を**setFlipX(true)で反転させて表現する**ことを基本とする。
（左右非対称なキャラクターの場合は、AnimationControllerを少し改造して、walk_leftも個別に再生できるようにすることも可能です）
コンポーネントの依存関係:
AnimationControllerは、同じオブジェクトにPlayerControllerやNpcControllerのような、onStateChangeとonDirectionChangeイベントを発火させるコンポーネントが存在することを前提とする。*/