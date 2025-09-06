/**
 * [stop_anim] タグ - アニメーションの停止
 * 
 * 指定されたnameを持つオブジェクト（キャラクターなど）に適用されている
 * 全てのTweenアニメーションを停止・破棄します。
 * [chara_jump loop=true]などで開始した無限ループを止めるのに使用します。
 * 
 * @param {ScenarioManager} manager - ScenarioManagerのインスタンス
 * @param {object} params - タグのパラメータ
 * @param {string} params.name - 対象オブジェクトの管理名 (必須)
 */
export default async function handleStopAnim(manager, params) {
    const { name } = params;
    const scene = manager.scene;

    if (!name) {
        console.warn('[stop_anim] name属性は必須です。');
        return;
    }
    
    // キャラクターリストからまず探す
    let target = scene.characters[name];
    
    // もしキャラクターリストに見つからなければ、他のレイヤーも探す (より汎用的に)
    if (!target) {
        for (const layerKey in manager.layers) {
            const layer = manager.layers[layerKey];
            // find()を使って、指定されたnameを持つオブジェクトを探す
            target = layer.list.find(obj => obj.name === name);
            if (target) break; // 見つかったらループを抜ける
        }
    }
    
    if (!target) {
        console.warn(`[stop_anim] 停止対象のオブジェクト[${name}]が見つかりません。`);
        return;
    }

    // 指定されたターゲットに紐づくTweenをすべて停止・削除する
    scene.tweens.killTweensOf(target);
    console.log(`[stop_anim] オブジェクト[${name}]のアニメーションを停止しました。`);

    // このタグは同期的（待つべき処理がない）なので、これだけで完了です。
}