export default async function get_testimony_data(interpreter, params) {
    const stateManager = interpreter.scene.registry.get('stateManager');
    const scene = interpreter.scene;
    if (!stateManager || !scene) return;

    const keyToGet = params.key;
    const varToSet = params.var;
    if (!keyToGet || !varToSet) return;

    const testimonyId = stateManager.getValue('f.current_testimony_id');
    const statementIndex = stateManager.getValue('f.current_statement_index');

    const testimonyData = scene.cache.json.get(testimonyId);
    const statement = testimonyData?.statements?.[statementIndex];
    
    const value = statement ? statement[keyToGet] : undefined;

    stateManager.setValueByPath(varToSet, value);
}

get_testimony_data.define = {
    description: '現在の証言データから指定したキーの値を取得し、ゲーム変数に保存します。',
    params: [
        { key: 'key', type: 'string', label: '取得するキー', required: true },
        { key: 'var', type: 'string', label: '保存先の変数', required: true }
    ]
};