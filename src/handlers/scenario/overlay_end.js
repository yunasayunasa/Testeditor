/**
 * [overlay_end] タグ - オーバーレイシーンの終了
 * 
 * NovelOverlaySceneを終了し、呼び出し元のシーンへ戻るようSystemSceneに依頼します。
 * このタグはNovelOverlaySceneでのみ使用されるべきです。
 * 
 * @param {ScenarioManager} manager - ScenarioManagerのインスタンス
 * @param {object} params - タグのパラメータ (このタグでは使用しません)
 */
export default async function handleOverlayEnd(manager, params) {
    const scene = manager.scene; // scene は NovelOverlayScene のインスタンス

    // NovelOverlaySceneがinitで受け取った情報を、SystemSceneに渡して終了処理を依頼
    scene.scene.get('SystemScene').events.emit('end-overlay', {
        from: scene.scene.key,
        returnTo: scene.returnTo,
        inputWasBlocked: scene.inputWasBlocked
    });

    // SystemSceneがシーンの停止処理を行うが、念のためScenarioManagerのループも止める
    manager.stop();
}