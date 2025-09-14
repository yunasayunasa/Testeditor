// /src/handlers/events/stop_sound.js

/**
 * [stop_sound] タグハンドラ
 * @param {ActionInterpreter} interpreter
 * @param {object} params
 */
export default function stopSoundHandler(interpreter, params) {
    const key = params.key;
    if (!key) return;

    const soundManager = interpreter.scene.registry.get('soundManager');
    if (soundManager) {
        soundManager.stopSe(key);
    }
}