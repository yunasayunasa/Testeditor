// src/components/DetectionAreaComponent.js

export default class DetectionAreaComponent {

    constructor(scene, owner, params = {}) {
        this.scene = scene;
        this.gameObject = owner;
        this.sensorBody = null; // このコンポーネントが管理する物理ボディ
    }

    start() {
        const params = this.getCurrentParams();

        // センサー用の物理ボディを作成
        this.createSensorBody(params);

        // --- イベントを発行するためのリスナーを設定 ---
        // センサーボディが何かに触れたらずっと呼ばれる
        this.scene.matter.world.on('collisionactive', this.handleCollision, this);
        // センサーボディから何かが離れたら呼ばれる
        this.scene.matter.world.on('collisionend', this.handleCollision, this);
    }

    update() {
        if (!this.sensorBody) return;

        const params = this.getCurrentParams();

        // 毎フレーム、センサーの位置と角度を親オブジェクトに追従させる
        const newX = this.gameObject.x + params.offsetX;
        const newY = this.gameObject.y + params.offsetY;
        
        // 角度も設定
        let newAngle = this.gameObject.angle;
        if (params.type === 'cone' && this.gameObject.flipX) {
            newAngle += 180;
        }

        // Matter.Body.setPositionとsetAngleで更新
        Phaser.Physics.Matter.Matter.Body.setPosition(this.sensorBody, { x: newX, y: newY });
        Phaser.Physics.Matter.Matter.Body.setAngle(this.sensorBody, Phaser.Math.DegToRad(newAngle));
    }
    
    // in DetectionAreaComponent.js

// ... (updateメソッドの後に追加)

    createSensorBody(params) {
        const { type, radius } = params;
        const bodyOptions = {
            isSensor: true,  // センサーにする
            isStatic: true,  // 動かないように（親に追従させるため）
            label: `${this.gameObject.name}_detection_area`
        };

        if (type === 'circle') {
            // --- 円形センサー ---
            this.sensorBody = this.scene.matter.bodies.circle(this.gameObject.x, this.gameObject.y, radius, bodyOptions);
        } 
        else if (type === 'cone') {
            // --- 扇形センサー (複数の三角形/台形パーツで近似) ---
            const { coneAngle, segments } = params;
            const angleStep = coneAngle / segments;
            const parts = [];

            for (let i = 0; i < segments; i++) {
                const angle = -coneAngle / 2 + i * angleStep + angleStep / 2;
                const rad = Phaser.Math.DegToRad(angle);

                // 三角形を生成してパーツ配列に追加
                const part = Phaser.Physics.Matter.Matter.Bodies.trapezoid(
                    radius * 0.5 * Math.cos(rad),
                    radius * 0.5 * Math.sin(rad),
                    radius, 
                    radius * Math.tan(Phaser.Math.DegToRad(angleStep/2)) * 2,
                    0, // slope
                    { isSensor: true }
                );
                Phaser.Physics.Matter.Matter.Body.rotate(part, rad);
                parts.push(part);
            }
            // 複数のパーツを合体させて一つの複合ボディにする
            this.sensorBody = Phaser.Physics.Matter.Matter.Body.create({ parts: parts, ...bodyOptions });
        }

        if (this.sensorBody) {
            // 作成したボディを物理ワールドに追加
            this.scene.matter.world.add(this.sensorBody);
            // デバッグ用に色を付ける（後で削除）
            this.sensorBody.render.fillStyle = 'rgba(255, 0, 0, 0.2)';
            this.sensorBody.render.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            this.sensorBody.render.lineWidth = 2;
        }
    }

    // in DetectionAreaComponent.js

// ... (createSensorBodyメソッドの後に追加)

    handleCollision(event, pair) {
        // 全ての衝突ペアをチェック
        for (const pair of event.pairs) {
            let otherBody = null;
            if (pair.bodyA === this.sensorBody) otherBody = pair.bodyB;
            if (pair.bodyB === this.sensorBody) otherBody = pair.bodyA;

            if (otherBody && otherBody.gameObject) {
                const targetObject = otherBody.gameObject;
                const params = this.getCurrentParams();
                
                // ターゲットグループが一致するかチェック
                if (params.targetGroup && targetObject.getData('group') !== params.targetGroup) {
                    continue;
                }

                
            // ▼▼▼ ここからデバッグログ ▼▼▼
            if (event.name === 'collisionactive') {
                const memoryKey = `detected_${targetObject.id}`;
                if (!this.gameObject.getData(memoryKey)) {
                    this.gameObject.setData(memoryKey, true);

                    // ★★★ 強力なデバッグログ ★★★
                    console.log(`%c[EVENT EMIT] '${this.gameObject.name}' is emitting 'onAreaEnter' for target '${targetObject.name}'!`, 'color: lime; font-size: 1.2em; font-weight: bold;');
                    
                    this.gameObject.emit('onAreaEnter', targetObject);
                }
            }
                else if (event.name === 'collisionend') {
                    this.gameObject.setData(`detected_${targetObject.id}`, false);
                    this.gameObject.emit('onAreaLeave', targetObject);
                }
            }
        }
    }

    getCurrentParams() {
        const allCompsData = this.gameObject.getData('components') || [];
        const myData = allCompsData.find(c => c.type === 'DetectionAreaComponent');
        
        const defaultParams = DetectionAreaComponent.define.params.reduce((acc, p) => {
            acc[p.key] = p.defaultValue;
            return acc;
        }, {});

        return myData ? { ...defaultParams, ...myData.params } : defaultParams;
    }

    destroy() {
        if (this.sensorBody) {
            this.scene.matter.world.remove(this.sensorBody);
            this.sensorBody = null;
        }
        // グローバルなイベントリスナーを解除
        this.scene.matter.world.off('collisionactive', this.handleCollision, this);
        this.scene.matter.world.off('collisionend', this.handleCollision, this);
    }
}

DetectionAreaComponent.define = {
    params: [
        { key: 'type', type: 'select', label: 'Type', options: ['circle', 'cone'], defaultValue: 'circle' },
        { key: 'radius', type: 'range', label: 'Radius', min: 0, max: 1000, step: 10, defaultValue: 200 },
        { key: 'targetGroup', type: 'text', label: 'Target Group', defaultValue: 'player' },
        { key: 'offsetX', type: 'range', label: 'Offset X', min: -200, max: 200, step: 1, defaultValue: 0 },
        { key: 'offsetY', type: 'range', label: 'Offset Y', min: -200, max: 200, step: 1, defaultValue: 0 },
        // --- Cone Only Params ---
        { key: 'coneAngle', type: 'range', label: 'Cone Angle', min: 1, max: 359, step: 1, defaultValue: 60 },
        { key: 'segments', type: 'range', label: 'Cone Segments', min: 1, max: 12, step: 1, defaultValue: 5 },
    ]
};
