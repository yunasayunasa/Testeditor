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
        
        this.waypoints = this.scene.children.list
        .filter(obj => obj.getData('group') === params.pathGroup)
        .sort((a, b) => a.name.localeCompare(b.name));

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

        if (distance < params.arrivalThreshold) {
            this.npcController.stop();
            this.state = 'WAITING';
            this.waitTimer = time + params.waitTime;
            this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
        } else {
            const angle = Phaser.Math.Angle.BetweenPoints(this.gameObject, targetWaypoint);
            let vx = 0;
            let vy = 0;
            const speed = this.npcController.moveSpeed;
            
            // --- ▼▼▼ ここからが8軸対応のロジック ▼▼▼ ---
            if (params.is8Way) {
                // 8方向移動の場合：角度をそのまま速度ベクトルに変換
                vx = Math.cos(angle) * speed;
                vy = Math.sin(angle) * speed;
            } else {
                // 4方向移動（水平・垂直）の場合
                const angleDeg = Phaser.Math.RadToDeg(angle);
                if (Math.abs(angleDeg) < 45 || Math.abs(angleDeg) > 135) {
                    // 左右の移動を優先
                    vx = (Math.abs(angleDeg) < 45) ? speed : -speed;
                    vy = 0;
                } else {
                    // 上下の移動を優先
                    vx = 0;
                    vy = (angleDeg > 0) ? speed : -speed;
                }
            }
            // --- ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ ---
            
            this.npcController.move(vx, vy);
        }
    } 
    else if (this.state === 'WAITING') {
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
        // --- ▼▼▼ 8軸対応パラメータを追加 ▼▼▼ ---
        { key: 'is8Way', type: 'checkbox', label: '8-Way Movement', defaultValue: true }
    ]
};