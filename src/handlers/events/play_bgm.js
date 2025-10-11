export default async function play_bgm(interpreter, params) {
    const key = params.key;
    if (!key) return;
    
    const soundManager = interpreter.scene.registry.get('soundManager');
    if (soundManager) {
        // ★ SoundManagerに、設定オブジェクトを渡す
        soundManager.playBgm(key, {
            loop: params.loop !== 'false'
        });
    }
}```
