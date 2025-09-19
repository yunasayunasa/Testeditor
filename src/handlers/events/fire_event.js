
// src/handlers/events/fire_event.js

/**
 * [fire_event] アクションタグ
 * SystemScene経由で、グローバルなカスタムイベントを発行します。
 * @param {ActionInterpreter} interpreter
 * @param {object} params
 */
export default async function fire_event(interpreter, params) {
    const eventName = params.name;
    if (!eventName) {
        console.warn('[fire_event] "name" parameter is missing.');
        return;
    }

    // ★ パラメータは、安全に評価してから渡す
    const stateManager = interpreter.scene.registry.get('stateManager');
    let eventParams = params.params;
    if (stateManager && typeof eventParams === 'string') {
        try {
            eventParams = stateManager.eval(eventParams);
        } catch(e) {
            // 文字列リテラルの場合は、そのまま使う
        }
    }
    
    interpreter.scene.scene.get('SystemScene').events.emit(eventName, eventParams);
    console.log(`[fire_event] Event '${eventName}' fired with params:`, eventParams);
}

fire_event.define = {
    description: 'システム全体に、カスタムイベントを発行します。',
    params: [
        { key: 'name', type: 'string', label: 'イベント名', defaultValue: '' },
        { key: 'params', type: 'string', label: 'パラメータ', defaultValue: '' }
    ]
};