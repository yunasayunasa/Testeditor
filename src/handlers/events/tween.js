// src/handlers/events/tween.js

// [tween property=x to=500 time=1000 ease=Power2 yoyo=true]
export function handleTween(interpreter, target, params) {
    // このアクションは時間がかかるので、Promiseを返す
    return new Promise(resolve => {
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
        // propertyで指定されたプロパティを、toの値に変化させる
        tweenConfig[params.property] = parseFloat(params.to);
        
        interpreter.scene.tweens.add(tweenConfig);
    });
}