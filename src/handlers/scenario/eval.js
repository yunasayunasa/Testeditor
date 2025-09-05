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
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが全てを解決する、唯一の修正です ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // 式を '=' で分割し、代入の左辺(path)と右辺(value)に分ける
        // "f.score = f.score + 10" のような式にも対応できるよう、最初の'='で分割
        const assignmentIndex = exp.indexOf('=');
        
        if (assignmentIndex > -1) {
            // --- 代入式の場合 ---
            const path = exp.substring(0, assignmentIndex).trim();
            const valueExpression = exp.substring(assignmentIndex + 1).trim();

            if (path.startsWith('f.') || path.startsWith('sf.')) {
                // 右辺(値)を、StateManagerの安全なevalで評価して実際の値を取得する
                // 例: "f.score + 10" -> 110
                // 例: "'マスター'" -> "マスター"
                const value = manager.stateManager.eval(valueExpression);
                
                // 新しいsetValueByPathメソッドで、安全に値を設定する
                manager.stateManager.setValueByPath(path, value);
            } else {
                console.warn(`[eval] 無効な代入式です。左辺は 'f.' または 'sf.' で始まる必要があります: ${exp}`);
            }

        } else {
            // --- 代入式ではない場合 (例: [eval exp="someFunction()"]) ---
            // 従来のevalメソッドを呼び出す（ただし、戻り値は使わない）
            console.warn(`[eval] 代入を伴わない式の実行は非推奨です: ${exp}`);
            manager.stateManager.eval(exp);
        }

    } catch (e) {
        console.error(`[eval] 式の実行中に予期せぬエラーが発生しました: "${exp}"`, e);
    }
}