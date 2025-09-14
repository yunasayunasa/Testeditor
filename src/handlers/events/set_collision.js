// /src/handlers/events/set_collision.js

/**
 * [set_collision] タグハンドラ
 * @param {ActionInterpreter} interpreter - アクションインタープリタのインスタンス
 * @param {object} params - タグのパラメータ
 * @param {Phaser.GameObjects.GameObject} targetObject - 適用対象のオブジェクト
 */
export default function setCollisionHandler(interpreter, params, targetObject) {
    // ターゲットは既に解決済みなので、ここで探す必要はない
    if (!targetObject || !targetObject.body) return;
    
    // --- 物理定義を取得 ---
    const physicsDefine = interpreter.scene.registry.get('physics_define');
    if (!physicsDefine || !physicsDefine.categories) return;
    const categories = physicsDefine.categories;

    // --- カテゴリの設定 ---
    if (params.category) {
        const categoryName = params.category;
        if (categories[categoryName]) {
            targetObject.setCollisionCategory(categories[categoryName]);
        }
    }

    // --- マスクの設定 ---
    if (params.mask) {
        let newMask = 0;
        // "enemy,wall" のようなカンマ区切りの文字列を配列に変換
        const maskNames = params.mask.split(',').map(s => s.trim());
        
        maskNames.forEach(name => {
            if (categories[name]) {
                newMask |= categories[name];
            }
        });
        
        targetObject.setCollidesWith(newMask);
    }
}