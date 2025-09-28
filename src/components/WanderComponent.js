// in src/components/WanderComponent.js

export default class WanderComponent {
    constructor(scene, owner, params = {}) {
        this.gameObject = owner;
        this.npcController = owner.components.NpcController; // ★ NpcControllerが必須
        
        // パラメータで徘徊の性格を調整
        this.walkDuration = params.walkDuration || 3000; // 3秒歩く
        this.waitDuration = params.waitDuration || 2000; // 2秒待つ

        this.timer = 0;
        this.state = 'WAITING'; // 'WAITING' or 'WALKING'
    }

    start() {
        // コンポーネントが開始されたら、最初の待機タイマーをセット
        this.timer = this.gameObject.scene.time.now + this.waitDuration;
    }

    update() {
        if (!this.npcController) return;

        // --- 現在時刻が、設定したタイマー時刻を過ぎたら ---
        if (this.gameObject.scene.time.now > this.timer) {
            if (this.state === 'WAITING') {
                // --- 待機時間が終わったら、歩き始める ---
                this.state = 'WALKING';
                // 次のタイマーを「歩行時間」でセット
                this.timer = this.gameObject.scene.time.now + this.walkDuration;
                
                // NpcControllerに「歩け」と命令する
                const direction = Math.random() < 0.5 ? -1 : 1;
                this.npcController.move(direction * this.npcController.moveSpeed);
                
            } else { // WALKING
                // --- 歩行時間が終わったら、待機し始める ---
                this.state = 'WAITING';
                // 次のタイマーを「待機時間」でセット
                this.timer = this.gameObject.scene.time.now + this.waitDuration;

                // NpcControllerに「止まれ」と命令する
                this.npcController.move(0);
            }
        }
    }
}