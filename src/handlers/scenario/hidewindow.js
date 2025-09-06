/**
 * [hidewindow] タグ - メッセージウィンドウを隠す
 * @param {ScenarioManager} manager
 * @param {object} params - { time?: number }
 */
export default async function handleHideWindow(manager, params) {
    const time = Number(params.time);
    const uiScene = manager.scene.scene.get('UIScene');
    
    if (uiScene && typeof uiScene.hideMessageWindow === 'function') {
        // UISceneのメソッドを呼び出し、完了を待つ
        await uiScene.hideMessageWindow(time);
    }
}