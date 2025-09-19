// src/handlers/events/spawn_object.js

/**
 * [spawn_object] アクションタグ
 * プレハブから新しいオブジェクトをシーンに生成（スポーン）します。
 * @param {ActionInterpreter} interpreter
 * @param {object} params
 */
export default async function spawn_object(interpreter, params) {
    const prefabKey = params.prefab;
    if (!prefabKey) {
        console.warn('[spawn_object] "prefab" parameter is missing.');
        return;
    }

    const scene = interpreter.scene;
    const prefabData = scene.cache.json.get(prefabKey);
    if (!prefabData) {
        console.warn(`[spawn_object] Prefab data for key '${prefabKey}' not found.`);
        return;
    }

    const newObjectLayout = { ...prefabData };
    const sourceObject = interpreter.currentSource;

    let spawnX = sourceObject.x;
    let spawnY = sourceObject.y;
    const at = params.at || 'source';

    if (at === 'pointer' && scene.input.activePointer) {
        spawnX = scene.input.activePointer.worldX;
        spawnY = scene.input.activePointer.worldY;
    } else if (at.includes(',')) {
        const coords = at.split(',').map(Number);
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            spawnX = coords[0];
            spawnY = coords[1];
        }
    } else if (at !== 'source') {
        const atObject = interpreter.findTarget(at, sourceObject, interpreter.currentTarget);
        if (atObject) {
            spawnX = atObject.x;
            spawnY = atObject.y;
        }
    }
    
    newObjectLayout.x = Math.round(spawnX);
    newObjectLayout.y = Math.round(spawnY);
    newObjectLayout.name = `${prefabKey}_${Date.now()}`;
    newObjectLayout.layer = newObjectLayout.layer || sourceObject.getData('layer');
    
    const newGameObject = scene.createObjectFromLayout(newObjectLayout);
    if (newGameObject) {
        scene.applyProperties(newGameObject, newObjectLayout);
    }
}

/**
 * ★ VSLエディタ用の自己定義 ★
 */
spawn_object.define = {
    description: 'プレハブから新しいオブジェクトを生成します。',
    params: [
        { 
            key: 'prefab', 
            // ▼▼▼【ここを、このように拡張します】▼▼▼
            type: 'asset_key',
            assetType: 'prefab', // ★ どのアセットタイプかを追加
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
            label: 'プレハブ名', 
            defaultValue: '' 
        },
        { key: 'at', type: 'string', label: '生成位置', defaultValue: 'source' }
    ]
};