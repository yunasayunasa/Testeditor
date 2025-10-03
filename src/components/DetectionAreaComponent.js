// src/components/DetectionAreaComponent.js

export default class DetectionAreaComponent {

    constructor(scene, owner, params = {}) {
        this.scene = scene;
        this.gameObject = owner;
        this.sensorShape = null; // 判定に使うMatter.jsのボディ形状
        this.detectedObjects = new Set(); // 現在検知しているオブジェクトのセット
        this.debugGraphics = null; // デバッグ表示用のGraphicsオブジェクト
    }

    start() {
        // デバッグ表示用のGraphicsを準備
        const isDebug = new URLSearchParams(window.location.search).has('debug');
        if (isDebug) {
            this.debugGraphics = this.scene.add.graphics().setDepth(this.gameObject.depth + 10);
        }
        
        // 最初のupdateでセンサー形状が作られる
    }

    update() {
        if (!this.gameObject.active) {
            if (this.debugGraphics) this.debugGraphics.clear();
            return;
        }

        const params = this.getCurrentParams();
        
        // 1. センサーの形状と位置を更新
        this.updateSensorShape(params);
        if (!this.sensorShape) return;

        // 2. センサーと重なっているオブジェクトをMatter.jsエンジンに問い合わせる
        const allBodies = this.scene.matter.world.getAllBodies();
        const foundBodies = Phaser.Physics.Matter.Matter.Query.collides(this.sensorShape, allBodies);

        const currentFrameDetections = new Set();

        // 3. 見つかったオブジェクトをフィルタリング
        foundBodies.forEach(collision => {
            const body = collision.bodyA === this.sensorShape ? collision.bodyB : collision.bodyA;
            const targetObject = body.gameObject;

            if (targetObject && targetObject !== this.gameObject && targetObject.getData('group') === params.targetGroup) {
                currentFrameDetections.add(targetObject);

                // 新しく検知したオブジェクトか？
                if (!this.detectedObjects.has(targetObject)) {
                    // onAreaEnterを発行
                    this.gameObject.emit('onAreaEnter', targetObject);
                }
            }
        });

        // 4. 範囲からいなくなったオブジェクトを特定
        this.detectedObjects.forEach(oldObject => {
            if (!currentFrameDetections.has(oldObject)) {
                // onAreaLeaveを発行
                this.gameObject.emit('onAreaLeave', oldObject);
            }
        });

        // 5. 検知状態を更新
        this.detectedObjects = currentFrameDetections;

        // 6. デバッグ表示の更新
        if (this.debugGraphics) {
            this.drawDebugShape();
        }
    }
    
    updateSensorShape(params) {
        // センサー形状を再生成（パラメータ変更に対応するため）
        if (params.type === 'circle') {
            this.sensorShape = this.scene.matter.bodies.circle(0, 0, params.radius, { isSensor: true });
        } else if (params.type === 'cone') {
            const { radius, coneAngle, segments } = params;
            const angleStep = coneAngle / segments;
            const parts = [];
            for (let i = 0; i < segments; i++) {
                const angle = -coneAngle / 2 + i * angleStep + angleStep / 2;
                const rad = Phaser.Math.DegToRad(angle);
                const part = Phaser.Physics.Matter.Matter.Bodies.trapezoid(radius*0.5*Math.cos(rad), radius*0.5*Math.sin(rad), radius, radius*Math.tan(Phaser.Math.DegToRad(angleStep/2))*2, 0, { isSensor: true });
                Phaser.Physics.Matter.Matter.Body.rotate(part, rad);
                parts.push(part);
            }
            this.sensorShape = Phaser.Physics.Matter.Matter.Body.create({ parts: parts, isSensor: true });
        } else {
            this.sensorShape = null;
            return;
        }

        // センサーの位置と角度を親オブジェクトに合わせる
        const npcController = this.gameObject.components.NpcController;
        
        let facingAngle = this.gameObject.angle; // デフォルトはgameObjectの角度
        if (npcController) {
            if (npcController.direction === 'left') facingAngle = 180;
            else if (npcController.direction === 'right') facingAngle = 0;
            else if (npcController.direction === 'up') facingAngle = -90;
            else if (npcController.direction === 'down') facingAngle = 90;
        }

        const offset = new Phaser.Math.Vector2(params.offsetX, params.offsetY).rotate(Phaser.Math.DegToRad(facingAngle));
        const newX = this.gameObject.x + offset.x;
        const newY = this.gameObject.y + offset.y;
        
        Phaser.Physics.Matter.Matter.Body.setPosition(this.sensorShape, { x: newX, y: newY });
        Phaser.Physics.Matter.Matter.Body.setAngle(this.sensorShape, Phaser.Math.DegToRad(facingAngle));
    }
    
   drawDebugShape() {
    this.debugGraphics.clear();
    if (!this.sensorShape) return;

    // Graphicsの描画基点を設定
    this.debugGraphics.setTranslation(this.sensorShape.position.x, this.sensorShape.position.y);
    this.debugGraphics.setRotation(this.sensorShape.angle);

    this.sensorShape.parts.forEach((part, i) => {
        if (i === 0 && this.sensorShape.parts.length > 1) return;
        
        const vertices = part.vertices;
        this.debugGraphics.fillStyle(0xff0000, 0.2);
        this.debugGraphics.beginPath();
        this.debugGraphics.moveTo(vertices[0].x - part.position.x, vertices[0].y - part.position.y);
        for (let j = 1; j < vertices.length; j++) {
            this.debugGraphics.lineTo(vertices[j].x - part.position.x, vertices[j].y - part.position.y);
        }
        this.debugGraphics.closePath();
        this.debugGraphics.fillPath();
    });

    // 描画が終わったら基点をリセット
    this.debugGraphics.setTranslation(0, 0);
    this.debugGraphics.setRotation(0);
}

    getCurrentParams() {
        const allCompsData = this.gameObject.getData('components') || [];
        const myData = allCompsData.find(c => c.type === 'DetectionAreaComponent');
        const defaultParams = DetectionAreaComponent.define.params.reduce((acc, p) => ({...acc, [p.key]: p.defaultValue}), {});
        return myData ? { ...defaultParams, ...myData.params } : defaultParams;
    }

    destroy() {
        if (this.debugGraphics) this.debugGraphics.destroy();
        this.detectedObjects.clear();
    }
}

DetectionAreaComponent.define = {
    params: [
        { key: 'type', type: 'select', label: 'Type', options: ['circle', 'cone'], defaultValue: 'circle' },
        { key: 'radius', type: 'range', label: 'Radius', min: 0, max: 1000, step: 10, defaultValue: 200 },
        { key: 'targetGroup', type: 'text', label: 'Target Group', defaultValue: 'player' },
        { key: 'offsetX', type: 'range', label: 'Offset X', min: -200, max: 200, step: 1, defaultValue: 0 },
        { key: 'offsetY', type: 'range', label: 'Offset Y', min: -200, max: 200, step: 1, defaultValue: 0 },
        { key: 'coneAngle', type: 'range', label: 'Cone Angle', min: 1, max: 359, step: 1, defaultValue: 60 },
        { key: 'segments', type: 'range', label: 'Cone Segments', min: 1, max: 12, step: 1, defaultValue: 5 },
    ]
};