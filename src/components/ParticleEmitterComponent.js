/**
 * ParticleEmitterComponent
 * ゲームオブジェクトにパーティクルエフェクトを追加するコンポーネント
 */
export default class ParticleEmitterComponent {
    constructor(scene, gameObject, params = {}) {
        this.scene = scene;
        this.gameObject = gameObject;
        
        // パラメータ
        this.texture = params.texture || 'particle';
        this.emitZone = params.emitZone || 'point'; // 'point' or 'edge'
        this.frequency = params.frequency || 100; // ms間隔
        this.lifespan = params.lifespan || 1000; // パーティクルの寿命(ms)
        this.speedMin = params.speedMin || 50;
        this.speedMax = params.speedMax || 100;
        this.angle = params.angle || 0; // 放出角度の中心
        this.angleRange = params.angleRange || 30; // 角度の幅
        this.scaleStart = params.scaleStart || 1.0;
        this.scaleEnd = params.scaleEnd || 0.0;
        this.alphaStart = params.alphaStart || 1.0;
        this.alphaEnd = params.alphaEnd || 0.0;
        this.quantity = params.quantity || 1; // 一度に放出する数
        this.maxParticles = params.maxParticles || 50; // 最大パーティクル数
        this.blendMode = params.blendMode || 'NORMAL'; // 'NORMAL', 'ADD', 'MULTIPLY'
        this.autoStart = params.autoStart !== false; // デフォルトで自動開始
        
        this.emitter = null;
    }

    start() {
        if (!this.scene || !this.scene.textures.exists(this.texture)) {
            console.warn(`[ParticleEmitterComponent] Texture '${this.texture}' not found.`);
            return;
        }

        // パーティクルエミッターを作成
        this.emitter = this.scene.add.particles(this.gameObject.x, this.gameObject.y, this.texture, {
            frequency: this.frequency,
            lifespan: this.lifespan,
            speed: { min: this.speedMin, max: this.speedMax },
            angle: { min: this.angle - this.angleRange / 2, max: this.angle + this.angleRange / 2 },
            scale: { start: this.scaleStart, end: this.scaleEnd },
            alpha: { start: this.alphaStart, end: this.alphaEnd },
            quantity: this.quantity,
            maxParticles: this.maxParticles,
            blendMode: this.getBlendMode(this.blendMode)
        });

        // GameObjectの深度と同じにする
        if (this.gameObject.depth !== undefined) {
            this.emitter.setDepth(this.gameObject.depth);
        }

        // 自動開始しない場合は停止
        if (!this.autoStart) {
            this.emitter.stop();
        }
    }

    update() {
        // エミッターの位置をGameObjectに追従させる
        if (this.emitter && this.gameObject) {
            this.emitter.setPosition(this.gameObject.x, this.gameObject.y);
        }
    }

    getBlendMode(modeString) {
        const modes = {
            'NORMAL': Phaser.BlendModes.NORMAL,
            'ADD': Phaser.BlendModes.ADD,
            'MULTIPLY': Phaser.BlendModes.MULTIPLY,
            'SCREEN': Phaser.BlendModes.SCREEN
        };
        return modes[modeString] || Phaser.BlendModes.NORMAL;
    }

    // 公開メソッド
    play() {
        if (this.emitter) {
            this.emitter.start();
        }
    }

    stop() {
        if (this.emitter) {
            this.emitter.stop();
        }
    }

    explode(count = 10) {
        if (this.emitter) {
            this.emitter.explode(count);
        }
    }

    destroy() {
        if (this.emitter) {
            this.emitter.destroy();
            this.emitter = null;
        }
    }
}

/**
 * エディタ用のコンポーネント定義
 */
ParticleEmitterComponent.define = {
    params: [
        { 
            key: 'texture', 
            type: 'text', 
            label: 'テクスチャキー', 
            defaultValue: 'particle' 
        },
        { 
            key: 'frequency', 
            type: 'range', 
            label: '放出間隔(ms)', 
            min: 10, 
            max: 1000, 
            step: 10, 
            defaultValue: 100 
        },
        { 
            key: 'lifespan', 
            type: 'range', 
            label: '寿命(ms)', 
            min: 100, 
            max: 5000, 
            step: 100, 
            defaultValue: 1000 
        },
        { 
            key: 'speedMin', 
            type: 'range', 
            label: '速度Min', 
            min: 0, 
            max: 500, 
            step: 10, 
            defaultValue: 50 
        },
        { 
            key: 'speedMax', 
            type: 'range', 
            label: '速度Max', 
            min: 0, 
            max: 500, 
            step: 10, 
            defaultValue: 100 
        },
        { 
            key: 'angle', 
            type: 'range', 
            label: '角度', 
            min: -180, 
            max: 180, 
            step: 5, 
            defaultValue: 0 
        },
        { 
            key: 'angleRange', 
            type: 'range', 
            label: '角度範囲', 
            min: 0, 
            max: 360, 
            step: 5, 
            defaultValue: 30 
        },
        { 
            key: 'scaleStart', 
            type: 'range', 
            label: '開始スケール', 
            min: 0, 
            max: 5, 
            step: 0.1, 
            defaultValue: 1.0 
        },
        { 
            key: 'scaleEnd', 
            type: 'range', 
            label: '終了スケール', 
            min: 0, 
            max: 5, 
            step: 0.1, 
            defaultValue: 0.0 
        },
        { 
            key: 'alphaStart', 
            type: 'range', 
            label: '開始透明度', 
            min: 0, 
            max: 1, 
            step: 0.1, 
            defaultValue: 1.0 
        },
        { 
            key: 'alphaEnd', 
            type: 'range', 
            label: '終了透明度', 
            min: 0, 
            max: 1, 
            step: 0.1, 
            defaultValue: 0.0 
        },
        { 
            key: 'quantity', 
            type: 'range', 
            label: '放出数', 
            min: 1, 
            max: 20, 
            step: 1, 
            defaultValue: 1 
        },
        { 
            key: 'maxParticles', 
            type: 'range', 
            label: '最大数', 
            min: 10, 
            max: 500, 
            step: 10, 
            defaultValue: 50 
        },
        { 
            key: 'blendMode', 
            type: 'select', 
            options: ['NORMAL', 'ADD', 'MULTIPLY', 'SCREEN'], 
            label: 'ブレンドモード', 
            defaultValue: 'NORMAL' 
        },
        { 
            key: 'autoStart', 
            type: 'select', 
            options: ['true', 'false'], 
            label: '自動開始', 
            defaultValue: 'true' 
        }
    ]
};
