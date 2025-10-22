// src/handlers/events/fire_event.js
import EngineAPI from '../../core/EngineAPI.js'; // ★ 1. インポート

export default async function fire_event(interpreter, params) {
    console.log(`%c[LOG 1: 発火点] [fire_event]が呼ばれました。イベント名: '${params.name}'`, 'color: #e91e63; font-weight: bold;');
    const eventName = params.name;
    if (!eventName) {
        console.warn('[fire_event] "name" parameter is missing.');
        return;
    }

    const stateManager = interpreter.scene.registry.get('stateManager');
    let eventParams = params.params;
    if (stateManager && typeof eventParams === 'string' && eventParams.trim() !== '') { // ← 空白でないこともチェック
    try {
        eventParams = stateManager.eval(eventParams);
    } catch(e) {
        // 文字列リテラルの場合は、そのまま使う
    }
}
    
     // ★ 2. EngineAPIを呼び出す
    EngineAPI.fireEvent(eventName, eventParams);
    
    // console.log(`[fire_event] Event '${eventName}' fired via EngineAPI with params:`, eventParams);
}

fire_event.define = {
    description: 'システム全体に、カスタムイベントを発行します。',
    params: [
        { key: 'name', type: 'string', label: 'イベント名', defaultValue: '' },
        { key: 'params', type: 'string', label: 'パラメータ', defaultValue: '' }
    ]
};