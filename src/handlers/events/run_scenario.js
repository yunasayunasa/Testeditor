// src/handlers/events/run_scenario.js

/**
 * [run_scenario] アクションタグ
 * 現在のシーンの上で、オーバーレイとしてノベルパートを再生します。
 * @param {ActionInterpreter} interpreter
 * @param {object} params
 * @returns {Promise<void>} オーバーレイが終了するまで待機
 */
export default async function run_scenario(interpreter, params) {
    const file = params.file;
    if (!file) {
        console.warn('[run_scenario] "file" parameter is missing.');
        return;
    }

    const block_input = params.block_input !== 'false'; // デフォルトはtrue
    const scene = interpreter.scene;
    const systemScene = scene.scene.get('SystemScene');

    // ★ Promiseを使って、オーバーレイが閉じるまで、VSLの実行を「待機」させる
    return new Promise(resolve => {
        systemScene.events.emit('request-overlay', {
            from: scene.scene.key,
            scenario: file,
            block_input: block_input
        });

        // オーバーレイが終了したことを知るためのリスナー
        systemScene.events.once('end-overlay', () => {
            console.log(`[run_scenario] Overlay finished. Resuming action sequence.`);
            resolve(); // Promiseを解決し、次のノードへ進む
        });
    });
}

/**
 * ★ VSLエディタ用の自己定義 ★
 */
run_scenario.define = {
    description: '現在のシーンの上で、オーバーレイとしてノベルパートを再生します。',
    params: [
        { key: 'file', type: 'string', label: 'シナリオファイル名', defaultValue: '' },
        { key: 'block_input', type: 'boolean', label: '背後を操作不能に', defaultValue: true }
    ]
};