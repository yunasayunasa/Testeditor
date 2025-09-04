// src/handlers/eval.js (最終確定版)

/**
 * [eval] タグの処理
 * JavaScriptの式を、ゲーム内変数のスコープで実行する。
 * @param {ScenarioManager} manager
 * @param {Object} params - { exp }
 */
// "export default async function" に変更
export default async function handleEval(manager, params) {
    const exp = params.exp;
    if (!exp) {
        console.warn('[eval] exp属性は必須です。');
        return; // async functionなのでPromiseを返す必要はない
    }

    try {
        // managerからstateManagerを正しく取得してevalを呼ぶ
        manager.stateManager.eval(exp); 
    } catch (e) {
        console.error(`[eval] 式の実行中に予期せぬエラーが発生しました: "${exp}"`, e);
    }
}