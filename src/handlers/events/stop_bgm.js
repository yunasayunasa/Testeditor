// /src/handlers/events/stop_bgm.js
/**
 * [stop_bgm] タグハンドラ
 */
export default function stopBgmHandler(interpreter, params, target) {
    const time = parseInt(params.time, 10) || 0; // フェードアウト時間
    
    const soundManager = interpreter.scene.registry.get('soundManager');
    if (soundManager) {
        soundManager.stopBgm(time);
    }
}