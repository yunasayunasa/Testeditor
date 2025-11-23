/**
 * [math_random] - ランダムな数値を生成
 */
export default async function math_random(interpreter, params) {
    const min = parseFloat(params.min) || 0;
    const max = parseFloat(params.max) || 1;
    const result = Math.random() * (max - min) + min;
    
    const stateManager = interpreter.scene.registry.get('stateManager');
    if (stateManager && params.output) {
        stateManager.setF(params.output, result);
    }
    
    return result;
}

math_random.define = {
    description: 'ランダムな数値を生成します',
    params: [
        { key: 'min', type: 'number', label: '最小値', defaultValue: 0 },
        { key: 'max', type: 'number', label: '最大値', defaultValue: 1 },
        { key: 'output', type: 'text', label: '出力変数名', defaultValue: 'random_val' }
    ]
};
