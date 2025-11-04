// in src/handlers/events/fire_game_flow_event.js
import EngineAPI from '../../core/EngineAPI.js';

export default async function fire_game_flow_event(interpreter, params) {
    const eventName = params.event;
    if (!eventName) {
        console.warn('[fire_game_flow_event] "event" parameter is missing.');
        return;
    }
    
    const stateManager = interpreter.scene.registry.get('stateManager');
    let dataString = params.data || '{}';
    let eventData = {};

    if (stateManager) {
        // &{...} という形式の変数埋め込みを正規表現で探す
        const variableRegex = /&\{([^}]+)\}/g;
        dataString = dataString.replace(variableRegex, (match, variablePath) => {
            const value = stateManager.getValue(variablePath.trim());
             // JSON.stringify は不要。ただし、文字列の場合はクォートで囲む必要がある。
    if (typeof value === 'string') {
        return `"${value}"`; // ダブルクォートで囲んで返す
    }
    return value !== undefined ? value : 'null'; // 文字列以外はそのまま返す
        });
    }
    
    try {
        // 変数埋め込み後の文字列をJSONとしてパース
        eventData = JSON.parse(dataString);
    } catch (e) {
        console.error(`[fire_game_flow_event] Invalid format for "data" parameter after variable substitution. Must be a valid JSON string. Received: ${dataString}`, e);
        return;
    }

    EngineAPI.fireGameFlowEvent(eventName, eventData);
}

fire_game_flow_event.define = {
    description: 'ゲームフローイベントを発行します。dataパラメータ内で &{f.variable} 形式の変数埋め込みが可能です。',
    params: [
        { key: 'event', type: 'game_flow_event_select', label: 'イベント名', required: true },
        { key: 'data', type: 'string', label: 'パラメータ (JSON形式)', defaultValue: '{}' }
    ]
};