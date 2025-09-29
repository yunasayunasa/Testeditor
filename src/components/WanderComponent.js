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
                
                // ▼▼▼【ここが8方向対応の核心です】▼▼▼
                let vx = 0;
                let vy = 0;
                const speed = this.npcController.moveSpeed;

                if (this.is8Way) {
                    // --- ケースA: 8方向モードの場合 ---
                    const angle = Phaser.Math.RND.angle(); // 0-360度のランダムな角度
                    const vec = new Phaser.Math.Vector2().setAngle(Phaser.Math.DegToRad(angle));
                    vx = vec.x * speed;
                    vy = vec.y * speed;
                } else {
                    // --- ケースB: 従来の左右2方向モードの場合 ---
                    const direction = Math.random() < 0.5 ? -1 : 1;
                    vx = direction * speed;
                }
                this.npcController.move(vx, vy); // ★ NpcControllerも (vx, vy) を受け取れるように
                // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

            } else { // WALKING
                this.state = 'WAITING';
                this.timer = this.gameObject.scene.time.now + this.waitDuration;
                this.npcController.stop(); // ★ stop()メソッドがあると便利
            }
        }
    }
}