// src/actions/transition_scene.js

export default async function transition_scene(interpreter, target, params) {
    // 1. ActionInterpreterから、それが属するシーン(JumpSceneなど)のインスタンスを取得
    const currentScene = interpreter.scene;

    // 2. 必須パラメータ 'scene' を取得
    const toSceneKey = params.scene;
    if (!toSceneKey) {
        console.warn('[transition_scene] Missing required parameter: "scene".');
        return;
    }

    // 3. SystemSceneに渡すためのデータオブジェクトを構築
    const transitionData = {
        // ★★★ currentScene.scene.key を使って、現在のシーンのキーを正しく取得 ★★★
        from: currentScene.scene.key, 
        to: toSceneKey,
        params: {
            layoutDataKey: params.data,
            startScript: params.script
        },
        fade: {
            color: params.fade_color ? parseInt(params.fade_color) : 0x000000,
            duration: params.fade_time ? parseInt(params.fade_time) : 500
        }
    };
    
    // 4. SystemSceneに遷移をリクエスト
    // ★★★ currentScene.scene.get(...) を使って、SystemSceneへの参照を正しく取得 ★★★
    currentScene.scene.get('SystemScene').events.emit('request-scene-transition', transitionData);
}