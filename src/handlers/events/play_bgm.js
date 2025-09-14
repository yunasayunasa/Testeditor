// /src/handlers/events/play_bgm.js
/**
 * [play_bgm] タグハンドラ
 */
export default function playBgmHandler(interpreter, params, target) {
    const key = params.key;
    if (!key) return;
    
    const loop = params.loop !== 'false'; // デフォルトはtrue
    
    const soundManager = interpreter.scene.registry.get('soundManager');
    if (soundManager) {
        soundManager.playBgm(key, loop);
    }
}