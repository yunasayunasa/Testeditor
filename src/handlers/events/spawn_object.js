// /src/handlers/events/spawn_object.js の既存のコードを、以下のように修正・拡張します

/**
 * [spawn_object] タグハンドラ (強化版)
 * プレハブからオブジェクトをスポーンし、プロパティを上書きする
 * @param {ActionInterpreter} interpreter - アクションインタープリタのインスタンス
 * @param {object} params - タグのパラメータ
 */
export default function spawnObjectHandler(interpreter, params) {
    const prefabKey = params.prefab;
    if (!prefabKey) return;

    const scene = interpreter.scene;
    const prefabData = scene.cache.json.get(prefabKey);
    if (!prefabData) return;

    // --- 1. プレハブデータをコピーし、新しいレイアウトオブジェクトを作成 ---
    const newObjectLayout = { ...prefabData };

    // --- 2. スポーン位置を決定 ---
    let spawnX, spawnY;
    const at = params.at || 'self'; // デフォルトは 'self'
    
    if (at === 'pointer' && scene.input.activePointer) {
        spawnX = scene.input.activePointer.worldX;
        spawnY = scene.input.activePointer.worldY;
    } else {
        const sourceObject = interpreter.findTarget(at);
        if (sourceObject) {
            spawnX = sourceObject.x;
            spawnY = sourceObject.y;
        } else { // 'self' またはターゲットが見つからない場合
            spawnX = interpreter.gameObject.x;
            spawnY = interpreter.gameObject.y;
        }
    }
    newObjectLayout.x = spawnX;
    newObjectLayout.y = spawnY;

    // --- 3. ★★★ プロパティの上書き処理 ★★★ ---
    if (params.props) {
        try {
            // "{"x": 100, "physics": {"velocity": {"y": -500}}}" のような文字列をJSONとしてパース
            const overrideProps = JSON.parse(params.props);
            
            // lodashの deepMerge を使って、ネストされたプロパティも安全に上書き
            // (もしlodashを読み込んでいない場合は、Object.assign を使う)
            _.merge(newObjectLayout, overrideProps);

        } catch (e) {
            console.error(`[spawn_object] Failed to parse "props" parameter. Make sure it's valid JSON.`, e);
        }
    }

    // --- 4. 名前とレイヤーを設定 ---
    newObjectLayout.name = `${prefabKey}_${Phaser.Math.RND.uuid().substr(0,4)}`;
    newObjectLayout.layer = newObjectLayout.layer || interpreter.gameObject.getData('layer');
    
    // --- 5. オブジェクトを生成・配置 ---
    const newGameObject = scene.createObjectFromLayout(newObjectLayout);
    if (newGameObject) {
        scene.applyProperties(newGameObject, newObjectLayout);
    }
}