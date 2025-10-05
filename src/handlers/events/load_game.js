// src/handlers/events/load_game.js

export default async function load_game(interpreter, params) {
    console.group(`%c[VSL LOG] Tag [load_game] Executed!`, 'background: #222; color: #ffeb3b;');

    const slot = params.slot || 'checkpoint';
    console.log(`Step 1: Attempting to load from slot '${slot}'.`);

    const saveDataString = localStorage.getItem(`save_slot_${slot}`);

    if (saveDataString) {
        console.log(`Step 2: Save data found in localStorage.`);
        try {
            const saveData = JSON.parse(saveDataString);
            console.log(`Step 3: JSON parsed successfully.`, saveData);

            const systemScene = interpreter.scene.scene.get('SystemScene');
            if (systemScene) {
                console.log(`Step 4: SystemScene found. Emitting 'request-simple-transition'.`);
                
                // ★★★ ここを、あなたの既存のイベントに合わせる ★★★
                systemScene.events.emit('request-simple-transition', {
                    to: saveData.currentSceneKey,        // 保存されたシーンキーに遷移
                    from: interpreter.scene.scene.key,
                    params: {
                        loadData: saveData // ★ ロードデータを渡す
                    }
                });
            } else {
                console.error("CRITICAL: SystemScene not found!");
            }
        } catch (e) {
            console.error("CRITICAL: Failed to parse save data JSON!", e);
        }
    } else {
        console.error(`CRITICAL: Save data for slot '${slot}' not found in localStorage!`);
    }

    console.groupEnd();
}

load_game.define = {
    params: [{ key: 'slot', type: 'string', label: 'ロードスロット名', defaultValue: 'checkpoint' }]
};