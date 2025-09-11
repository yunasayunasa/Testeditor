// src/actions/transition_scene.js (デバッグ専用版)

export default async function transition_scene(interpreter, target, params) {
    
    // ▼▼▼【ここからがログ爆弾です】▼▼▼
    console.log('%c--- TRANSITION TAG HANDLER DEBUG ---', 'color: red; font-size: 1.2em; font-weight: bold;');
    try {
        console.log('引数 "interpreter":', interpreter);
        console.log('引数 "target":', target ? target.name : 'null');
        console.log('引数 "params":', params);

        // --- 1. interpreterの存在と型をチェック ---
        if (!interpreter || typeof interpreter.scene === 'undefined') {
            console.error('致命的エラー: interpreterが無効か、sceneプロパティを持っていません。');
            throw new Error('Invalid interpreter');
        }
        const currentScene = interpreter.scene;
        console.log('currentScene (interpreter.scene):', currentScene ? currentScene.scene.key : 'null');

        // --- 2. currentScene.sceneの存在をチェック ---
        if (!currentScene || typeof currentScene.scene === 'undefined' || typeof currentScene.scene.get !== 'function') {
            console.error('致命的エラー: currentScene.sceneが無効か、getメソッドを持っていません。');
            throw new Error('Invalid scene plugin');
        }
        const systemScene = currentScene.scene.get('SystemScene');
        console.log('SystemScene instance:', systemScene ? '取得成功' : '取得失敗');

        // --- 3. イベント発行を試みる ---
        if (!systemScene || typeof systemScene.events === 'undefined' || typeof systemScene.events.emit !== 'function') {
            console.error('致命的エラー: SystemSceneまたはそのevents.emitが無効です。');
            throw new Error('Invalid SystemScene');
        }

        // ここまでのチェックを全て通過した場合のみ、イベントを発行
        const toSceneKey = params.scene;
        const transitionData = {
            from: currentScene.scene.key,
            to: toSceneKey,
            params: { layoutDataKey: params.data, startScript: params.script },
            fade: {
                color: params.fade_color ? parseInt(params.fade_color) : 0x000000,
                duration: params.fade_time ? parseInt(params.fade_time) : 500
            }
        };
        
        console.log('これから発行するイベントデータ:', transitionData);
        systemScene.events.emit('request-scene-transition', transitionData);
        console.log('イベント発行に成功しました。');

    } catch (e) {
        console.error('transition_sceneハンドラ内で予期せぬエラーが発生しました:', e);
        // ActionInterpreterにエラーを再スローして、おなじみのエラーメッセージを表示させる
        throw e;
    } finally {
        console.log('%c--- END OF DEBUG ---', 'color: red; font-weight: bold;');
    }
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
}