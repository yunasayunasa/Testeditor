// in src/components/AnimationController.js (新規作成)

export default class AnimationController {
    constructor(scene, owner, params = {}) {
        this.gameObject = owner;

        // --- アニメーション名の命名規則を定義 ---
        // 例: 'player_walk_down', 'slime_idle_right'
        // プレフィックス(player, slimeなど)は、オブジェクトの名前に由来すると便利
        this.animPrefix = params.prefix || owner.name.split('_')[0]; 
        
        // --- イベントリスナーを登録 ---
        if (this.gameObject.on) {
            this.gameObject.on('onStateChange', this.handleStateChange, this);
            this.gameObject.on('onDirectionChange', this.handleDirectionChange, this);
        }

        // --- 現在の状態を保持 ---
        this.lastState = 'idle';
        this.lastDirection = 'right';
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

    // アニメーションを更新するメインロジック
    updateAnimation() {
        if (!this.gameObject || !this.gameObject.play) return;
        
        // 8方向対応ロジック
        let directionSuffix = this.lastDirection;
        let flipX = false;
        
        // 左右対称のアニメーションなら、4方向ぶんのアニメだけで済む
        // (up_left, left, down_left は、右向きのアニメを反転させて表現する)
        if (directionSuffix.includes('left')) {
            flipX = true;
            directionSuffix = directionSuffix.replace('left', 'right'); // 'up_left' -> 'up_right'
        }
        
        // アニメーションキーを組み立てる (例: 'player_walk_down_right')
        // 状態がidleなら、向きは無視する設計も可能
        let animKey;
        if (this.lastState === 'idle') {
            animKey = `${this.animPrefix}_idle`;
        } else {
            animKey = `${this.animPrefix}_${this.lastState}_${directionSuffix}`;
        }
        
        // スプライトを反転させる
        this.gameObject.setFlipX(flipX);

        // 組み立てたキーのアニメーションを再生
        // (もしアニメーションが存在すれば再生し、なければ警告を出すだけ)
        if (this.gameObject.anims.exists(animKey)) {
            this.gameObject.play(animKey, true);
        } else {
            // idleアニメーションもない場合は、とりあえず静止させる
            const idleKey = `${this.animPrefix}_idle`;
            if (this.gameObject.anims.exists(idleKey)) {
                this.gameObject.play(idleKey, true);
            } else {
                this.gameObject.stop();
            }
        }
    }

    destroy() {
        // コンポーネントが破棄されるときに、リスナーを解除する
        if (this.gameObject.off) {
            this.gameObject.off('onStateChange', this.handleStateChange, this);
            this.gameObject.off('onDirectionChange', this.handleDirectionChange, this);
        }
    }
}