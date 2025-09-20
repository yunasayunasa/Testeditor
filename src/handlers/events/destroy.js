// src/handlers/events/destroy.js

/**
 * [destroy] アクションタグ (最終FIX版・改)
 * @param {ActionInterpreter} interpreter
 * @param {object} params
 * @param {object} context - runメソッドから渡される { source, target }
 */
export default async function destroy(interpreter, params, context) {
    let finalTarget = null;
    const targetId = params.target || 'source';

    if (targetId === 'source') {
        finalTarget = context.source; // ★ 第3引数のcontextから取得
    } else if (targetId === 'target') {
        finalTarget = context.target; // ★ 第3引数のcontextから取得
    } else {
        // 名前検索の場合は、従来のinterpreter.findTargetを使う
        finalTarget = interpreter.findTarget(targetId, interpreter.scene, context.source, context.target);
    }

    if (finalTarget && typeof finalTarget.destroy === 'function') {
        finalTarget.destroy();
    } else {
        console.warn(`[destroy] ターゲット '${targetId}' を破壊できませんでした。`);
    }
}
/**
 * ★ VSLエ-タ用の自己定義 ★
 */
destroy.define = {
    description: 'ターゲットのオブジェクトをシーンから破壊（削除）します。',
    params: [
        { 
            key: 'target', 
            type: 'select', 
            options: ['source', 'target'], // ★ 'self'をやめて、明確なキーワードにする
            label: 'ターゲット', 
            defaultValue: 'source' // ★ デフォルトも 'source' に
        }
    ]
};