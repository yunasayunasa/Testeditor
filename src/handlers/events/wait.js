// /src/handlers/events/wait.js

/**
 * [wait] タグハンドラ
 * アクションの実行を指定時間待機させる
 * @param {ActionInterpreter} interpreter - アクションインタープリタのインスタンス
 * @param {object} params - タグのパラメータ
 * @returns {Promise<void>}
 */
export default function waitHandler(interpreter, params, target) {
    const time = parseInt(params.time, 10);

    // timeが有効な数値でなければ、即座に終了
    if (isNaN(time) || time <= 0) {
        console.warn('[wait] Invalid or missing "time" parameter. Skipping wait.');
        return Promise.resolve();
    }

    // Promiseを使って、指定時間後に解決（resolve）される非同期処理を作成
    return new Promise(resolve => {
        // 現在のシーンのTime Managerを使って、タイマーを設定
        interpreter.scene.time.delayedCall(time, () => {
            // 指定時間が経過したら、Promiseを解決して次のアクションへ進む
            resolve();
        });
    });
}