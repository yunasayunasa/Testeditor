// src/actions/spawn_object.js

export default async function spawn_object(interpreter, target, params) {
    const scene = interpreter.scene;

    // 1. 必須パラメータ 'prefab' を取得
    const prefabKey = params.prefab;
    if (!prefabKey) {
        console.warn('[spawn_object] Missing required parameter: "prefab".');
        return;
    }
    
    // 2. プレハブのJSONデータがキャッシュに存在するか確認
    // ★重要: PreloadSceneで、'assets/data/prefabs/'フォルダをまとめて読み込んでおく必要があります
    const prefabData = scene.cache.json.get(prefabKey);
    if (!prefabData) {
        console.error(`[spawn_object] Prefab data for key '${prefabKey}' not found in cache.`);
        return;
    }

    // 3. スポーン位置を計算
    // デフォルトは、タグを実行したオブジェクト(target)の位置
    let spawnX = target.x;
    let spawnY = target.y;

    // オフセットが指定されていれば加算
    if (params.offsetX) spawnX += parseFloat(params.offsetX);
    if (params.offsetY) spawnY += parseFloat(params.offsetY);
    
    // 4. 新しいオブジェクトのレイアウトデータを構築
    // プレハブデータをコピーし、スポーン位置と名前で上書き
    const newObjectLayout = { ...prefabData };
    newObjectLayout.x = Math.round(spawnX);
    newObjectLayout.y = Math.round(spawnY);
    
    // パラメータで 'name' が指定されていれば、一意な名前を付ける
    // 指定がなければ、プレハブ名 + タイムスタンプで自動生成
    newObjectLayout.name = params.name || `${prefabKey}_${Date.now()}`;

    console.log(`[spawn_object] Spawning '${newObjectLayout.name}' from prefab '${prefabKey}' at (${newObjectLayout.x}, ${newObjectLayout.y})`);

    // 5. BaseGameSceneのメソッドを借りて、オブジェクトを生成・設定
    if (typeof scene.createObjectFromLayout === 'function' && typeof scene.applyProperties === 'function') {
        const newGameObject = scene.createObjectFromLayout(newObjectLayout);
        scene.applyProperties(newGameObject, newObjectLayout);
    } else {
        console.error(`[spawn_object] Target scene '${scene.scene.key}' does not support object creation.`);
    }
}