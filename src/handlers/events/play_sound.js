// src/actions/play_sound.js

export default async function play_sound(interpreter, params, target) {
    const soundKey = params.key;
    if (!soundKey) {
        console.warn('[play_sound] Missing required parameter: "key".');
        return;
    }

    const soundManager = interpreter.scene.registry.get('soundManager');
    if (!soundManager) {
        console.error('[play_sound] SoundManager not found in scene registry.');
        return;
    }

    const config = {
        volume: params.volume ? parseFloat(params.volume) : undefined, // ★ volumeはplaySe側でデフォルト処理するのでundefinedが良い
        loop: params.loop === 'true'
    };

    // ▼▼▼【ここが修正箇所です】▼▼▼
    // soundManager.playSfx  ->  soundManager.playSe
    soundManager.playSe(soundKey, config);
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    console.log(`[play_sound] Playing sound effect: '${soundKey}'`);
}