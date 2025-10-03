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
        const offset = new Phaser.Math.Vector2(params.offsetX, params.offsetY).rotate(Phaser.Math.DegToRad(this.gameObject.angle));
        const newX = this.gameObject.x + offset.x;
        const newY = this.gameObject.y + offset.y;
        
        let newAngle = this.gameObject.angle;
        if (params.type === 'cone') {
            if (this.gameObject.flipX) {
                newAngle += 180;
            }
        }

        Phaser.Physics.Matter.Matter.Body.setPosition(this.sensorBody, { x: newX, y: newY });
        Phaser.Physics.Matter.Matter.Body.setAngle(this.sensorBody, Phaser.Math.DegToRad(newAngle));
    }

    createSensorBody(params) {
        const { type, radius, targetGroup } = params;
        const physicsDefine = this.scene.registry.get('physics_define');

        // ターゲットのカテゴリ値を取得 (e.g., 'player' -> 2)
        const targetCategory = physicsDefine?.categories?.[targetGroup];

        if (targetCategory === undefined) {
             console.warn(`[DetectionAreaComponent] Category for group '${targetGroup}' not found in physics_define.json. Sensor will not work.`);
             return; // ターゲットカテゴリがなければセンサーを作らない
        }
        
        const bodyOptions = {
            isSensor: true,
            isStatic: true,
            label: `${this.gameObject.name}_detection_area`,
            collisionFilter: {
                // センサー自身のカテゴリを、ターゲットと衝突可能なものに設定
                // 全てのカテゴリ値と衝突できるように、-1 (全て) を設定するのが最も確実
                category: -1, 
                // 衝突相手として、playerカテゴリ(2)だけを指定
                mask: targetCategory
            }
        };

        if (type === 'circle') {
            this.sensorBody = this.scene.matter.bodies.circle(this.gameObject.x, this.gameObject.y, radius, bodyOptions);
        } 
        else if (type === 'cone') {
            const { coneAngle, segments } = params;
            const angleStep = coneAngle / segments;
            const parts = [];

            for (let i = 0; i < segments; i++) {
                const angle = -coneAngle / 2 + i * angleStep + angleStep / 2;
                const rad = Phaser.Math.DegToRad(angle);

                // 各パーツにも衝突フィルタを設定
                const partOptions = { 
                    isSensor: true,
                    collisionFilter: bodyOptions.collisionFilter
                };

                const part = Phaser.Physics.Matter.Matter.Bodies.trapezoid(
                    radius * 0.5 * Math.cos(rad),
                    radius * 0.5 * Math.sin(rad),
                    radius, 
                    radius * Math.tan(Phaser.Math.DegToRad(angleStep/2)) * 2,
                    0, // slope
                    partOptions
                );
                Phaser.Physics.Matter.Matter.Body.rotate(part, rad);
                parts.push(part);
            }
            // 複数のパーツを合体させて一つの複合ボディにする
            this.sensorBody = Phaser.Physics.Matter.Matter.Body.create({ parts: parts, ...bodyOptions });
        }

        if (this.sensorBody) {
            this.scene.matter.world.add(this.sensorBody);
            
            // デバッグ表示用の設定
            const isDebug = new URLSearchParams(window.location.search).has('debug');
            if (isDebug) {
                this.sensorBody.render.fillStyle = 'rgba(255, 0, 0, 0.2)';
                this.sensorBody.render.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                this.sensorBody.render.lineWidth = 2;
            }
        }
    }

    handleCollision(event) {
        // 全ての衝突ペアをチェック
        for (const pair of event.pairs) {
            let otherBody = null;
            if (pair.bodyA === this.sensorBody) otherBody = pair.bodyB;
            if (pair.bodyB === this.sensorBody) otherBody = pair.bodyA;

            if (otherBody && otherBody.gameObject) {
                const targetObject = otherBody.gameObject;
                const params = this.getCurrentParams();
                
                // ターゲットグループが一致するか再確認
                if (params.targetGroup && targetObject.getData('group') !== params.targetGroup) {
                    continue;
                }

                if (event.name === 'collisionactive') {
                    // onAreaEnterは一度だけ発行したいので、フラグを管理する
                    const memoryKey = `detected_${this.gameObject.id}_${targetObject.id}`;
                    if (!this.scene.registry.get(memoryKey)) {
                        this.scene.registry.set(memoryKey, true);

                        console.log(`%c[EVENT EMIT] '${this.gameObject.name}' is emitting 'onAreaEnter' for target '${targetObject.name}'!`, 'color: lime; font-size: 1.2em; font-weight: bold;');
                        this.gameObject.emit('onAreaEnter', targetObject);
                    }
                }
                else if (event.name === 'collisionend') {
                    const memoryKey = `detected_${this.gameObject.id}_${targetObject.id}`;
                    this.scene.registry.set(memoryKey, false);

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
