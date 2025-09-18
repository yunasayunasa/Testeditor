// src/handlers/events/transition_scene.js

/**
 * [transition_scene] アクションタグ
 * 現在のシーンから、別のゲームシーンへ遷移します。
 * @param {ActionInterpreter} interpreter
 * @param {object} params
 */
export default async function transition_scene(interpreter, params) {
    const toSceneKey = params.scene;
    if (!toSceneKey) {
        console.warn('[transition_scene] Missing required parameter: "scene".');
        return;
    }

    const currentScene = interpreter.scene;
    if (!currentScene) return;

    const transitionData = {
        from: currentScene.scene.key,
        to: toSceneKey,
        params: {
            layoutDataKey: params.data,   // どのJSONを読み込むか
            startScript: params.script  // どのシナリオを起動するか（GameScene用）
        }
    };
    
    // request-scene-transition ではなく、よりシンプルな request-simple-transition を使うのが望ましい
    currentScene.scene.get('SystemScene').events.emit('request-simple-transition', transitionData);
}

/**
 * ★ VSLエディタ用の自己定義 ★
 */
transition_scene.define = {
    description: '指定した別のゲームシーンへ遷移します。',
    params: [
        { key: 'scene', type: 'string', label: '遷移先シーン名', defaultValue: '' },
        { key: 'data', type: 'string', label: 'レイアウトJSON名', defaultValue: '' },
        { key: 'script', type: 'string', label: '開始シナリオ名', defaultValue: '' }
    ]
};