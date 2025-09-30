// in src/components/ChaseComponent.js

export default class ChaseComponent {

    constructor(scene, owner, params = {}) {
        this.gameObject = owner;
        this.scene = owner.scene;
        
        // --- 依存コンポーネントへの参照 ---
        this.npcController = null;
        this.returnHome = null;

        // --- IDEで編集可能なパラメータ ---
        this.targetGroup = params.targetGroup || 'player';
        this.detectionRadius = params.detectionRadius || 250;
        this.giveUpRadius = params.giveUpRadius || 500;
        this.chaseSpeed = params.chaseSpeed || 3;
        
        // --- 内部状態 ---
        this.state = 'IDLE'; // 'IDLE' (監視中), 'CHASING' (追跡中)
        this.chaseTarget = null;
    }

    /**
     * すべてのコンポーネントが生成された後に呼び出される。
     * 依存関係の解決を行う。
     */
    start() {
        this.npcController = this.gameObject.components.NpcController;
        if (!this.npcController) {
            console.error(`[ChaseComponent] ERROR: 'NpcController' is required on '${this.gameObject.name}'. This component will be disabled.`);
            this.enabled = false; // 依存コンポーネントがない場合、自身を無効化する
        }
        
        // ReturnHomeComponentはオプションなので、なくてもエラーにはしない
        this.returnHome = this.gameObject.components.ReturnHomeComponent;
    }

    /**
     * BaseGameSceneから毎フレーム呼び出される。
     */
    update(time, delta) {
        if (!this.npcController || !this.gameObject.active || this.enabled === false) {
            return;
        }
        
        // --- 1. ターゲットの検索と距離の計算 ---
        if (!this.chaseTarget || !this.chaseTarget.active) {
            this.chaseTarget = this.findClosestTarget();
        }

        if (!this.chaseTarget) {
            if (this.state === 'CHASING') {
                this.stopChasing();
            }
            return;
        }
        const distanceToTarget = Phaser.Math.Distance.BetweenPoints(this.gameObject, this.chaseTarget);

        // --- 2. 状態遷移ロジック ---
        switch (this.state) {
            case 'IDLE':
                if (distanceToTarget < this.detectionRadius) {
                    this.startChasing();
                }
                break;
            case 'CHASING':
                if (distanceToTarget > this.giveUpRadius) {
                    this.stopChasing();
                }
                break;
        }

        // --- 3. 行動実行ロジック ---
        if (this.state === 'CHASING') {
            const angle = Phaser.Math.Angle.BetweenPoints(this.gameObject, this.chaseTarget);
            const vx = Math.cos(angle) * this.chaseSpeed;
            const vy = Math.sin(angle) * this.chaseSpeed;
            this.npcController.move(vx, vy);
        }
    }

    /**
     * 追跡を開始する際の内部処理。
     * 他の行動コンポーネントに行動の優先権を主張するイベントを発火させる。
     */
    startChasing() {
        if (this.state === 'CHASING') return; // 既に追跡中なら何もしない
        this.state = 'CHASING';
        
        // 「私が身体の制御を開始する」というイベントをブロードキャストする
        this.gameObject.emit('onAiBehaviorChange', {
            source: 'ChaseComponent', // イベントの発信源
            active: true             // 支配を開始したことを示す
        });
        console.log(`[ChaseComponent] ${this.gameObject.name} started chasing ${this.chaseTarget.name}.`);
    }

    /**
     * 追跡を停止する際の内部処理。
     * 他の行動コンポーネントに行動の優先権を明け渡すイベントを発火させる。
     */
    stopChasing() {
        if (this.state === 'IDLE') return; // 既に待機中なら何もしない
        this.state = 'IDLE';
        this.npcController.stop();

        // 「私が身体の制御を終了した」というイベントをブロードキャストする
        this.gameObject.emit('onAiBehaviorChange', {
            source: 'ChaseComponent',
            active: false
        });
        console.log(`[ChaseComponent] ${this.gameObject.name} stopped chasing.`);

        // 連携するコンポーネントがいれば、追跡終了を通知する
        if (this.returnHome && typeof this.returnHome.startReturning === 'function') {
            this.returnHome.startReturning();
        }
    }

    /**
     * シーンから、パラメータで指定されたtargetGroupに所属する最も近いオブジェクトを探す。
     * @returns {Phaser.GameObjects.GameObject | null}
     */
    findClosestTarget() {
        let closestTarget = null;
        let minDistance = Infinity;

        if (typeof this.scene.getObjectsByGroup === 'function') {
            const targets = this.scene.getObjectsByGroup(this.targetGroup);
            for (const target of targets) {
                const distance = Phaser.Math.Distance.BetweenPoints(this.gameObject, target);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestTarget = target;
                }
            }
        }
        return closestTarget;
    }
    
    /**
     * コンポーネント破棄時にイベントリスナーをクリーンアップする（念のため）
     */
    destroy() {
        // このコンポーネントはイベントをリッスンしていないので、destroyは空でOK
    }
}

/**
 * IDEのプロパティパネルに表示するための自己定義
 */
ChaseComponent.define = {
    params: [
        { key: 'targetGroup', type: 'text', label: '追跡ターゲットのGroup', defaultValue: 'player' },
        { key: 'detectionRadius', type: 'range', label: '索敵範囲', min: 50, max: 1000, step: 10, defaultValue: 250 },
        { key: 'giveUpRadius', type: 'range', label: '追跡を諦める距離', min: 100, max: 2000, step: 10, defaultValue: 500 },
        { key: 'chaseSpeed', type: 'range', label: '追跡速度', min: 1, max: 10, step: 0.5, defaultValue: 3 }
    ]
};