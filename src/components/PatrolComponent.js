// src/components/PatrolComponent.js

export default class PatrolComponent {
    constructor(scene, owner, params = {}) {
        this.gameObject = owner;
        this.scene = scene;
        this.npcController = null;
        
        this.waypoints = [];          // 巡回地点のオブジェクト配列
        this.currentWaypointIndex = 0;
        this.state = 'PATROLLING';    // 'PATROLLING' or 'WAITING'
        this.waitTimer = 0;
        this.enabled = true;
    }

    start() {
        this.npcController = this.gameObject.components.NpcController;
        if (!this.npcController) {
            console.error(`[PatrolComponent] ERROR: 'NpcController' is required. Disabling.`);
            this.enabled = false;
            return;
        }

        const params = this.getCurrentParams();
        
        // 1. シーンからウェイポイントを取得してソートする
        if (this.scene.getObjectsByGroup) {
            this.waypoints = this.scene.getObjectsByGroup(params.pathGroup)
                .sort((a, b) => a.name.localeCompare(b.name)); // 名前順 (A1, A2, A3...)
        }

        if (this.waypoints.length === 0) {
            console.warn(`[PatrolComponent] No waypoints found for group '${params.pathGroup}'. Disabling.`);
            this.enabled = false;
            return;
        }

        // 2. イベントリスナーを登録
        this.gameObject.on('onAiBehaviorChange', this.handleBehaviorChange, this);
    }

    update(time, delta) {
        if (!this.enabled || this.waypoints.length === 0) return;

        if (this.state === 'PATROLLING') {
            const targetWaypoint = this.waypoints[this.currentWaypointIndex];
            const distance = Phaser.Math.Distance.BetweenPoints(this.gameObject, targetWaypoint);
            
            const params = this.getCurrentParams();

            // ウェイポイントに到着したら
            if (distance < params.arrivalThreshold) {
                this.npcController.stop();
                this.state = 'WAITING';
                this.waitTimer = time + params.waitTime;
                
                // 次のウェイポイントへ
                this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
            } else {
                // ターゲットに向かって移動
                const angle = Phaser.Math.Angle.BetweenPoints(this.gameObject, targetWaypoint);
                const vx = Math.cos(angle) * this.npcController.moveSpeed;
                const vy = Math.sin(angle) * this.npcController.moveSpeed;
                this.npcController.move(vx, vy);
            }
        } 
        else if (this.state === 'WAITING') {
            // 待機時間が終了したらパトロール再開
            if (time > this.waitTimer) {
                this.state = 'PATROLLING';
            }
        }
    }

    handleBehaviorChange(event) {
        // 自分自身が発行したイベントは無視
        if (event.source === 'PatrolComponent') return;
        
        // 他のAIコンポーネントがアクティブになったら、自分は無効になる
        this.enabled = !event.active;

        if (this.enabled) {
            // 活動再開
            this.state = 'PATROLLING';
        } else {
            // 活動停止
            this.npcController.stop();
        }
    }

    getCurrentParams() {
        const allCompsData = this.gameObject.getData('components') || [];
        const myData = allCompsData.find(c => c.type === 'PatrolComponent');
        const defaultParams = PatrolComponent.define.params.reduce((acc, p) => ({...acc, [p.key]: p.defaultValue}), {});
        return myData ? { ...defaultParams, ...myData.params } : defaultParams;
    }
    
    destroy() {
        if (this.gameObject?.off) {
            this.gameObject.off('onAiBehaviorChange', this.handleBehaviorChange, this);
        }
    }
}

PatrolComponent.define = {
    params: [
        { key: 'pathGroup', type: 'text', label: 'Path Group', defaultValue: 'patrol_path_A' },
        { key: 'waitTime', type: 'range', label: 'Wait Time (ms)', min: 0, max: 10000, step: 100, defaultValue: 2000 },
        { key: 'arrivalThreshold', type: 'range', label: 'Arrival Threshold', min: 5, max: 100, step: 1, defaultValue: 10 },
    ]
};