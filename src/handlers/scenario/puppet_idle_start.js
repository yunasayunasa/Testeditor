/**
 * [puppet_idle_start] タグ - 人形劇風の待機アニメーション開始
 * 
 * キャラクターをその場で生命感を持ってゆらゆら揺らし始めます。
 * このタグは完了を待ちません。
 * 
 * @param {ScenarioManager} manager - ScenarioManagerのインスタンス
 * @param {object} params - タグのパラメータ
 */
export default async function handlePuppetIdleStart(manager, params) {
    const { name, amount = 2, speed = 400, y_amount = 5, randomness = 150, pivot = 'bottom' } = params;
    const scene = manager.scene;

    if (!name) { console.warn('[puppet_idle_start] name属性は必須です。'); return; }
    const chara = scene.characters[name];
    if (!chara) { console.warn(`[puppet_idle_start] キャラクター[${name}]が見つかりません。`); return; }

    // 既存のidleアニメーションがあれば停止
    handlePuppetIdleStop(manager, { name });

    // --- パラメータの数値化 ---
    const swayAmount = Number(amount);
    const swaySpeed = Number(speed);
    const yAmount = Number(y_amount);
    const randomDelay = Number(randomness);

    // --- 座標補正 ---
    let startY = chara.y;
    if (pivot === 'bottom') {
        if (chara.originY !== 1.0) startY = chara.y + (chara.displayHeight / 2);
        chara.setOrigin(0.5, 1.0);
    } else {
        if (chara.originY !== 0.5) startY = chara.y - (chara.displayHeight / 2);
        chara.setOrigin(0.5, 0.5);
    }
    chara.y = startY;

    // --- Tweenの作成 ---
    const angleTween = scene.tweens.add({
        targets: chara, angle: { from: -swayAmount, to: swayAmount },
        duration: swaySpeed, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        onRepeat: (tween) => tween.updateTo('duration', swaySpeed + Phaser.Math.Between(-randomDelay, randomDelay), true)
    });

    const yTween = scene.tweens.add({
        targets: chara, y: startY + yAmount,
        duration: swaySpeed * 1.5, ease: 'Sine.easeInOut', yoyo: true, repeat: -1,
        onRepeat: (tween) => tween.updateTo('duration', (swaySpeed * 1.5) + Phaser.Math.Between(-randomDelay, randomDelay), true)
    });

    // 停止用にTweenの参照をキャラクターに保存
    chara.setData('puppetIdleTweens', [angleTween, yTween]);
}