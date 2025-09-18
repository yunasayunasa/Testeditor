// src/handlers/events/time_stop.js

/**
 * [time_stop] アクションタグ
 * ゲーム全体の時間を停止します（タイムスケールを0にする）。
 * @param {ActionInterpreter} interpreter
 */
export default async function time_stop(interpreter) {
    const systemScene = interpreter.scene.scene.get('SystemScene');
    if (systemScene) {
        // ★ delayedCallは、特定の状況でのバグ回避策。通常は直接設定でOK。
        //    よりシンプルで直接的なコードにします。
        systemScene.isTimeStopped = true;
    }
}

/**
 * ★ VSLエディタ用の自己定義 ★
 */
time_stop.define = {
    description: 'ゲーム内世界の時間（物理演算など）を停止させます。UIアニメーションなどは影響を受けません。',
    params: []
};