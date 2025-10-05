// in src/handlers/events/load_game.js

export default async function load_game(interpreter, params) {
    console.group(`%c[VSL LOG] Tag [load_game] Executed!`, 'background: #222; color: #ffeb3b;');

    const slot = params.slot || 'checkpoint';
    const saveDataString = localStorage.getItem(`save_slot_${slot}`);

    if (saveDataString) {
        try {
            const saveData = JSON.parse(saveDataString);
            const systemScene = interpreter.scene.scene.get('SystemScene');
            
            if (systemScene) {
                console.log(`Step 4: SystemScene found. Emitting 'request-load-game'.`);
                
                // ▼▼▼【ここを専用イベントに変更】▼▼▼
                // 'request-simple-transition' ではなく、新しいイベントを発行する
                systemScene.events.emit('request-load-game', {
                    saveData: saveData // ★ ロードデータだけを渡す、シンプルな命令
                });
                // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

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

// define部分は変更なし
load_game.define = {
    params: [{ key: 'slot', type: 'string', label: 'ロードスロット名', defaultValue: 'checkpoint' }]
};