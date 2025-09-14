/**
 * [run_scenario] タグハンドラ
 * NovelOverlaySceneを呼び出して、現在のゲームシーン上でシナリオを再生する。
 * @param {ActionInterpreter} interpreter - アクションインタープリタのインスタンス
 * @param {object} params - タグのパラメータ
 * @returns {Promise<void>}
 */
export default function runScenarioHandler(interpreter, params) {
    // このPromiseは、オーバーレイが閉じるまで解決されない（＝次のアクションに進まない）
    return new Promise(resolve => {
        const file = params.file;
        if (!file) {
            console.warn('[run_scenario] "file"パラメータがありません。');
            resolve(); // 待たずに即座に終了
            return;
        }

        const scene = interpreter.scene;
        const systemScene = scene.scene.get('SystemScene');

        // --- 1. SystemSceneにオーバーレイ表示を依頼 ---
        console.log(`[run_scenario] '${file}' のオーバーレイ表示をリクエストします。`);
        systemScene.events.emit('request-overlay', {
            from: scene.scene.key,
            scenario: file
            // 現時点では、入力は常にブロックする
        });

        // --- 2. オーバーレイが終了したことを知るためのリスナーを登録 ---
        systemScene.events.once('end-overlay', () => {
            console.log(`[run_scenario] オーバーレイが終了したので、アクションを再開します。`);
            resolve(); // Promiseを解決し、次のアクションへ進む
        });
    });
}