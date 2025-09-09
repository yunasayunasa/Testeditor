// Odyssey Engine - Scrollable Component
// Moves the target object to the left at a constant speed.
//

export default class Scrollable {
    
    /**
     * @param {Phaser.Scene} scene - このコンポーネントが属するシーン
     * @param {Phaser.GameObjects.GameObject} target - このコンポーネントがアタッチされるオブジェクト
     * @param {object} [params={}] - パラメータ (例: { speed: -5 })
     */
    constructor(scene, target, params = {}) {
        this.scene = scene;
        this.target = target;

        // パラメータで速度を指定でき、なければデフォルト値 -5 を使う
        this.scrollSpeed = params.speed !== undefined ? params.speed : -5;
    }

    /**
     * JumpSceneのupdateループから、毎フレーム呼び出される
     */
    update() {
        // ターゲットに物理ボディがなければ、何もしない
        if (!this.target || !this.target.body) {
            return;
        }
        
        // ★★★ この一行が、このコンポーネントの魂だ ★★★
        // 水平速度だけを設定し、垂直速度は物理演算に任せる
        this.target.setVelocityX(this.scrollSpeed);
    }
    
    // このコンポーネントは、破棄時に何もしなくて良いので、destroyは不要
}