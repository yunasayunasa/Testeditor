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
}


/**
 * ★ VSLエディタ用の自己定義 ★
 */
play_bgm.define = {
    description: 'BGM（背景音楽）を再生します。すでに別のBGMが再生中の場合は、クロスフェードして切り替わります。',
    params: [
        { key: 'key', type: 'asset_key', assetType: 'audio',label: 'BGMアセット名', defaultValue: '' },
        { key: 'loop', type: 'select', options: ['true', 'false'], label: 'ループ再生', defaultValue: true }
    ]
};