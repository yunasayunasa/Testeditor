
export default async function transition_scene(currentScene, target, params) {
    const toSceneKey = params.scene;
    if (!toSceneKey) {
        console.warn('[transition_scene] Missing required parameter: "scene".');
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
    
    // ★★★ これで、最も直接的でエラーの起きようがない呼び出し方になる ★★★
    currentScene.scene.get('SystemScene').events.emit('request-scene-transition', transitionData);
}