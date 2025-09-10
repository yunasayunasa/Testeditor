// src/actions/play_sound.js

export default async function play_sound(interpreter, target, params) {
    // 1. 必須パラメータ 'key' が存在するかチェック
    const soundKey = params.key;
    if (!soundKey) {
        console.warn('[play_sound] Missing required parameter: "key".');
        return;
    }

    // 2. InterpreterからSceneインスタンスを取得し、
    //    そこからSoundManagerのインスタンスを取得する
    const soundManager = interpreter.scene.registry.get('soundManager');
    if (!soundManager) {
        console.error('[play_sound] SoundManager not found in scene registry.');
        return;
    }

    // 3. パラメータからオプションを読み取る (ボリューム、ループなど)
    const config = {
        // 'volume'パラメータがあれば数値に変換、なければデフォルト(1)
        volume: params.volume ? parseFloat(params.volume) : 1,
        // 'loop'パラメータが'true'ならtrue、それ以外はfalse
        loop: params.loop === 'true'
    };

    // 4. SoundManagerに効果音の再生を依頼する
    soundManager.playSfx(soundKey, config);
    console.log(`[play_sound] Playing sound effect: '${soundKey}'`);
    
    // このアクションは再生を指示したら即座に完了する (音の再生終了は待たない)
}