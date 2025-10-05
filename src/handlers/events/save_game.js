// src/handlers/events/save_game.js

export default async function save_game(interpreter, params) {
    const stateManager = interpreter.scene.registry.get('stateManager');
    const slot = params.slot || 'checkpoint'; // デフォルトは'checkpoint'スロット

    if (stateManager && typeof stateManager.createSaveData === 'function') {
        const saveData = stateManager.createSaveData();
        
        // 現在のシーン名も保存しておく（ロード時にどのシーンに戻るかを知るため）
        saveData.currentScene = interpreter.scene.scene.key;

        localStorage.setItem(`save_slot_${slot}`, JSON.stringify(saveData));
        console.log(`%c[SAVE GAME] Game state saved to slot '${slot}'.`, 'color: lightblue;', saveData);
    } else {
        console.error('[save_game] StateManager or createSaveData method not found!');
    }
}

save_game.define = {
    description: '現在のゲームの状態（フラグや変数）を指定されたスロットに保存します。',
    params: [
        { key: 'slot', type: 'string', label: 'セーブスロット名', defaultValue: 'checkpoint' }
    ]
};