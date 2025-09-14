// /src/handlers/events/camera_shake.js

/**
 * [camera_shake] タグハンドラ
 * カメラを揺らす
 * @param {ActionInterpreter} interpreter - アクションインタープリタのインスタンス
 * @param {object} params - タグのパラメータ
 * @returns {Promise<void>}
 */
export default async function cameraShakeHandler(interpreter, params) {
    const time = parseInt(params.time, 10) || 500; // デフォルト500ms
    const power = parseFloat(params.power) || 0.01; // デフォルトは弱い揺れ

    const camera = interpreter.scene.cameras.main;

    return new Promise(resolve => {
        // Phaserのカメラシェイク機能を利用
        camera.shake(time, power, false, (cam, progress) => {
            // シェイクが完了したら（progressが1になったら）、Promiseを解決する
            if (progress === 1) {
                resolve();
            }
        });
    });
}