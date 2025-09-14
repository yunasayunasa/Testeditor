// /src/handlers/events/spawn_object.js (完全版)

/**
 * [spawn_object] タグハンドラ (強化版)
 * プレハブからオブジェクトをスポーンし、プロパティを上書きする。
 * スポーン位置の指定方法を拡張。
 * @param {ActionInterpreter} interpreter - アクションインタープリタのインスタンス
 * @param {object} params - タグのパラメータ
 */
export default function spawnObjectHandler(interpreter, params) {
    const prefabKey = params.prefab;
    if (!prefabKey) {
        console.warn('[spawn_object] "prefab" parameter is missing.');
        return;
    }

    const scene = interpreter.scene;
    if (!scene) {
        console.error('[spawn_object] Could not get scene from interpreter.');
        return;
    }

    const prefabData = scene.cache.json.get(prefabKey);
    if (!prefabData) {
        console.warn(`[spawn_object] Prefab data for key '${prefabKey}' not found.`);
        return;
    }

    // --- 1. プレハブデータをコピーし、新しいレイアウトオブジェクトを作成 ---
    const newObjectLayout = { ...prefabData };

    // --- 2. スポーン位置を決定 ---
    let spawnX, spawnY;
    const at = params.at || 'self'; // デフォルトは 'self'
    
    if (at === 'pointer' && scene.input.activePointer) {
        // --- ケース1: ポインター位置 ---
        spawnX = scene.input.activePointer.worldX;
        spawnY = scene.input.activePointer.worldY;
        console.log(`[spawn_object] Spawning at pointer: (${spawnX}, ${spawnY})`);

    } else if (at === 'center') {
        // --- ケース2: カメラ中央 ---
        spawnX = scene.cameras.main.scrollX + scene.cameras.main.width / 2;
        spawnY = scene.cameras.main.scrollY + scene.cameras.main.height / 2;
        console.log(`[spawn_object] Spawning at camera center: (${spawnX}, ${spawnY})`);

    } else if (at.includes(',')) {
        // --- ケース3: 座標直接指定 ---
        const coords = at.split(',').map(Number);
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            spawnX = coords[0];
            spawnY = coords[1];
            console.log(`[spawn_object] Spawning at specified coordinates: (${spawnX}, ${spawnY})`);
        }
    } else {
        // --- ケース4: オブジェクト追従（既存のロジック） ---
        const sourceObject = interpreter.findTarget(at);
        if (sourceObject) {
            spawnX = sourceObject.x;
            spawnY = sourceObject.y;
        } else {
            console.warn(`[spawn_object] Target object '${at}' for 'at' parameter not found. Defaulting to self.`);
            spawnX = interpreter.gameObject.x;
            spawnY = interpreter.gameObject.y;
        }
    }
    
    // スポーン位置が決定できなかった場合は、念のためフォールバック
    if (spawnX === undefined || spawnY === undefined) {
        console.warn(`[spawn_object] Could not determine spawn position. Defaulting to self.`);
        spawnX = interpreter.gameObject.x;
        spawnY = interpreter.gameObject.y;
    }
    
    newObjectLayout.x = Math.round(spawnX);
    newObjectLayout.y = Math.round(spawnY);

    // --- 3. プロパティの上書き処理 ---
    if (params.props) {
        try {
            const overrideProps = JSON.parse(params.props);
            
            // lodashの _.merge を使って、ネストされたプロパティも安全に上書き
            // (lodashがプロジェクトにないと仮定し、簡易的なマージを実装)
            Object.assign(newObjectLayout, overrideProps);
            if (overrideProps.physics && prefabData.physics) {
                newObjectLayout.physics = { ...prefabData.physics, ...overrideProps.physics };
            }

        } catch (e) {
            console.error(`[spawn_object] Failed to parse "props" parameter. Make sure it's valid JSON: ${params.props}`, e);
        }
    }

    // --- 4. 名前とレイヤーを設定 ---
    // プレハブにnameがあればそれを使い、なければキーを元に生成
    newObjectLayout.name = newObjectLayout.name || `${prefabKey}_${Phaser.Math.RND.uuid().substr(0,4)}`;
    // レイヤーが指定されていなければ、スポーン元のオブジェクトのレイヤーを引き継ぐ
    newObjectLayout.layer = newObjectLayout.layer || interpreter.gameObject.getData('layer');
    
    // --- 5. オブジェクトを生成・配置 ---
    if (typeof scene.createObjectFromLayout === 'function' && typeof scene.applyProperties === 'function') {
        const newGameObject = scene.createObjectFromLayout(newObjectLayout);
        if (newGameObject) {
            scene.applyProperties(newGameObject, newObjectLayout);
        }
    } else {
        console.error(`[spawn_object] Target scene does not support createObjectFromLayout and/or applyProperties.`);
    }
}