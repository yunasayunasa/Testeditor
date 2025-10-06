 // src/handlers/events/run_scene.js

export default async function run_scene(interpreter, params) {
    const sceneKey = params.sceneKey;
    if (!sceneKey) {
        console.warn('[run_scene] "sceneKey" parameter is missing.');
        return;
    }

    // ★★★ interpreter.scene は SystemScene 自身を指している ★★★
    const systemScene = interpreter.scene;

    // 1. まず、現在アクティブなゲームシーンがあれば、それを停止させる
    //    sceneStackの最後の要素が、現在アクティブなゲームシーンのはず
    const sceneToStop = systemScene.sceneStack[systemScene.sceneStack.length - 1];
    if (sceneToStop && systemScene.scene.isActive(sceneToStop)) {
        
        // ★ 安全なイベント駆動の停止処理 ★
        const sceneInstance = systemScene.scene.get(sceneToStop);
        sceneInstance.events.once('shutdown', () => {
            console.log(`[run_scene] '${sceneToStop}' has shut down. Now running '${sceneKey}'.`);
            // 2. 古いシーンが停止した後で、新しいシーンを起動
            systemScene.scene.run(sceneKey, params.params || {});
        });
        systemScene.scene.stop(sceneToStop);

    } else {
        // 停止するシーンがなければ、直接新しいシーンを起動
        systemScene.scene.run(sceneKey, params.params || {});
    }
}

// ... (defineは変更なし)

run_scene.define = {
    description: '指定されたキーのシーンを開始します。',
    params: [
        { key: 'sceneKey', type: 'string', label: 'シーンキー', required: true }
    ]
};