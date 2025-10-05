// src/handlers/events/open_menu.js

export default async function open_menu(interpreter, params) {
    console.log(`%c[VSL LOG] Tag [open_menu] executed with params:`, 'color: #2196F3;', params);

    const systemScene = interpreter.scene.scene.get('SystemScene');
    
    // ★★★ ここからが修正の核心 ★★★
    // --------------------------------------------------------------------

    // 1. SystemSceneの「シーンスタック」から、現在アクティブなゲームシーンを取得する
    //    sceneStackの最後の要素が、現在表示されている一番上のシーン
    const activeGameSceneKey = systemScene.sceneStack[systemScene.sceneStack.length - 1];

    if (activeGameSceneKey) {
        // 2. イベントを発行する
        systemScene.events.emit('request-pause-menu', {
            from: activeGameSceneKey,     // ★ スタックから取得したシーン名を渡す
            layoutKey: params.layout
        });
        console.log(`[open_menu] Pause request sent for scene '${activeGameSceneKey}'.`);
    } else {
        console.warn("[open_menu] Could not find an active game scene in SystemScene's stack.");
    }
    // --------------------------------------------------------------------
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★
}

open_menu.define = {
    description: 'ゲームプレイシーンをポーズし、指定されたレイアウトでオーバーレイメニューを開きます。',
    params: [
        { key: 'layout', type: 'string', label: 'レイアウトキー', required: true }
    ]
};