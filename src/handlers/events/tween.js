// /src/handlers/events/tween.js

/**
 * ★★★ 新形式対応版 ★★★
 * [tween] タグの処理
 * @param {ActionInterpreter} interpreter - アクションインタープリタのインスタンス
 * @param {object} params - タグからパースされたパラメータ
 * @param {Phaser.GameObjects.GameObject} target - アクションの対象となるオブジェクト
 * @returns {Promise<void>} アニメーション完了時に解決されるPromise
 */
export function handleTween(interpreter, params, target) {
    return new Promise(resolve => {
        // --- 1. インタプリタからシーンを取得し、存在チェック ---
        const scene = interpreter.scene;
        if (!target || !scene || !scene.tweens) {
            console.warn('[tween] Target or Scene (or scene.tweens) not found.');
            resolve();
            return;
        }

        // --- 2. tweenConfigの構築 (ロジックは変更なし) ---
        const tweenConfig = {
            targets: target,
            duration: params.time ? parseInt(params.time) : 1000,
            ease: params.ease || 'Linear',
            yoyo: params.yoyo === 'true',
            loop: params.loop ? parseInt(params.loop) : 0,
        };
        const prop = params.property;
        if (!prop || params.to === undefined) {
            console.warn('[tween] "property" and "to" parameters are required.');
            resolve();
            return;
        }
        tweenConfig[prop] = isNaN(params.to) ? params.to : parseFloat(params.to);
        
        // --- 3. onCompleteコールバックの設定 (変更なし) ---
        tweenConfig.onComplete = () => {
            // 無限ループ(-1)でない場合のみ、Promiseを解決して次のアクションへ進める
            if (tweenConfig.loop !== -1) {
                resolve();
            }
        };

        // --- 4. Tweenの実行 ---
        // interpreter.scene ではなく、上で取得した scene 変数を使う
        scene.tweens.add(tweenConfig);

        // --- 5. 無限ループの場合は、待たずに即座に次のアクションへ進む ---
        if (tweenConfig.loop === -1) {
            resolve();
        }
    });
}