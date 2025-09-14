// src/actions/eval.js
// ★★★ ファイル名はeval.jsのままでOKです ★★★

// StateManagerをインポートする必要はありません。シーンから取得します。

export default async function evalExpression(interpreter, params, target) {
    if (!params.exp) {
        console.warn('[eval tag] Missing required parameter: exp');
        return;
    }

    // ★★★ interpreterから、それが属するシーンのインスタンスを取得 ★★★
    const scene = interpreter.scene;

    const stateManager = scene.registry.get('stateManager');
    if (!stateManager) {
        console.error('[eval tag] StateManager not found in scene registry.');
        return;
    }

    try {
        // ▼▼▼【ここからが修正箇所です】▼▼▼

        // --- interpreterから、現在のコンテキスト情報を取得 ---
        // ※これはActionInterpreterのrunメソッドが改修されている前提です
        const context = {
            source: interpreter.currentSource,
            target: interpreter.currentTarget,
            self: target // eval.jsに渡される'target'は、解決済みの'self'
        };

        // --- StateManagerの安全なexecuteメソッドに、コンテキストを渡して呼び出す ---
        stateManager.execute(params.exp, context); 
        
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    } catch (e) {
        console.error(`[eval tag] Error executing expression: "${params.exp}"`, e);
    }
}