// in src/components/Interactor.js (最終・完成版)

export default class Interactor {
    constructor(scene, owner, params = {}) {
        this.scene = owner.scene;
        this.gameObject = owner;
        
        // --- パラメータ ---
        this.interactKeyName = params.key || 'UP'; // ★ キーの名前を保持
        this.interactKey = scene.input.keyboard.addKey(this.interactKeyName);
        this.interactionRadius = params.radius || 50; // ★ 対話可能な半径
        this.targetGroup = params.targetGroup || 'interactable'; // ★ 対話対象のグループ
        this.iconType = params.iconType || 'exclamation'; // defineから受け取る
        this.iconColor = parseInt(params.iconColor) || 0xffff00; // 16進数文字列を数値に変換
        // --- 内部状態 ---
        this.closestInteractable = null; // 最も近い対話可能なオブジェクト
        this.interactIcon = null;

        // --- イベントリスナー ---
        this.interactKey.on('down', this.onInteract, this);
        // ★ スマホ対応のために、UIボタンからのイベントもリッスンする
        this.scene.events.on('interact_button_pressed', this.onInteract, this);
    }

    start() {
        // ▼▼▼【ここを Graphics を生成するように変更】▼▼▼
        // --------------------------------------------------------------------
        // シーンに 'interact_icon' という名前のImageを探すのをやめる。
        // 代わりに、このコンポーネント自身が描画用のGraphicsオブジェクトを生成して管理する。
        this.interactIcon = this.scene.add.graphics();
        this.interactIcon.setAlpha(0); // 初期状態は透明
        this.interactIcon.setDepth(1000); // 他のオブジェクトより手前に表示
        // --------------------------------------------------------------------
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    }
     /**
     * ★★★ パラメータに応じて描画内容を切り替える、究極の描画メソッド ★★★
     */
    drawInteractIcon() {
        if (!this.interactIcon) return;

        this.interactIcon.clear();
        
        // タイプが 'none' なら、何も描画せずに終了
        if (this.iconType === 'none') {
            return;
        }

        // --- 色とスタイルを設定 ---
        this.interactIcon.fillStyle(this.iconColor); // パラメータで受け取った色
        this.interactIcon.lineStyle(2, 0x333333);

        // --- タイプに応じて描画を分岐 ---
        switch (this.iconType) {
            case 'exclamation': {
                const iconWidth = 20;
                const iconHeight = 40;
                const dotSize = 8;
                this.interactIcon.fillRoundedRect(-iconWidth / 2, -iconHeight / 2, iconWidth, iconHeight - dotSize - 5, 5);
                this.interactIcon.strokeRoundedRect(-iconWidth / 2, -iconHeight / 2, iconWidth, iconHeight - dotSize - 5, 5);
                this.interactIcon.fillCircle(0, iconHeight / 2 - dotSize / 2, dotSize / 2);
                this.interactIcon.strokeCircle(0, iconHeight / 2 - dotSize / 2, dotSize / 2);
                break;
            }
            case 'question': {
                // ここに「？」を描画するロジックを追加
                // (Graphicsの arc や lineTo を使うと描画できます)
                const text = this.scene.add.text(0, 0, '?', { fontSize: '40px', color: `#${this.iconColor.toString(16)}`, fontStyle: 'bold' }).setOrigin(0.5);
                this.interactIcon.add(text); // GraphicsにTextを追加する
                break;
            }
            case 'dots': {
                // ここに「...」を描画するロジックを追加
                this.interactIcon.fillCircle(-20, 0, 5);
                this.interactIcon.fillCircle(0, 0, 5);
                this.interactIcon.fillCircle(20, 0, 5);
                break;
            }
        }
    }


    /**
     * updateループで、対話可能なオブジェクトを常に探し続ける
     */
    update(time, delta) {
        // BaseGameSceneのヘルパーを使い、指定されたグループの全オブジェクトを取得
        const candidates = this.scene.getObjectsByGroup(this.targetGroup);
        if (!candidates || candidates.length === 0) {
            this.closestInteractable = null;
            return;
        }

        let closest = null;
        let minDistance = this.interactionRadius; // ★ 半径内のオブジェクトのみを対象

        for (const candidate of candidates) {
            const distance = Phaser.Math.Distance.BetweenPoints(this.gameObject, candidate);
            if (distance < minDistance) {
                minDistance = distance;
                closest = candidate;
            }
        }
         if (this.closestInteractable !== closest) {
            this.closestInteractable = closest;

            if (this.interactIcon) {
                if (this.closestInteractable) {
                    // --- 見つけた場合 ---
                    // 1. アイコンを、見つけたオブジェクトの上に移動させる
                    this.interactIcon.setPosition(this.closestInteractable.x, this.closestInteractable.y - 40);
                    
                    // ▼▼▼【ここを描画処理に変更】▼▼▼
                    this.drawInteractIcon(); // ★ 新しい描画メソッドを呼ぶ
                    
                    // 2. アイコンを表示する
                    this.scene.tweens.add({ targets: this.interactIcon, alpha: 1, duration: 200 });
                } else {
                    // --- 見失った場合 ---
                    // アイコンを非表示にする
                    this.scene.tweens.add({ targets: this.interactIcon, alpha: 0, duration: 200 });
                }
            }
        }
    }

    /**
     * ★★★ 新規追加 ★★★
     * Graphicsオブジェクトに「！」マークを描画するメソッド
     */
    drawInteractIcon() {
        if (!this.interactIcon) return;

        const iconWidth = 20;
        const iconHeight = 40;
        const dotSize = 8;

        // 以前の描画をクリア
        this.interactIcon.clear();
        
        // 色とスタイルを設定
        this.interactIcon.fillStyle(0xffff00); // 黄色
        this.interactIcon.lineStyle(2, 0x333333); // 暗い色の枠線

        // 「！」の縦棒を描画 (角丸四角形)
        this.interactIcon.fillRoundedRect(
            -iconWidth / 2,         // 左上のX (中心が0,0)
            -iconHeight / 2,        // 左上のY
            iconWidth,              // 幅
            iconHeight - dotSize - 5, // 高さ (点との間に少し隙間)
            5                       // 角の丸み
        );
        this.interactIcon.strokeRoundedRect(
            -iconWidth / 2, -iconHeight / 2,
            iconWidth, iconHeight - dotSize - 5, 5
        );

        // 「！」の点を描画 (円)
        this.interactIcon.fillCircle(
            0,                      // 中心のX
            iconHeight / 2 - dotSize / 2, // 中心のY
            dotSize / 2             // 半径
        );
        this.interactIcon.strokeCircle(
            0, iconHeight / 2 - dotSize / 2, dotSize / 2
        );
    }

    /**
     * インタラクトキー、またはUIボタンが押されたときに呼ばれる
     */
    onInteract() {
        // 対話可能なオブジェクトが範囲内にいなければ、何もしない
        if (!this.closestInteractable) return;

        console.log(`[Interactor] Interact command fired for '${this.closestInteractable.name}'`);

        // ★ 最も近いオブジェクトの 'onInteract' イベントを発火させる
        const events = this.closestInteractable.getData('events') || [];
        for (const eventData of events) {
            if (eventData.trigger === 'onInteract') {
                this.scene.actionInterpreter.run(this.closestInteractable, eventData, this.gameObject);
            }
        }
    }

    destroy() {
        // ★★★ destroyで、生成したGraphicsオブジェクトも破棄する ★★★
        if (this.interactIcon) {
            this.interactIcon.destroy();
            this.interactIcon = null;
        }
        
        this.interactKey.off('down', this.onInteract, this);
        this.scene.events.off('interact_button_pressed', this.onInteract, this);
    }
}

/**
 * ★★★ 自己定義(define)を追加 ★★★
 */

/**
 * ★★★ アイコンのカスタマイズに対応した、究極の自己定義(define) ★★★
 */
Interactor.define = {
    params: [
        { key: 'key', type: 'text', label: 'インタラクトキー', defaultValue: 'UP' },
        { key: 'radius', type: 'range', label: '対話半径', min: 10, max: 200, step: 5, defaultValue: 50 },
        { key: 'targetGroup', type: 'text', label: '対話対象のGroup', defaultValue: 'interactable' },
        { 
            key: 'iconType', 
            type: 'select', // ドロップダウンで選ばせる
            label: 'アイコンタイプ',
            options: ['exclamation', 'question', 'dots', 'none'], // 「！」、「？」、「...」、「表示しない」
            defaultValue: 'exclamation'
        },
        { 
            key: 'iconColor', 
            type: 'text', // カラーピッカーも作れるが、まずはテキストで16進数コードを入力
            label: 'アイコン色 (16進数)',
            defaultValue: '0xffff00' // 黄色
        }
    ]
};