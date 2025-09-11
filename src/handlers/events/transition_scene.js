export default async function transition_scene(interpreter, target, params) {
const currentScene = interpreter.scene;

code
Code
const toSceneKey = params.scene;
if (!toSceneKey) {
    console.warn('[transition_scene] Missing required parameter: "scene".');
    return;
}

// ★★★ フェード関連の情報を削除し、渡すデータをシンプルにする ★★★
const transitionData = {
    from: currentScene.scene.key,
    to: toSceneKey,
    params: {
        layoutDataKey: params.data,
        startScript: params.script
    }
};

currentScene.scene.get('SystemScene').events.emit('request-scene-transition', transitionData);