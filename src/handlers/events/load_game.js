// src/handlers/events/load_game.js
export default async function load_game(interpreter, params) {
    const slot = params.slot || 'checkpoint';
    const saveDataString = localStorage.getItem(`save_slot_${slot}`);

    if (saveDataString) {
        const saveData = JSON.parse(saveDataString);
        const systemScene = interpreter.scene.scene.get('SystemScene');
        
        systemScene.events.emit('request-state-change', {
            to: 'GAMEPLAY',
            from: interpreter.scene.scene.key,
            data: {
                sceneKey: saveData.currentSceneKey,
                params: { loadData: saveData } // ★ ロードデータを次のシーンに渡す
            }
        });
    } else {
        console.warn(`[load_game] Save data for slot '${slot}' not found.`);
    }
}
load_game.define = {
    params: [{ key: 'slot', type: 'string', label: 'ロードスロット名', defaultValue: 'checkpoint' }]
};