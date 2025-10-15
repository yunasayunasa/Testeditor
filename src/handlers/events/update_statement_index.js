/**
 * [update_statement_index]タグ
 * 尋問中の証言インデックス(f.current_statement_index)を操作する。
 */
export default async function update_statement_index(interpreter, params, target) {
    // 1. StateManagerを取得
    const stateManager = interpreter.scene.registry.get('stateManager');
    if (!stateManager) return;

    // 2. 現在の証言データとインデックスを取得
    const testimonyId = stateManager.getValue('f.current_testimony_id');
    const testimonyData = interpreter.scene.cache.json.get(testimonyId);
    
    if (!testimonyData || !testimonyData.statements) return;

    const currentIndex = stateManager.getValue('f.current_statement_index') || 0;
    const maxIndex = testimonyData.statements.length - 1;

    // 3. パラメータに基づいて新しいインデックスを計算
    const direction = params.direction || 'next';
    let newIndex = currentIndex;

    if (direction === 'next') {
        newIndex++;
    } else if (direction === 'prev') {
        newIndex--;
    } else if (params.to !== undefined) {
        newIndex = parseInt(params.to);
    }
    
    // 4. 新しいインデックスが範囲内に収まるように調整 (Clamp)
    if (newIndex < 0) {
        newIndex = 0;
    }
    if (newIndex > maxIndex) {
        newIndex = maxIndex;
    }

    // 5. StateManagerに新しいインデックスを保存
    //    これにより、WatchVariableComponentが変更を検知し、UIが更新される
    stateManager.setF('current_statement_index', newIndex);
}

// VSLエディタ用の定義
update_statement_index.define = {
    description: '尋問の証言インデックスを操作します（次へ/前へなど）。',
    params: [
        { 
            key: 'direction', 
            type: 'select', // ドロップダウン選択式
            label: '方向', 
            defaultValue: 'next',
            options: ['next', 'prev'] // 選択肢
        },
        {
            key: 'to',
            type: 'number',
            label: 'インデックス指定',
            defaultValue: ''
        }
    ]
};