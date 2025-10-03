// src/components/PatrolComponent.js

export default class PatrolComponent {
    constructor(scene, owner, params = {}) {
        this.gameObject = owner;
        this.scene = scene;
        this.npcController = null;
        
        this.currentWaypoint = null; // ★ 現在のターゲットウェイポイント
        this.state = 'PATROLLING';
        this.waitTimer = 0;
        this.enabled = true;
    }

    start() {
        this.npcController = this.gameObject.components.NpcController;
        if (!this.npcController) { this.enabled = false; return; }

        this.scene.time.delayedCall(0, () => {
            const params = this.getCurrentParams();
            
            // ★ パトロールの「開始地点」となるウェイポイントを探す
            this.currentWaypoint = this.scene.children.getByName(params.startWaypoint);

            if (!this.currentWaypoint) {
                console.warn(`[PatrolComponent] Start waypoint '${params.startWaypoint}' not found. Disabling.`);
                this.enabled = false;
            } else {
                console.log(`[PatrolComponent] Patrolling enabled. Starting at '${this.currentWaypoint.name}'.`);
            }
        }, [], this);

        this.gameObject.on('onAiBehaviorChange', this.handleBehaviorChange, this);
    }

    update(time, delta) {
        if (!this.enabled || !this.currentWaypoint) return;

        if (this.state === 'PATROLLING') {
            const distance = Phaser.Math.Distance.BetweenPoints(this.gameObject, this.currentWaypoint);
            const params = this.getCurrentParams();

            if (distance < params.arrivalThreshold) {
                // --- 到着時の処理 ---
                this.npcController.stop();
                this.state = 'WAITING';
                this.waitTimer = time + params.waitTime;
                
                // ★ 現在のウェイポイントから、次のウェイポイントの名前を取得
                const nextWaypointName = this.currentWaypoint.getData('nextWaypoint');

                if (nextWaypointName) {
                    // ★ 次のウェイポイントをシーンから名前で検索
                    this.currentWaypoint = this.scene.children.getByName(nextWaypointName);
                    if (!this.currentWaypoint) {
                        console.warn(`[PatrolComponent] Next waypoint '${nextWaypointName}' not found. Stopping patrol.`);
                        this.enabled = false;
                    }
                } else {
                    console.log(`[PatrolComponent] End of patrol path reached. Stopping.`);
                    this.enabled = false;
                }
            } else {
                // --- 移動中の処理 (変更なし) ---
                const angle = Phaser.Math.Angle.BetweenPoints(this.gameObject, this.currentWaypoint);
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

PPatrolComponent.define = {
    params: [
        // ★ 'pathGroup' を 'startWaypoint' に変更
        { key: 'startWaypoint', type: 'text', label: 'Start Waypoint', defaultValue: 'waypoint_A_01' },
        { key: 'waitTime', type: 'range', label: 'Wait Time (ms)', min: 0, max: 10000, step: 100, defaultValue: 2000 },
        { key: 'arrivalThreshold', type: 'range', label: 'Arrival Threshold', min: 5, max: 100, step: 1, defaultValue: 10 },
        { key: 'is8Way', type: 'checkbox', label: '8-Way Movement', defaultValue: true }
    ]
};