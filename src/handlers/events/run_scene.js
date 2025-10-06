// src/handlers/events/run_scene.js

export default async function run_scene(interpreter, params) {
    const sceneKey = params.sceneKey;
    if (!sceneKey) {
        console.warn('[run_scene] "sceneKey" parameter is missing.');
        return;
    }

    // SystemSceneの既存の遷移メソッドを呼び出すのが安全
    const systemScene = interpreter.scene.scene.get('SystemScene');
    if (systemScene) {
        // 現在のシーンキーを取得（interpreter.scene は SystemScene 自身）
        const fromSceneKey = systemScene.gameState ? systemScene.gameState : 'SystemScene';
        
        systemScene.events.emit('request-simple-transition', {
            from: fromSceneKey,
            to: sceneKey,
            params: params.params || {}
        });
    }
}

run_scene.define = {
    description: '指定されたキーのシーンを開始します。',
    params: [
        { key: 'sceneKey', type: 'string', label: 'シーンキー', required: true }
    ]
};