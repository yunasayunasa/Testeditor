// in src/handlers/events/open_menu.js (最終完成形)
import EngineAPI from '../../core/EngineAPI.js';

export default async function open_menu(interpreter, params) {
    // パラメータから data 文字列を取得
    const dataString = params.data || '{}';
    let eventData = {};
    
    try {
        // 文字列をJSONオブジェクトにパース
        eventData = JSON.parse(dataString);
    } catch (e) {
        console.error(`[open_menu] Invalid format for "data" parameter. Must be a valid JSON string. Received: ${dataString}`, e);
    }
    
    console.log(`%c[VSL LOG] Firing Game Flow Event: OPEN_PAUSE_MENU with data:`, 'color: #2196F3;', eventData);
    
    // OPEN_PAUSE_MENU イベントを、パースしたデータと共に発行
    EngineAPI.fireGameFlowEvent('OPEN_PAUSE_MENU', eventData);
}

// defineプロパティも、dataを受け取れるように修正
open_menu.define = {
    description: 'ポーズメニューを開くためのゲームフローイベントを発行します。dataパラメータで追加情報を渡せます。',
    params: [
        { key: 'data', type: 'string', label: 'パラメータ (JSON形式)', defaultValue: '{}' }
    ]
};