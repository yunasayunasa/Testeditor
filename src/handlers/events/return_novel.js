// /src/handlers/events/return_novel.js

/**
 * ★★★ 最終FIX版 ★★★
 * [return_novel] タグハンドラ
 * 既存のSystemScene._handleReturnToNovelが期待するデータ形式でイベントを発行する
 * @param {ActionInterpreter} interpreter - アクションインタープリタのインスタンス
 * @param {object} params - タグのパラメータ (e.g., params="{ key: 'value' }")
 */
export default function returnNovelHandler(interpreter, params) {
    const scene = interpreter.scene;
    const fromSceneKey = scene.scene.key;

    console.log(`[return_novel] Requesting return to novel from '${fromSceneKey}'`);

    // --- SystemSceneが期待するデータオブジェクトを作成 ---
    const eventData = {
        from: fromSceneKey,
        params: {} // デフォルトは空のオブジェクト
    };

    // --- タグに params="{...}" が指定されていれば、それを復帰後のGameSceneに渡す ---
    if (params.params) {
        try {
            // JSON文字列をパースしてオブジェクトに変換
            eventData.params = JSON.parse(params.params);
        } catch (e) {
            console.error(`[return_novel] Failed to parse "params" parameter. Make sure it's valid JSON.`, e);
        }
    }

    // --- 作成したデータオブジェクトを渡して、イベントを発行 ---
    scene.scene.get('SystemScene').events.emit('return-to-novel', eventData);
}