/**
 * [showwindow] タグ - メッセージウィンドウを表示する
 * @param {ScenarioManager} manager
 * @param {object} params - { time?: number }
 */
export default async function handleShowWindow(manager, params) {
    const time = Number(params.time);
    const uiScene = manager.scene.scene.get('UIScene');

    if (uiScene && typeof uiScene.showMessageWindow === 'function') {
        // UISceneのメソッドを呼び出し、完了を待つ
        await uiScene.showMessageWindow(time);
    }
}