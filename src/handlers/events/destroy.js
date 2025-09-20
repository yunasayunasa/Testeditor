// src/handlers/events/destroy.js

/**
 * [destroy] アクションタグ
 * ターゲットのオブジェクトをシーンから破壊します。
 * @param {ActionInterpreter} interpreter
 * @param {object} params
 * @param {Phaser.GameObjects.GameObject} target - ActionInterpreterによって解決された破壊対象オブジェクト
 */
export default async function destroy(interpreter, params, target) { 
    // ▼▼▼【デバッグログを追加】▼▼▼
    const sourceObject = interpreter.currentSource;
    const collidedTargetObject = interpreter.currentTarget;
    console.log(`%c[DEBUG | destroy] が実行されました。`, 'color: red; font-weight: bold;');
    console.log(`  > VSLで指定されたパラメータ(params.target): '${params.target}'`);
    console.log(`  > ActionInterpreterが解決したターゲット(target)の名前: '${target ? target.name : 'null'}'`);
    console.log(`  --- コンテキスト情報 ---`);
    console.log(`  > イベント発生源(source)の名前: '${sourceObject ? sourceObject.name : 'null'}'`);
    console.log(`  > 衝突の相手(collidedTarget)の名前: '${collidedTargetObject ? collidedTargetObject.name : 'null'}'`);
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    if (target && typeof target.destroy === 'function') {
        // デバッグ中は、実際に消さないように一旦コメントアウト
        // target.destroy();
        console.log(`  > 実際にdestroy()されるはずだったのは: ${target.name}`);
    } else {
        const targetName = params.target || 'unknown';
        console.warn(`[destroy] ターゲット '${targetName}' を破壊できませんでした。`);
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