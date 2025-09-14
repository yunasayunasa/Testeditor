// /src/handlers/events/camera_follow.js

/**
 * [camera_follow] タグハンドラ
 * カメラの追従ターゲットを設定する
 * @param {ActionInterpreter} interpreter - アクションインタープリタのインスタンス
 * @param {object} params - タグのパラメータ
 */
export default function cameraFollowHandler(interpreter, params) {
    const targetId = params.target;
    if (!targetId) {
        console.warn('[camera_follow] "target" parameter is missing.');
        return;
    }

    const scene = interpreter.scene;
    const camera = scene.cameras.main;
    
    if (targetId.toLowerCase() === 'none') {
        // ターゲットの追従を解除
        camera.stopFollow();
    } else {
        // 指定された名前のオブジェクトを探す
        const targetObject = scene.children.list.find(obj => obj.name === targetId);

        if (targetObject) {
            camera.startFollow(targetObject, true, 0.05, 0.05); // Lerpで滑らかに追従
        } else {
            console.warn(`[camera_follow] Target object '${targetId}' not found.`);
        }
    }
}