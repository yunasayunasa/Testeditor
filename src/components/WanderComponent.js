// in src/components/WanderComponent.js (8方向対応・最終FIX版)

export default class WanderComponent {
    constructor(scene, owner, params = {}) {
        this.gameObject = owner;
        this.npcController = null;
        
        this.walkDuration = params.walkDuration || 3000;
        this.waitDuration = params.waitDuration || 2000;
        // ★ 8方向徘徊用のフラグを追加
        this.is8Way = params.is8Way || false;

        this.timer = 0;
        this.state = 'WAITING';
    }

    start() {
        this.npcController = this.gameObject.components.NpcController;
        if (!this.npcController) {
            console.error(`[WanderComponent] ERROR: 'NpcController' component is required on '${this.gameObject.name}'!`);
            return;
        }
        this.timer = this.gameObject.scene.time.now + this.waitDuration;
    }

  update() {
        if (!this.npcController) return;
        if (this.gameObject.scene.time.now > this.timer) {
            if (this.state === 'WAITING') {
                this.state = 'WALKING';
                this.timer = this.gameObject.scene.time.now + this.walkDuration;
                
                let vx = 0, vy = 0;
                const speed = this.npcController.moveSpeed;
                if (this.is8Way) {
                    const angle = Phaser.Math.RND.angle();
                    const vec = new Phaser.Math.Vector2().setAngle(Phaser.Math.DegToRad(angle));
                    vx = vec.x * speed;
                    vy = vec.y * speed;
                } else {
                    vx = (Math.random() < 0.5 ? -1 : 1) * speed;
                }
                // ★ NpcControllerのmoveを呼び出すだけ
                this.npcController.move(vx, vy);
            } else { // WALKING
                this.state = 'WAITING';
                this.timer = this.gameObject.scene.time.now + this.waitDuration;
                // ★ NpcControllerのstopを呼び出すだけ
                this.npcController.stop();
            }
        }
    }
}

WanderComponent.define = {
    params: [
        { 
            key: 'walkDuration',
            type: 'range',
            label: '歩行時間(ms)',
            min: 500, max: 10000, step: 100,
            defaultValue: 3000
        },
        { 
            key: 'waitDuration', 
            type: 'range',
            label: '待機時間(ms)',
            min: 500, max: 10000, step: 100,
            defaultValue: 2000 
        },
        { 
            key: 'is8Way',
            type: 'checkbox',
            label: '8方向移動',
            defaultValue: false
        }
    ]
};