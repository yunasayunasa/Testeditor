//
// Odyssey Engine - Scrollable Component (Camera Control Version)
// Attached to the player, it scrolls the camera instead of moving the player.
//

export default class Scrollable {
    
    /**
     * @param {Phaser.Scene} scene - このコンポーネントが属するシーン
     * @param {Phaser.GameObjects.GameObject} target - このコンポーネントがアタッチされるオブジェクト (通常はプレイヤー)
     * @param {object} [params={}] - パラメータ
     */
    constructor(scene, target, params = {}) {
        this.scene = scene;
        this.target = target;
        this.camera = scene.cameras.main;

        // --- パラメータ設定 ---
        // 画面のどの範囲を「スクロールゾーン」とするか (0.0 - 1.0の割合で指定)
        this.scrollZoneLeft = params.scrollZoneLeft !== undefined ? params.scrollZoneLeft : 0.4;   // 左側40%
        this.scrollZoneRight = params.scrollZoneRight !== undefined ? params.scrollZoneRight : 0.6; // 右側60%
    }

    /**
     * JumpSceneのupdateループから、毎フレーム呼び出される
     */
    update() {
        if (!this.target || !this.target.body || !this.target.active) {
            return;
        }

        // ▼▼▼【ここからがカメラ制御の核心です】▼▼▼

        const targetScreenX = this.target.x - this.camera.scrollX;
        const screenWidth = this.camera.width;

        // スクロールゾーンの具体的なX座標を計算
        const leftBoundary = screenWidth * this.scrollZoneLeft;
        const rightBoundary = screenWidth * this.scrollZoneRight;

        // --- プレイヤーが右のスクロールゾーンに入った場合 ---
        if (targetScreenX > rightBoundary) {
            // 超過した分だけカメラを右にスクロールさせる
            const scrollAmount = targetScreenX - rightBoundary;
            this.camera.scrollX += scrollAmount;
        } 
        // --- プレイヤーが左のスクロールゾーンに入った場合 ---
        else if (targetScreenX < leftBoundary) {
            // 超過した分だけカメラを左にスクロールさせる
            const scrollAmount = targetScreenX - leftBoundary;
            this.camera.scrollX += scrollAmount;
        }
        
        // カメラの境界チェックはPhaserが自動的に行ってくれる
        // (scene.cameras.main.setBoundsで設定済みのため)

        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    }
    
    // このコンポーネントは、破棄時に何もしなくて良いので、destroyは不要
}