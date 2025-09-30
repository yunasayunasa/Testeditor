// in src/components/ReturnHomeComponent.js (新規作成)

export default class ReturnHomeComponent {

    constructor(scene, owner, params = {}) {
        this.gameObject = owner;
        this.scene = owner.scene;

        // --- パラメータ ---
        this.fadeOutDuration = params.fadeOutDuration || 500; // 消えるまでの時間(ms)
        this.repopDelay = params.repopDelay || 1000;      // 再出現までの待機時間(ms)
        this.fadeInDuration = params.fadeInDuration || 500;   // 再出現時の時間(ms)

        // --- 内部状態 ---
        this.homePosition = new Phaser.Math.Vector2(); // 初期位置を記憶する
        this.isReturning = false; // 帰宅中かどうかのフラグ
    }

    start() {
        // --- 1. 自身の初期位置を「故郷」として記憶する ---
        this.homePosition.set(this.gameObject.x, this.gameObject.y);
        console.log(`[ReturnHome] '${this.gameObject.name}' home set to (${this.homePosition.x}, ${this.homePosition.y})`);
    }

    /**
     * ★★★ ChaseComponentから呼び出される、このコンポーネントの心臓部 ★★★
     * 帰宅プロセスを開始する。
     */
    startReturning() {
        // 既に帰宅中なら何もしない
        if (this.isReturning) return;
        this.isReturning = true;

        console.log(`[ReturnHome] '${this.gameObject.name}' is starting to return home.`);

        // --- 1. フェードアウトのTweenを開始 ---
        this.scene.tweens.add({
            targets: this.gameObject,
            alpha: 0,
            duration: this.fadeOutDuration,
            ease: 'Power2',
            onComplete: () => {
                // --- 2. Tween完了後、オブジェクトを非アクティブ＆非表示にする ---
                this.gameObject.setActive(false).setVisible(false);
                
                // 物理ボディも無効化して、他のオブジェクトと衝突しないようにする
                if (this.gameObject.body) {
                    this.gameObject.body.enable = false;
                }

                // --- 3. 一定時間待ってから、リポップ処理を呼び出す ---
                this.scene.time.delayedCall(this.repopDelay, this.repopAtHome, [], this);
            }
        });
    }

    /**
     * 初期位置に再出現（リポップ）させる処理
     */
    repopAtHome() {
        console.log(`[ReturnHome] '${this.gameObject.name}' is repoping at home.`);
        
        // --- 1. 記憶しておいた「故郷」の座標に、瞬時に移動させる ---
        this.gameObject.setPosition(this.homePosition.x, this.homePosition.y);
        
        // 物理ボディも座標に追従させる
        if (this.gameObject.body) {
            // setPositionはボディの中心を移動させるので、これでOK
        }

        // --- 2. オブジェクトを再びアクティブ＆表示状態に戻す ---
        this.gameObject.setActive(true).setVisible(true);
        if (this.gameObject.body) {
            this.gameObject.body.enable = true;
        }

        // --- 3. フェードインのTweenを開始 ---
        this.scene.tweens.add({
            targets: this.gameObject,
            alpha: 1,
            duration: this.fadeInDuration,
            ease: 'Power2',
             onComplete: () => {
            this.isReturning = false;
            console.log(`[ReturnHome] '${this.gameObject.name}' has returned home.`);

            // ▼▼▼【ここが修正の核心です】▼▼▼
            // 「私の支配は終わった」というイベントをブロードキャストする
            this.gameObject.emit('onAiBehaviorChange', {
                source: 'ReturnHomeComponent',
                active: false // 支配を終了したことを示す
            });
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        }
    });
}

    // このコンポーネントはupdateループを必要としない
}

/**
 * IDEのプロパティパネルに表示するための自己定義
 */
ReturnHomeComponent.define = {
    params: [
        { key: 'fadeOutDuration', type: 'range', label: 'フェードアウト時間(ms)', min: 100, max: 2000, step: 50, defaultValue: 500 },
        { key: 'repopDelay', type: 'range', label: 'リポップ遅延(ms)', min: 0, max: 5000, step: 100, defaultValue: 1000 },
        { key: 'fadeInDuration', type: 'range', label: 'フェードイン時間(ms)', min: 100, max: 2000, step: 50, defaultValue: 500 }
    ]
};