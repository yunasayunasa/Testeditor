export default async function set_variable(interpreter, params) {
    const stateManager = interpreter.scene.registry.get('stateManager');
    if (!stateManager) return;

    const varPath = params.var;
    // valueは文字列として渡されるので、そのまま使う
    const value = params.value;

    if (varPath && value !== undefined) {
        // "f.score = 10" のような式ではなく、
        // "f.score" と "10" を直接渡す
        stateManager.setValueByPath(varPath, value);
    }
}

set_variable.define = {
    description: '指定されたゲーム変数に、指定された値を直接セットします。',
    params: [
        { key: 'var', type: 'string', label: '変数名', required: true },
        { key: 'value', type: 'string', label: 'セットする値', required: true }
    ]
};