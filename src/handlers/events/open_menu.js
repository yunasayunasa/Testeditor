// src/handlers/events/open_menu.js (最終FIX版)
import EngineAPI from '../../core/EngineAPI.js';

export default async function open_menu(interpreter, params) {
    console.log(`%c[VSL LOG] Tag [open_menu] executed with params:`, 'color: #2196F3;', params);

    // ★★★ 1. EngineAPIに、現在アクティブなゲームシーンを問い合わせる ★★★
    const activeGameSceneKey = EngineAPI.activeGameSceneKey;

    if (activeGameSceneKey) {
        // ★★★ 2. 取得した正しいシーンキーを渡して、ポーズをリクエストする ★★★
        EngineAPI.requestPauseMenu(activeGameSceneKey, params.layout);
        console.log(`[open_menu] Pause request sent via EngineAPI for scene '${activeGameSceneKey}'.`);
    } else {
        console.warn("[open_menu] Could not find an active game scene to pause.");
    }
}
// define部分は変更なし

open_menu.define = {
    description: 'ゲームプレイシーンをポーズし、指定されたレイアウトでオーバーレイメニューを開きます。',
    params: [
        { key: 'layout', type: 'string', label: 'レイアウトキー', required: true }
    ]
};