// /src/handlers/events/camera_fade.js

/**
 * [camera_fade] タグハンドラ
 * カメラをフェードインまたはフェードアウトさせる
 * @param {ActionInterpreter} interpreter - アクションインタープリタのインスタンス
 * @param {object} params - タグのパラメータ
 * @returns {Promise<void>}
 */
export default function cameraFadeHandler(interpreter, params) {
    const time = parseInt(params.time, 10) || 1000; // デフォルト1秒
    const type = params.type || 'out'; // 'in' or 'out'
    
    // 16進数カラーコードを数値に変換
    const colorStr = params.color || '0x000000'; // デフォルトは黒
    const color = parseInt(colorStr, 16);

    const camera = interpreter.scene.cameras.main;

    return new Promise(resolve => {
        const onComplete = () => {
            resolve();
        };

        if (type === 'in') {
            camera.fadeIn(time, color, onComplete);
        } else { // 'out'
            camera.fadeOut(time, color, onComplete);
        }
    });
}