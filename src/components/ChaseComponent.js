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
        this.detectionType = params.detectionType || 'distance';
        this.visionAngle = params.visionAngle || 90;
        this.detectionRadius = params.detectionRadius || 250;
        this.giveUpRadius = params.giveUpRadius || 500;
        this.chaseSpeed = params.chaseSpeed || 3;
        
        // --- 内部状態 ---
        this.state = 'IDLE'; // 'IDLE' (監視中), 'CHASING' (追跡中)
        this.chaseTarget = null;
        
        // --- 視覚化用のGraphicsオブジェクト ---
        this.visionCone = null;
    }

    /**
     * すべてのコンポーネントが生成された後に呼び出される。
     * 依存関係の解決と、視覚化オブジェクトの生成を行う。
     */
    start() {
        this.npcController = this.gameObject.components.NpcController;
        if (!this.npcController) {
            console.error(`[ChaseComponent] ERROR: 'NpcController' is required on '${this.gameObject.name}'. This component will be disabled.`);
            this.enabled = false;
        }
        
        this.returnHome = this.gameObject.components.ReturnHomeComponent;

        // IDEモード（?debug=true）の時だけ、視覚化オブジェクトを生成する
        const isDebug = new URLSearchParams(window.location.search).has('debug');
        if (isDebug) {
            // 深度をキャラクターより少し手前に設定すると、他のオブジェクトに隠れにくい
            this.visionCone = this.scene.add.graphics().setDepth(this.gameObject.depth + 1);
        }
    }

    /**
     * BaseGameSceneから毎フレーム呼び出される、メインの更新ループ。
     */
    update(time, delta) {
        if (!this.npcController || !this.gameObject.active || this.enabled === false) {
            return;
        }
        
        // IDEモードであれば、毎フレーム視界を描画・更新する
        if (this.visionCone) {
            this.drawVisionCone();
        }

        // --- 1. 追跡ターゲットの検索と状態更新 ---
        if (!this.chaseTarget || !this.chaseTarget.active) {
            this.chaseTarget = this.findClosestTarget();
        }
        if (!this.chaseTarget) {
            if (this.state === 'CHASING') this.stopChasing();
            return;
        }
        
        const distanceToTarget = Phaser.Math.Distance.BetweenPoints(this.gameObject, this.chaseTarget);
        let canDetectTarget = (this.detectionType === 'vision')
            ? this.isTargetInVision(this.chaseTarget, this.detectionRadius)
            : distanceToTarget < this.detectionRadius;

        // --- 2. 状態遷移ロジック (ヒステリシス対応) ---
        switch (this.state) {
            case 'IDLE':
                if (canDetectTarget) {
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

    /**
     * 追跡を開始する。他の行動コンポーネントにイベントで通知する。
     */
    startChasing() {
        if (this.state === 'CHASING') return;
        this.state = 'CHASING';
        this.gameObject.emit('onAiBehaviorChange', { source: 'ChaseComponent', active: true });
        console.log(`[ChaseComponent] ${this.gameObject.name} started chasing ${this.chaseTarget.name}.`);
    }

    /**
     * 追跡を停止する。他の行動コンポーネントにイベントで通知する。
     */
    stopChasing() {
        if (this.state === 'IDLE') return;
        this.state = 'IDLE';
        this.npcController.stop();
        this.gameObject.emit('onAiBehaviorChange', { source: 'ChaseComponent', active: false });
        console.log(`[ChaseComponent] ${this.gameObject.name} stopped chasing.`);

        if (this.returnHome?.startReturning) {
            this.returnHome.startReturning();
        }
    }

    /**
     * シーンから最も近いターゲットを探す。
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
     * コンポーネントが破棄される際に、視覚化オブジェクトも安全に破棄する。
     */
    destroy() {
        if (this.visionCone) {
            this.visionCone.destroy();
            this.visionCone = null;
        }
        // このコンポーネントはイベントをリッスンしていないので、off()は不要
    }
}

/**
 * IDEのプロパティパネルに表示するための自己定義
 */
ChaseComponent.define = {
    params: [
        { key: 'targetGroup', type: 'text', label: '追跡ターゲットのGroup', defaultValue: 'player' },
        { 
            key: 'detectionType', 
            type: 'select',
            label: '索敵タイプ',
            options: ['distance', 'vision'],
            defaultValue: 'distance'
        },
        { key: 'visionAngle', type: 'range', label: '視野角(度)', min: 10, max: 360, step: 5, defaultValue: 90 },
        { key: 'detectionRadius', type: 'range', label: '索敵半径', min: 50, max: 1000, step: 10, defaultValue: 250 },
        { key: 'giveUpRadius', type: 'range', label: '追跡を諦める距離', min: 100, max: 2000, step: 10, defaultValue: 500 },
        { key: 'chaseSpeed', type: 'range', label: '追跡速度', min: 1, max: 10, step: 0.5, defaultValue: 3 }
    ]
};