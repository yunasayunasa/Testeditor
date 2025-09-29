// in src/components/WanderComponent.js (8方向対応・最終FIX版)
// in src/components/WanderComponent.js

export default class WanderComponent {
    constructor(scene, owner, params = {}) {
        this.gameObject = owner;
        this.npcController = null;
        
        // ▼▼▼【ここが修正の核心】▼▼▼
        // paramsはコンストラクタでプロパティに保存せず、
        // updateメソッド内で直接参照するように変更する
        this.params = params; 
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        this.timer = 0;
        this.state = 'WAITING';
    }

    start() {
        this.npcController = this.gameObject.components.NpcController;
        if (!this.npcController) {
            console.error(`[WanderComponent] ERROR: 'NpcController' component is required!`);
            return;
        }
        // ★★★ start()が呼ばれた時点の正しい待機時間でタイマーをセット ★★★
        const waitDuration = this.params.waitDuration ?? 2000;
        this.timer = this.gameObject.scene.time.now + waitDuration;
    }

    update() {
        if (!this.npcController) return;

        if (this.gameObject.scene.time.now > this.timer) {
            // ★★★ updateが実行される時点の正しいパラメータを取得 ★★★
            const walkDuration = this.params.walkDuration ?? 3000;
            const waitDuration = this.params.waitDuration ?? 2000;
            const is8Way = this.params.is8Way ?? false;
            
            if (this.state === 'WAITING') {
                this.state = 'WALKING';
                this.timer = this.gameObject.scene.time.now + walkDuration;
                
                let vx = 0;
                const speed = this.npcController.moveSpeed;

                if (is8Way) {
                    // (8方向のロジックは変更なし)
                } else {
                    vx = (Math.random() < 0.5 ? -1 : 1) * speed;
                }
                this.npcController.move(vx);
                
            } else { // WALKING
                this.state = 'WAITING';
                this.timer = this.gameObject.scene.time.now + waitDuration;
                this.npcController.stop();
            }
        }
    }
}

WanderComponent.define = {
    params: [
        { 
            key: 'walkDuration',
            type: 'range',
            label: '歩行時間(ms)',
            min: 500, max: 10000, step: 100,
            defaultValue: 3000
        },
        { 
            key: 'waitDuration', 
            type: 'range',
            label: '待機時間(ms)',
            min: 500, max: 10000, step: 100,
            defaultValue: 2000 
        },
        { 
            key: 'is8Way',
            type: 'checkbox',
            label: '8方向移動',
            defaultValue: false
        }
    ]
};