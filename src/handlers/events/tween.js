/**
 * [tween] タグの処理 (シグネチャ統一・最終版)
 * @param {Phaser.Scene} currentScene - アクションが実行される現在のシーンインスタンス
 * @param {Phaser.GameObjects.GameObject} target - アクションの対象となるオブジェクト
 * @param {object} params - タグからパースされたパラメータ
 * @returns {Promise<void>} アニメーション完了時に解決されるPromise
 */
export function handleTween(currentScene, target, params) {
    return new Promise(resolve => {
        // --- 1. ターゲットとシーンの存在チェック ---
        if (!target || !currentScene || !currentScene.tweens) {
            console.warn('[tween] Target or Scene (or scene.tweens) not found.');
            resolve();
            return;
        }

        // ... (tweenConfigの構築は、前回の私の提案通り) ...
        const tweenConfig = {
            targets: target,
            duration: params.time ? parseInt(params.time) : 1000,
            ease: params.ease || 'Linear',
            yoyo: params.yoyo === 'true',
            loop: params.loop ? parseInt(params.loop) : 0,
        };
        const prop = params.property;
        if (!prop || params.to === undefined) { /* ... */ return; }
        tweenConfig[prop] = isNaN(params.to) ? params.to : parseFloat(params.to);
        
        tweenConfig.onComplete = () => {
            if (tweenConfig.loop !== -1) resolve();
        };

        // ▼▼▼【ここがエラーを修正する核心部分です】▼▼▼
        // interpreter.scene.tweens ではなく、
        // 第一引数で渡された、常に新鮮な currentScene.tweens を使う
        currentScene.tweens.add(tweenConfig);
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        if (tweenConfig.loop === -1) {
            resolve();
        }
    });
}