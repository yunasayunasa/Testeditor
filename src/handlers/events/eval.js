
/**
 * [eval] アクションタグ
 * StateManagerの変数を操作する。
 * @param {ActionInterpreter} interpreter - ActionInterpreterのインスタンス
 * @param {Phaser.GameObjects.GameObject} target - アクションの対象オブジェクト
 * @param {object} params - パラメータ
 * @param {string} params.exp - 実行するJavaScript式 (例: "f.score = f.score + 10")
 */
export default async function eval(interpreter, target, params) {
    // expパラメータがなければ何もしない
    if (!params.exp) {
        console.warn('[eval tag] Missing required parameter: exp');
        return;
    }

    // シーンからStateManagerを取得
    const stateManager = interpreter.scene.registry.get('stateManager');
    if (!stateManager) {
        console.error('[eval tag] StateManager not found in scene registry.');
        return;
    }

    try {
        // StateManagerの安全なevalメソッドを呼び出す
        // こちらは代入も許可するバージョン (もしなければStateManegerに実装が必要)
        stateManager.execute(params.exp); 
    } catch (e) {
        console.error(`[eval tag] Error executing expression: "${params.exp}"`, e);
    }
}