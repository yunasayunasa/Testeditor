/**
 * [live_breath_stop] タグ - 呼吸アニメーション停止
 * 
 * [live_breath_start]で開始した呼吸アニメーションを停止します。
 * 
 * @param {ScenarioManager} manager - ScenarioManagerのインスタンス
 * @param {object} params - タグのパラメータ
 */
export default async function handleLiveBreathStop(manager, params) {
    const { name } = params;
    const scene = manager.scene;

    if (!name) { console.warn('[live_breath_stop] name属性は必須です。'); return; }
    const chara = scene.characters[name];
    if (!chara) { console.warn(`[live_breath_stop] キャラクター[${name}]が見つかりません。`); return; }

    // Tweenを停止
    const breathTween = chara.getData('liveBreathTween');
    if (breathTween) {
        breathTween.stop();
        chara.removeData('liveBreathTween');
    }

    // 保存しておいた情報を使って、状態を完全に元に戻す
    const breathInfo = chara.getData('breathInfo');
    if (breathInfo) {
        chara.setScale(chara.scaleX, breathInfo.originalScale);
        chara.setOrigin(0.5, breathInfo.originalOriginY);
        chara.y -= breathInfo.yOffset;
        chara.removeData('breathInfo');
    }
}