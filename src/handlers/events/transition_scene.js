// src/actions/transition_scene.js

export default async function transition_scene(interpreter, target, params) {
    const scene = interpreter.scene;

    // 1. 必須パラメータ 'scene' を取得
    const toSceneKey = params.scene;
    if (!toSceneKey) {
        console.warn('[transition_scene] Missing required parameter: "scene".');
        return;
    }

    // 2. SystemSceneに渡すためのデータオブジェクトを構築
    const transitionData = {
        from: scene.scene.key, // 現在のシーンのキー
        to: toSceneKey,        // 遷移先のシーンのキー
        params: {
            // タグのパラメータから、シーンのinitに渡したいデータを抽出
            layoutDataKey: params.data, // 例: 'cave_stage'
            startScript: params.script    // 例: 'shop_dialogue'
            // 将来的に、開始位置(startX, startY)なども渡せるように拡張可能
        },
        // フェード演出などの情報もここに追加できる
        fade: {
            color: params.fade_color || 0x000000, // デフォルトは黒
            duration: params.fade_time ? parseInt(params.fade_time) : 500 // デフォルトは0.5秒
        }
    };
    
    // 3. SystemSceneに、標準のイベントを発行して遷移をリクエスト
    scene.scene.get('SystemScene').events.emit('request-scene-transition', transitionData);
}