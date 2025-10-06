// src/handlers/scenario/jump.js

export default async function handleJump(manager, params) {
    
    if (params.storage) {
        const toSceneKey = params.storage;
        
        // ★★★ "start_gameplay" のような、game_flow.jsonに定義したイベント名を決定する ★★★
        let eventName = '';
        if (toSceneKey === 'JumpScene') {
            eventName = 'start_gameplay';
        }
        // 他のシーンへの遷移もここに追加
        // else if (toSceneKey === 'AnotherScene') { eventName = 'goto_another'; }

        if (eventName) {
            console.log(`[jump] ゲームフローステート遷移イベント '${eventName}' を発行します。`);
            
            // 1. オートセーブを実行
            manager.scene.performSave(0);

            // 2. SystemSceneに、新しい命令系統でイベントを発行
            manager.scene.scene.get('SystemScene').events.emit('request_game_flow_event', eventName);

            // 3. ScenarioManagerのループを完全に停止させる
            manager.stop();

        } else {
            console.warn(`[jump] No game flow event defined for storage: '${params.storage}'`);
        }
        
        
    // --- ファイル内ジャンプの場合（変更なし）---
    } else if (params.target && params.target.startsWith('*')) {
        console.log(`[jump] ラベル[${params.target}]へジャンプします。`);
        manager.jumpTo(params.target);
        
    } else {
        console.warn('[jump] 有効なstorage属性またはtarget属性が指定されていません。');
    }
}