/**
 * [showwindow] タグ - メッセージウィンドウを表示する
 */
export default async function handleShowWindow(manager, params) {
    const time = Number(params.time);
    const uiScene = manager.scene.scene.get('UIScene');

    if (uiScene && typeof uiScene.showMessageWindow === 'function') {
        // ★ await を使わない！
        uiScene.showMessageWindow(time);
    }
}