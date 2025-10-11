// src/handlers/scenario/handlePlayBgm.js (修正後)

export default async function handlePlayBgm(manager, params) {
    const storage = params.storage;
    if (!storage) return;

    // ★ SoundManagerに、設定オブジェクトを渡す
    manager.soundManager.playBgm(storage, {
        fade: Number(params.time) || 0
    });
    // ★ awaitは不要！
}