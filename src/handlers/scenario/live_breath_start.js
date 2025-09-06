/**
 * [live_breath_start] タグ - 呼吸アニメーション開始
 * 
 * キャラクターがゆっくりと呼吸しているかのように、
 * 上下（Yスケール）に伸縮するアニメーションを開始します。
 * このタグは完了を待ちません。
 * 
 * @param {ScenarioManager} manager - ScenarioManagerのインスタンス
 * @param {object} params - タグのパラメータ
 */
export default async function handleLiveBreathStart(manager, params) {
    const { name, speed = 4000, amount = 0.015 } = params;
    const scene = manager.scene;

    if (!name) { console.warn('[live_breath_start] name属性は必須です。'); return; }
    const chara = scene.characters[name];
    if (!chara) { console.warn(`[live_breath_start] キャラクター[${name}]が見つかりません。`); return; }

    // 既存の呼吸アニメーションがあれば、まず停止させる
    handleLiveBreathStop(manager, { name });

    // --- パラメータの数値化 ---
    const duration = Number(speed) / 2;
    const scaleAmount = 1 + Number(amount);
    
    // --- 原点変更と座標補正 ---
    const oldOriginY = chara.originY;
    const newOriginY = 0.7; // 呼吸の支点（少し下）
    chara.setOrigin(0.5, newOriginY);
    
    // 原点変更によるY座標のズレを計算して補正
    const yOffset = chara.displayHeight * (newOriginY - oldOriginY);
    chara.y += yOffset;

    // stop時に使う情報をキャラクターに保存
    chara.setData('breathInfo', {
        yOffset: yOffset,
        originalScale: chara.scaleY,
        originalOriginY: oldOriginY
    });

    // --- Tweenの作成 ---
    const breathTween = scene.tweens.add({
        targets: chara,
        scaleY: chara.scaleY * scaleAmount, // 現在のスケールを基準に伸縮
        duration: duration,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
    });

    // 停止用にTweenの参照をキャラクターに保存
    chara.setData('liveBreathTween', breathTween);
}