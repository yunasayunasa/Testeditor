
/**
 * [eval] アクションタグ ...
 */
// ★★★ 関数名を 'eval' から 'evalExpression' に変更 ★★★
export default async function evalExpression(interpreter, target, params) {
    if (!params.exp) {
        console.warn('[eval tag] Missing required parameter: exp');
        return;
    }

    const stateManager = interpreter.scene.registry.get('stateManager');
    if (!stateManager) {
        console.error('[eval tag] StateManager not found in scene registry.');
        return;
    }

    try {
        // StateManagerの安全なexecuteメソッドを呼び出す
        stateManager.execute(params.exp); 
    } catch (e) {
        console.error(`[eval tag] Error executing expression: "${params.exp}"`, e);
    }
}