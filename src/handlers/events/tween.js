// src/actions/tween.js

/**
 * [tween] タグの処理 (ループ・テキスト対応・Phaser最適化版)
 * 対象オブジェクトのプロパティを、滑らかに変化させる
 * @param {ActionInterpreter} interpreter - 呼び出し元のインタープリタ
 * @param {Phaser.GameObjects.GameObject} target - アクションの対象となるオブジェクト
 * @param {object} params - タグからパースされたパラメータ
 * @returns {Promise<void>} アニメーション完了時に解決されるPromise
 */
export function handleTween(interpreter, target, params) {
    return new Promise(resolve => {
        const currentScene = interpreter.scene;

        // --- 1. ターゲットとシーンの存在チェック ---
        if (!target || !currentScene) {
            console.warn('[tween] Target or Scene not found.');
            resolve();
            return;
        }

        // --- 2. 必須パラメータのチェック ---
        const prop = params.property;
        if (!prop || params.to === undefined) {
            console.warn('[tween] "property" and "to" parameters are required.');
            resolve();
            return;
        }
        
        // --- 3. PhaserのTween設定オブジェクトを構築 ---
        const tweenConfig = {
            targets: target,
            duration: params.time ? parseInt(params.time) : 1000,
            ease: params.ease || 'Linear',
            
            // ★★★ ループとyoyo（往復）のサポート ★★★
            yoyo: params.yoyo === 'true',
            loop: params.loop ? parseInt(params.loop) : 0, // -1で無限ループ
        };

        // --- 4. 変化させるプロパティと値を設定 ---
        // Phaserが "+=100" や "-=50" のような相対値を自動で解釈してくれる
        // また、'scale'プロパティも自動でscaleXとscaleYに適用してくれる
        tweenConfig[prop] = isNaN(params.to) ? params.to : parseFloat(params.to);
        
        // --- 5. onCompleteコールバックを設定 ---
        tweenConfig.onComplete = () => {
            // 無限ループではない場合のみ、Promiseを解決して次のアクションに進む
            if (tweenConfig.loop !== -1) {
                resolve();
            }
        };

        // --- 6. Tweenを実行 ---
        currentScene.tweens.add(tweenConfig);

        // ★★★ 無限ループの場合は、待機せずに即座に次のアクションに進む ★★★
        if (tweenConfig.loop === -1) {
            console.log(`[tween] Infinite loop started on '${target.name}'. Proceeding to next action.`);
            resolve();
        }
    });
}