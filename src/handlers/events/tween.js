// src/handlers/events/tween.js (最終確定・完成版)

/**
 * [tween] タグの処理
 * 対象オブジェクトのプロパティを、滑らかに変化させる
 * @param {ActionInterpreter} interpreter - 呼び出し元のインタープリタ
 * @param {Phaser.GameObjects.GameObject} target - アクションの対象となるオブジェクト
 * @param {object} params - タグからパースされたパラメータ
 * @returns {Promise<void>} アニメーション完了時に解決されるPromise
 */
export function handleTween(interpreter, target, params) {
    // このアクションは時間がかかるので、必ずPromiseを返す
    return new Promise(resolve => {
        
        // --- 1. 必須パラメータのチェック ---
        if (!params.property || params.to === undefined) {
            console.warn('[tween] "property" and "to" parameters are required.');
            resolve(); // エラーでも、処理を止めずに次に進む
            return;
        }

        const property = params.property;
        let targetValue = params.to;

        // --- 2. 目標値 (to) の解析 ---
        // 相対値 ("+=100" や "-=50") に対応
        if (typeof targetValue === 'string') {
            if (targetValue.startsWith('+=')) {
                targetValue = target[property] + parseFloat(targetValue.substring(2));
            } else if (targetValue.startsWith('-=')) {
                targetValue = target[property] - parseFloat(targetValue.substring(2));
            } else {
                targetValue = parseFloat(targetValue);
            }
        }
        
        // --- 3. 便利なショートカット "scale" に対応 ---
        if (property === 'scale') {
            // scaleX と scaleY を同じ値に設定する
            target.scene.tweens.add({
                targets: target,
                scaleX: targetValue,
                scaleY: targetValue,
                duration: parseInt(params.time) || 1000,
                ease: params.ease || 'Linear',
                yoyo: params.yoyo === 'true',
                onComplete: () => resolve()
            });
            return; // scaleの場合は、ここで処理を終了
        }

        // --- 4. PhaserのTween設定オブジェクトを構築 ---
        const tweenConfig = {
            targets: target,
            duration: parseInt(params.time) || 1000,
            ease: params.ease || 'Linear',
            yoyo: params.yoyo === 'true',
            onComplete: () => {
                // アニメーションが終わったら、Promiseを解決して次のタグへ
                resolve();
            }
        };
        
        // 変化させたいプロパティと、その目標値を設定
        tweenConfig[property] = targetValue;
        
        // --- 5. Tweenを実行 ---
        interpreter.scene.tweens.add(tweenConfig);
    });
}
/*[tween] タグ・リファレンス (設計仕様書)
目的:
[tween]タグは、オブジェクトの単一のプロパティを、指定された時間で、指定された値へと滑らかに変化させるための、基本的なトゥイーンアニメーション命令である。

基本構文:
[tween property="プロパティ名" to="目標値" time="時間(ms)" ease="イージング" yoyo="true/false"]

1. property (プロパティ名) - 必須
説明: 変化させたいオブジェクトのプロパティ名を指定します。
指定可能な値 (代表例):
位置:
x: X座標
y: Y座標
拡縮:
scaleX: 横方向の拡大率
scaleY: 縦方向の拡大率
scale: XとYを同時に同じ値に変化させる（便利なショートカット）
回転:
angle: 角度（0〜360）
透明度:
alpha: 透明度（0.0で完全透明、1.0で完全不透明）
使用例:
[tween property=alpha to=0 time=1000] (1秒かけてフェードアウト)
2. to (目標値) - 必須
説明: プロパティを、最終的にどの値にしたいかを指定します。
相対値のサポート:
to="+100": 現在の値に100を加算した値を目指す。
to="-50": 現在の値から50を減算した値を目指す。
使用例:
[tween property=x to="+200" time=500] (0.5秒かけて、現在位置から右に200ピクセル移動)
3. time (時間) - オプション
説明: アニメーションにかける時間をミリ秒で指定します。
デフォルト値: 1000 (1秒)
使用例:
[tween property=scale to=1.5 time=300] (0.3秒かけて1.5倍に拡大)
4. ease (イージング) - オプション
説明: アニメーションの変化の緩急を指定します。これにより、動きに感情や物理法則らしさを与えることができます。
デフォルト値: Linear (等速直線運動)
指定可能な値 (代表的なもの):
Linear: 一定の速度。
Power1, Power2, Power3, Power4: 加速/減速カーブ。数字が大きいほど急激。
Bounce: 跳ねるような動き。
Elastic: ゴムのような、弾性のある動き。
Back: 少し行き過ぎてから戻る動き。
Sine.easeIn: ゆっくり始まって加速。
Sine.easeOut: ゆっくり終わるように減速。
Sine.easeInOut: ゆっくり始まって、ゆっくり終わる。
使用例:
[tween property=y to=600 time=1000 ease=Bounce.easeOut] (1秒かけて、跳ねながら地面に着地)
5. yoyo - オプション
説明: アニメーションが終点に達した後、始点に向かって逆再生するかどうかを指定します。
指定可能な値: true または false
デフォルト値: false
使用例:
[tween property=alpha to=0.5 time=500 yoyo=true] (0.5秒かけて半透明になり、0.5秒かけて元に戻る、心臓の鼓動のような点滅)*/
