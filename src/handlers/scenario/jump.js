/**
 * [jump] タグ - シーン遷移 / ラベルジャンプ
 * 
 * 他のPhaserシーンへ遷移するか、現在のシナリオファイル内のラベルへジャンプします。
 * シーン遷移の際は、オートセーブを実行し、パラメータを渡すことができます。
 * 
 * @param {ScenarioManager} manager - ScenarioManagerのインスタンス
 * @param {object} params - { storage, target, params }
 */
export default async function handleJump(manager, params) {
    
    // --- シーン間遷移の場合 ---
    if (params.storage) {
        const toSceneKey = params.storage;
        console.log(`[jump] シーン[${toSceneKey}]へ遷移します。`);

        // 1. オートセーブを実行
        manager.scene.performSave(0);

        // 2. 遷移先に渡すパラメータを解決
        let transitionParams = {};
        if (params.params) {
            try {
                // params="{ key1: f.value1, key2: 'some_string' }" のような形式を想定
                // StateManagerのgetValueを使って、安全にオブジェクトを生成する
                transitionParams = manager.stateManager.getValue(`(${params.params})`);
            } catch (e) {
                console.error(`[jump] params属性の解析に失敗しました: "${params.params}"`, e);
                transitionParams = {}; // 失敗した場合は空のオブジェクトにする
            }
        }
        
        // 3. SystemSceneに遷移をリクエスト
        const fromSceneKey = manager.scene.scene.key; 
            manager.scene.scene.get('SystemScene').events.emit('request-simple-transition', {
            to: toSceneKey,
            from: fromSceneKey,
            params: transitionParams,
        });

        // 4. ScenarioManagerのループを完全に停止させ、GameSceneの責務を終了する
        manager.stop();
        
    // --- ファイル内ジャンプの場合 ---
    } else if (params.target && params.target.startsWith('*')) {
        console.log(`[jump] ラベル[${params.target}]へジャンプします。`);
        manager.jumpTo(params.target);
        
    } else {
        console.warn('[jump] 有効なstorage属性またはtarget属性が指定されていません。');
    }
}
