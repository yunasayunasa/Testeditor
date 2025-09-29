// in src/components/WanderComponent.js

export default class WanderComponent {
    constructor(scene, owner, params = {}) {
        this.gameObject = owner;
        this.npcController = null;
        this.timer = 0;
        this.state = 'WAITING';
        // constructorでは、paramsをプロパティに保存しない！
    }

    start() {
        this.npcController = this.gameObject.components.NpcController;
        if (!this.npcController) {
            console.error(`[WanderComponent] ERROR: 'NpcController' component is required!`);
            return;
        }

        // ▼▼▼【ここが修正の核心】▼▼▼
        // start()が実行された時点の最新のパラメータを取得する
        const myParams = this.getCurrentParams();
        const waitDuration = myParams.waitDuration ?? 2000;
        this.timer = this.gameObject.scene.time.now + waitDuration;
    }

    update() {
        if (!this.npcController) return;

        if (this.gameObject.scene.time.now > this.timer) {
            // ▼▼▼【ここも同様に修正】▼▼▼
            // updateが実行される時点の最新のパラメータを取得する
            const myParams = this.getCurrentParams();
            const walkDuration = myParams.walkDuration ?? 3000;
            const waitDuration = myParams.waitDuration ?? 2000;
            const is8Way = myParams.is8Way ?? false;
            
            if (this.state === 'WAITING') {
                this.state = 'WALKING';
                this.timer = this.gameObject.scene.time.now + walkDuration;
                
                let vx = 0;
                // ★ NpcControllerのmoveSpeedも、常に最新のものを参照する
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

    /**
     * ★★★ 新規ヘルパーメソッド ★★★
     * gameObjectのデータから、自分自身の最新のパラメータ定義を取得する
     */
    getCurrentParams() {
        const allComponentsData = this.gameObject.getData('components') || [];
        const myComponentData = allComponentsData.find(c => c.type === 'WanderComponent');
        return myComponentData ? myComponentData.params : {};
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