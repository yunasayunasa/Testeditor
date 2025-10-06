// src/handlers/events/open_menu.js
import EngineAPI from '../../core/EngineAPI.js'; // ★ 1. インポート

export default async function open_menu(interpreter, params) {
    console.log(`%c[VSL LOG] Tag [open_menu] executed with params:`, 'color: #2196F3;', params);

    // ★ 2. interpreterから現在のシーンキーを取得し、EngineAPIを呼び出す
    const currentSceneKey = interpreter.scene.scene.key;
    EngineAPI.requestPauseMenu(currentSceneKey, params.layout);

    console.log(`[open_menu] Pause request sent via EngineAPI for scene '${currentSceneKey}'.`);
}
// define部分は変更なし

open_menu.define = {
    description: 'ゲームプレイシーンをポーズし、指定されたレイアウトでオーバーレイメニューを開きます。',
    params: [
        { key: 'layout', type: 'string', label: 'レイアウトキー', required: true }
    ]
};