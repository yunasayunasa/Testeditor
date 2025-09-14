// /src/handlers/events/transition_scene.js

/**
 * ★★★ 新形式対応版 ★★★
 * [transition_scene] タグハンドラ
 * @param {ActionInterpreter} interpreter - アクションインタープリタのインスタンス
 * @param {object} params - タグのパラメータ
 * @param {Phaser.GameObjects.GameObject} target - 適用対象のオブジェクト (このハンドラでは未使用)
 */
export default async function transition_scene(interpreter, params, target) {
    const toSceneKey = params.scene;
    if (!toSceneKey) {
        console.warn('[transition_scene] Missing required parameter: "scene".');
        return;
    }

    // --- ActionInterpreterが保持している現在のシーンへの参照を取得 ---
    const currentScene = interpreter.scene;
    if (!currentScene) {
        console.error('[transition_scene] Could not determine the current scene from the interpreter.');
        return;
    }

    const transitionData = {
        from: currentScene.scene.key,
        to: toSceneKey,
        params: {
            layoutDataKey: params.data,
            startScript: params.script
        }
    };
    
    // --- 現在のシーンからSystemSceneを取得してイベントを発行 ---
    currentScene.scene.get('SystemScene').events.emit('request-scene-transition', transitionData);
}