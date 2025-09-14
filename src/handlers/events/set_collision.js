// /src/handlers/events/set_collision.js

/**
 * [set_collision] タグハンドラ
 * オブジェクトの衝突カテゴリとマスクを動的に設定する
 * @param {ActionInterpreter} interpreter - アクションインタープリタのインスタンス
 * @param {object} params - タグのパラメータ
 */
export default function setCollisionHandler(interpreter, params) {
    const targetId = params.target;
    if (!targetId) {
        console.warn('[set_collision] "target" parameter is missing.');
        return;
    }

    const targetObject = interpreter.findTarget(targetId);
    if (!targetObject || !targetObject.body) {
        console.warn(`[set_collision] Target object '${targetId}' not found or has no physics body.`);
        return;
    }

    // --- カテゴリの設定 ---
    if (params.category !== undefined) {
        // 文字列で "0b0010" のように指定された2進数リテラルを、数値に変換
        const category = parseInt(params.category, 2);
        if (!isNaN(category)) {
            targetObject.setCollisionCategory(category);
            console.log(`[set_collision] Set category of '${targetId}' to ${params.category} (${category})`);
        }
    }

    // --- マスクの設定 ---
    if (params.mask !== undefined) {
        const mask = parseInt(params.mask, 2);
        if (!isNaN(mask)) {
            // setCollidesWith は、衝突するカテゴリの「ビットマスク」を受け取る
            targetObject.setCollidesWith(mask);
            console.log(`[set_collision] Set collision mask of '${targetId}' to ${params.mask} (${mask})`);
        }
    }
}