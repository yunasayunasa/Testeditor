/**
 * [math_add] - 数値の加算
 * 2つの値を加算して結果を変数に保存します
 */
export default async function math_add(interpreter, params) {
    const a = parseFloat(params.a) || 0;
    const b = parseFloat(params.b) || 0;
    const result = a + b;
    
    const stateManager = interpreter.scene.registry.get('stateManager');
    if (stateManager && params.output) {
        stateManager.setF(params.output, result);
    }
    
    return result;
}

math_add.define = {
    description: '2つの数値を加算します',
    params: [
        { key: 'a', type: 'number', label: '値A', defaultValue: 0 },
        { key: 'b', type: 'number', label: '値B', defaultValue: 0 },
        { key: 'output', type: 'text', label: '出力変数名', defaultValue: 'result' }
    ]
};
