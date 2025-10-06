// src/handlers/events/run_scenario.js
import EngineAPI from '../../core/EngineAPI.js'; // ★ インポート

export default async function run_scenario(interpreter, params) {
    const file = params.file;
    if (!file) {
        console.warn('[run_scenario] "file" parameter is missing.');
        return;
    }

    const block_input = params.block_input !== 'false';
    const scene = interpreter.scene;

    // ★★★ EngineAPIに処理を完全に委譲し、Promiseが解決されるのを待つだけ ★★★
    await EngineAPI.runScenarioAsOverlay(scene.scene.key, file, block_input);

    console.log(`[run_scenario] Overlay finished. Resuming action sequence.`);
}
// define部分は変更なし
// ...

/**
 * ★ VSLエディタ用の自己定義 ★
 */
run_scenario.define = {
    description: '現在のシーンの上で、オーバーレイとしてノベルパートを再生します。',
    params: [
        { key: 'file', type: 'string', label: 'シナリオファイル名', defaultValue: '' },
        { key: 'block_input', type: 'select', options: ['true', 'false'] ,label: '背後を操作不能に', defaultValue: true }
    ]
};