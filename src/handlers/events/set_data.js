// src/handlers/events/set_data.js

/**
 * [set_data] アクションタグ
 * ゲーム変数 (f.) を設定します。
 * @param {ActionInterpreter} interpreter
 * @param {object} params
 */
export default async function set_data(interpreter, params) {
    const name = params.name;
    let value = params.value;

    if (name === undefined || value === undefined) {
        console.warn('[set_data] "name" and "value" parameters are required.');
        return;
    }

    // ★ 'f.'のプレフィックスは自動で補完/削除する方がユーザーフレンドリー
    const key = name.startsWith('f.') ? name.substring(2) : name;
    
    const stateManager = interpreter.scene.registry.get('stateManager');
    if (!stateManager) return;

    let finalValue;
    try {
        // ★ stateManager.evalを使って、式を安全に評価する
        //    (例: 'f.score + 100' や 'true' や '123' など、すべてを扱える)
        finalValue = stateManager.eval(value);
    } catch (e) {
        // evalが失敗した場合 (例: 'hello' のような文字列リテラル)、元の文字列をそのまま使う
        finalValue = value;
    }
    
    stateManager.setF(key, finalValue);
}

/**
 * ★ VSLエディタ用の自己定義 ★
 */
set_data.define = {
    description: 'ゲーム変数(f.)に値を設定します。値には式も使えます (例: f.score + 100)。',
    params: [
        { key: 'name', type: 'string', label: '変数名 (f.)', defaultValue: 'f.variable' },
        { key: 'value', type: 'string', label: '設定する値/式', defaultValue: '0' }
    ]
};