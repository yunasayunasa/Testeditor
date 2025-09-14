// /src/handlers/events/set_data.js

/**
 * [set_data] タグハンドラ
 * ゲーム変数 (f.) を設定する
 * @param {ActionInterpreter} interpreter - アクションインタープリタのインスタンス
 * @param {object} params - タグのパラメータ
 */
export default function setDataHandler(interpreter, params) {
    const name = params.name;
    let value = params.value;

    if (name === undefined || value === undefined) {
        console.warn('[set_data] "name" and "value" parameters are required.');
        return;
    }

    const stateManager = interpreter.scene.registry.get('stateManager');
    if (!stateManager) {
        console.error('[set_data] StateManager not found in registry.');
        return;
    }

    // --- 値の型を解釈 ---
    // valueが 'true'/'false' なら、booleanに変換
    if (value === 'true') {
        value = true;
    } else if (value === 'false') {
        value = false;
    }
    // valueが数値と解釈できるなら、数値に変換
    else if (!isNaN(value) && !isNaN(parseFloat(value))) {
        value = parseFloat(value);
    }
    // それ以外は文字列のまま

    // --- f.変数への代入式を解釈（例: "f.score + 100"） ---
    if (typeof value === 'string' && value.includes('f.')) {
        try {
            // 現在のゲーム変数(f)をコンテキストとして、文字列を式として評価
            const func = new Function('f', `'use strict'; return (${value});`);
            value = func(stateManager.f);
        } catch (e) {
            console.error(`[set_data] Failed to evaluate expression: "${value}"`, e);
            return;
        }
    }
    
    // StateManagerを使って、変数を設定
    stateManager.setF(name, value);
    console.log(`[set_data] Set f.${name} =`, value);
}