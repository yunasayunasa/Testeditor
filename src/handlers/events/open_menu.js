// src/handlers/events/open_menu.js

export default async function open_menu(interpreter, params) {
    console.log(`%c[VSL LOG] Tag [open_menu] executed with params:`, 'color: #2196F3; font-size: 1.2em;', params);
    const systemScene = interpreter.scene.scene.get('SystemScene');
    const gameScene = systemScene.getActiveGameScene(); // 現在のゲームシーンを取得

    if (gameScene) {
        systemScene.events.emit('request-pause-menu', {
            from: gameScene.scene.key,
            layoutKey: params.layout
        });
    } else {
        console.warn("[open_menu] Could not find an active game scene to pause.");
    }
}

open_menu.define = {
    description: 'ゲームプレイシーンをポーズし、指定されたレイアウトでオーバーレイメニューを開きます。',
    params: [
        { key: 'layout', type: 'string', label: 'レイアウトキー', required: true }
    ]
};