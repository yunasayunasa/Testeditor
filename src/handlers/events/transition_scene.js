export default async function transition_scene(interpreter, target, params) {
    const currentScene = interpreter.scene;
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
        },
        fade: {
            color: params.fade_color ? parseInt(params.fade_color, 16) : 0x000000,
            duration: params.fade_time ? parseInt(params.fade_time) : 500
        }
    };
    
    currentScene.scene.get('SystemScene').events.emit('request-scene-transition', transitionData);
}