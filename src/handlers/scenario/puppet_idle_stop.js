/**
 * [puppet_idle_stop] タグ - 人形劇風の待機アニメーション停止
 * 
 * [puppet_idle_start]で開始した揺れを停止します。
 * 
 * @param {ScenarioManager} manager - ScenarioManagerのインスタンス
 * @param {object} params - タグのパラメータ
 */
export default async function handlePuppetIdleStop(manager, params) {
    const { name } = params;
    const scene = manager.scene;

    if (!name) { console.warn('[puppet_idle_stop] name属性は必須です。'); return; }
    const chara = scene.characters[name];
    if (!chara) { console.warn(`[puppet_idle_stop] キャラクター[${name}]が見つかりません。`); return; }

    const tweens = chara.getData('puppetIdleTweens');
    if (tweens && Array.isArray(tweens)) {
        tweens.forEach(tween => tween.stop());
        chara.removeData('puppetIdleTweens');
    }

    // 姿勢と原点をリセット
    const finalY = chara.originY === 1.0 ? chara.y - (chara.displayHeight / 2) : chara.y;
    chara.setOrigin(0.5, 0.5);
    chara.setAngle(0);
    chara.setY(finalY);
}