// src/handlers/events/return_novel.js

/**
 * [return_novel] アクションタグ
 * 現在のゲームシーンを終了し、ノベルパート（GameScene）に戻ります。
 * @param {ActionInterpreter} interpreter
 * @param {object} params
 */
export default async function return_novel(interpreter, params) {
    const scene = interpreter.scene;
    if (!scene) return;

    const eventData = {
        from: scene.scene.key,
        params: {}
    };

    if (params.params) {
        try {
            // " (ダブルクォート) を ' (シングルクォート) に置換して、JSONパースの互換性を上げる
            const sanitizedJson = params.params.replace(/'/g, '"');
            eventData.params = JSON.parse(sanitizedJson);
        } catch (e) {
            console.error(`[return_novel] "params"の解析に失敗しました。有効なJSON形式（例: '{"score":100, "clear":true}'）で記述してください。`, e);
        }
    }

    scene.scene.get('SystemScene').events.emit('return-to-novel', eventData);
}

/**
 * ★ VSLエディタ用の自己定義 ★
 */
return_novel.define = {
    description: '現在のゲームシーンを終了し、ノベルパートに戻ります。',
    params: [
        {
            key: 'params',
            type: 'string',
            label: '復帰後パラメータ',
            defaultValue: ''
        }
    ]
};