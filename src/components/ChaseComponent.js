// in src/components/ChaseComponent.js
export default class ChaseComponent {
    constructor(scene, owner, params = {}) {
        this.gameObject = owner;
        this.scene = owner.scene;
        this.npcController = null;
        this.returnHome = null;
        this.targetGroup = params.targetGroup || 'player';
        this.detectionType = params.detectionType || 'distance';
        this.visionAngle = params.visionAngle || 90;
        this.detectionRadius = params.detectionRadius || 250;
        this.giveUpRadius = params.giveUpRadius || 500;
        this.chaseSpeed = params.chaseSpeed || 3;
        this.state = 'IDLE';
        this.chaseTarget = null;
        this.visionCone = null;
        this.enabled = true; // ★ 自身の有効/無効フラグ
    }

    start() {
        this.npcController = this.gameObject.components.NpcController;
        if (!this.npcController) { this.enabled = false; return; }
        
        this.returnHome = this.gameObject.components.ReturnHomeComponent;

        const isDebug = new URLSearchParams(window.location.search).has('debug');
        if (isDebug) {
            this.visionCone = this.scene.add.graphics().setDepth(this.gameObject.depth + 1);
        }
        
        // ★★★ イベントリスナーを登録 ★★★
        this.gameObject.on('onAiBehaviorChange', this.handleBehaviorChange, this);
    }

    handleBehaviorChange(event) {
        if (event.source === 'ChaseComponent') return;
        this.enabled = !event.active;
        if (!this.enabled && this.visionCone) {
            this.visionCone.clear(); // 抑制されたら視界を消す
        }
    }

    update(time, delta) {
        if (!this.npcController || !this.gameObject.active || !this.enabled) {
            return;
        }
        
        if (this.visionCone) {
            this.drawVisionCone();
        }
        
        if (!this.chaseTarget || !this.chaseTarget.active) {
            this.chaseTarget = this.findClosestTarget();
        }
        if (!this.chaseTarget) {
            if (this.state === 'CHASING') this.stopChasing();
            return;
        }
        
        const distanceToTarget = Phaser.Math.Distance.BetweenPoints(this.gameObject, this.chaseTarget);
        const canDetectTarget = (this.detectionType === 'vision')
            ? this.isTargetInVision(this.chaseTarget, this.detectionRadius)
            : distanceToTarget < this.detectionRadius;

        switch (this.state) {
            case 'IDLE':
                if (canDetectTarget) this.startChasing();
                break;
            case 'CHASING':
                if (distanceToTarget > this.giveUpRadius) this.stopChasing();
                break;
        }

        if (this.state === 'CHASING') {
            const angle = Phaser.Math.Angle.BetweenPoints(this.gameObject, this.chaseTarget);
            const vx = Math.cos(angle) * this.chaseSpeed;
            const vy = Math.sin(angle) * this.chaseSpeed;
            this.npcController.move(vx, vy);
        }
    }

    /**
     * ターゲットが自身の前方視野角かつ索敵半径内にいるかを判定する。
     */
    isTargetInVision(target, radius) {
        const distance = Phaser.Math.Distance.BetweenPoints(this.gameObject, target);
        if (distance > radius) return false;

        const angleToTarget = Phaser.Math.RadToDeg(Phaser.Math.Angle.BetweenPoints(this.gameObject, target));
        const currentFacingAngle = (this.npcController.direction === 'left') ? 180 : 0;
        const angleDifference = Phaser.Math.Angle.ShortestBetween(currentFacingAngle, angleToTarget);

        return Math.abs(angleDifference) <= this.visionAngle / 2;
    }

    /**
     * IDEモード時に、視界の扇形を描画する。
     */
    drawVisionCone() {
        this.visionCone.clear();

        if (this.detectionType !== 'vision' || !this.npcController) return;

        const currentFacingAngle = (this.npcController.direction === 'left') ? 180 : 0;
        const startAngle = currentFacingAngle - this.visionAngle / 2;
        const endAngle = currentFacingAngle + this.visionAngle / 2;

        this.visionCone.fillStyle(0xffff00, 0.25);
        this.visionCone.slice(
            this.gameObject.x, this.gameObject.y,
            this.detectionRadius,
            Phaser.Math.DegToRad(startAngle),
            Phaser.Math.DegToRad(endAngle)
        );
        this.visionCone.fillPath();
    }

   startChasing() {
        if (this.state === 'CHASING') return;
        this.state = 'CHASING';
        this.gameObject.emit('onAiBehaviorChange', { source: 'ChaseComponent', active: true });
    }

    stopChasing() {
        if (this.state === 'IDLE') return;
        this.state = 'IDLE';
        this.npcController.stop();
        this.gameObject.emit('onAiBehaviorChange', { source: 'ChaseComponent', active: false });

        if (this.returnHome?.startReturning) {
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

        // BaseGameSceneが持つヘルパーメソッドを利用する
        if (typeof this.scene.getObjectsByGroup === 'function') {
            const targets = this.scene.getObjectsByGroup(this.targetGroup);
            for (const target of targets) {
                // 自分自身をターゲットにしないようにチェック
                if (target === this.gameObject) continue;
                
                const distance = Phaser.Math.Distance.BetweenPoints(this.gameObject, target);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestTarget = target;
                }
            }
        }
        return closestTarget;
    }
    destroy() {
        if (this.visionCone) this.visionCone.destroy();
        if (this.gameObject?.off) {
            this.gameObject.off('onAiBehaviorChange', this.handleBehaviorChange, this);
        }
    }
}


/**
 * IDEのプロパティパネルに表示するための自己定義
 */
ChaseComponent.define = {
    params: [
        { key: 'targetGroup', type: 'text', label: '追跡ターゲットのGroup', defaultValue: 'player' },
        
        // ▼▼▼【ここを修正】▼▼▼
        { 
            key: 'detectionType', 
            type: 'select', // ★ 'text' から 'select' に変更
            label: '索敵タイプ',
            options: ['distance', 'vision'], // ★ ドロップダウンの選択肢を配列で定義
            defaultValue: 'distance'
        },
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        
        { key: 'visionAngle', type: 'range', label: '視野角(度)', min: 10, max: 360, step: 5, defaultValue: 90 },
              { key: 'detectionRadius', type: 'range', label: '索敵半径', min: 50, max: 1000, step: 10, defaultValue: 250 },
        { key: 'giveUpRadius', type: 'range', label: '追跡を諦める距離', min: 100, max: 2000, step: 10, defaultValue: 500 },
        { key: 'chaseSpeed', type: 'range', label: '追跡速度', min: 1, max: 10, step: 0.5, defaultValue: 3 }
    ]
};