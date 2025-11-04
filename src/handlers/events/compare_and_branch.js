export default async function compare_and_branch(interpreter, params) {
    const stateManager = interpreter.scene.registry.get('stateManager');
    if (!stateManager) return 'output_false';

    const var1Path = params.var1;
    const var2Path = params.var2;
    if (!var1Path || !var2Path) return 'output_false';

    const value1 = stateManager.getValue(var1Path);
    const value2 = stateManager.getValue(var2Path);

    if (value1 === value2) {
        return 'output_true'; // 一致した場合
    } else {
        return 'output_false'; // 不一致の場合
    }
}

compare_and_branch.define = {
    description: '2つのゲーム変数の値を比較し、結果に応じて分岐します。',
    params: [
        { key: 'var1', type: 'string', label: '比較する変数1', required: true },
        { key: 'var2', type: 'string', label: '比較する変数2', required: true }
    ],
    // ★ ActionInterpreterに、このタグが分岐することを示す
    pins: {
        outputs: [
            { name: 'output_true', label: '一致' },
            { name: 'output_false', label: '不一致' }
        ]
    }
};