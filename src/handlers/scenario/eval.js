/**
 * [eval] タグ - 変数の操作
 * 
 * @param {ScenarioManager} manager - ScenarioManagerのインスタンス
 * @param {object} params - { exp: string }
 */
export default async function handleEval(manager, params) {
    const { exp } = params;
    if (!exp) {
        console.warn('[eval] exp属性は必須です。');
        return;
    }

    try {
        const assignmentIndex = exp.indexOf('=');
        
        if (assignmentIndex > -1) {
            // --- 代入式の場合 ---
            const path = exp.substring(0, assignmentIndex).trim();
            const valueExpression = exp.substring(assignmentIndex + 1).trim();

            if (path.startsWith('f.') || path.startsWith('sf.')) {
                // 右辺(値)を、StateManagerの安全なevalで評価
                const value = manager.stateManager.eval(valueExpression);
                
                // evalが成功し、有効な値が返ってきた場合のみ、設定を実行する
                if (value !== undefined) {
                    manager.stateManager.setValueByPath(path, value);
                } else {
                    // evalが失敗した(undefinedを返した)場合は、警告を出す
                    console.error(`[eval] 値の評価に失敗したため、代入を中止しました。右辺を確認してください: ${valueExpression}`);
                }

            } else {
                console.warn(`[eval] 無効な代入式です。左辺は 'f.' または 'sf.' で始まる必要があります: ${exp}`);
            }

        } else {
            // --- 代入式ではない場合 ---
            manager.stateManager.eval(exp);
        }

    } catch (e) {
        // ★★★ 構文エラーを修正 ★★★
        console.error(`[eval] 式の実行中に予期せぬエラーが発生しました: "${exp}"`, e);
    }
}