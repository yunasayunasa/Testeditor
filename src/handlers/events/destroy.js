// src/handlers/events/destroy.js

/**
 * [destroy] アクションタグ
 * ターゲットのオブジェクトをシーンから破壊します。
 * @param {ActionInterpreter} interpreter
 * @param {object} params - このタグではパラメータは使用しません
 * @param {Phaser.GameObjects.GameObject} target - 破壊対象のオブジェクト
 */
export default async function destroy(interpreter, params, target) { 
    if (target && typeof target.destroy === 'function') {
        target.destroy();
    } else {
        const targetName = target ? target.name : 'unknown';
        console.warn(`[destroy] Target '${targetName}' could not be destroyed.`);
    }
}

/**
 * ★ VSLエディタ用の自己定義 ★
 */
destroy.define = {
    description: 'ターゲットのオブジェクトをシーンから破壊（削除）します。',
    // パラメータは 'target' だけで、これはアクションタグの基本機能なので、
    // params配列で定義する必要はありません。
    params: []
};