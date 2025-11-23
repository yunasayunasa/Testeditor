/**
 * [math_multiply] - 数値の乗算
 */
export default async function math_multiply(interpreter, params) {
    const a = parseFloat(params.a) || 0;
    const b = parseFloat(params.b) || 0;
    const result = a * b;
    
    const stateManager = interpreter.scene.registry.get('stateManager');
    if (stateManager && params.output) {
        stateManager.setF(params.output, result);
    }
    
    return result;
}

math_multiply.define = {
    description: '2つの数値を乗算します',
    params: [
        { key: 'a', type: 'number', label: '値A', defaultValue: 1 },
        { key: 'b', type: 'number', label: '値B', defaultValue: 1 },
        { key: 'output', type: 'text', label: '出力変数名', defaultValue: 'result' }
    ]
};
