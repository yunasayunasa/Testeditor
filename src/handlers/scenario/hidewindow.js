/**
 * [hidewindow] タグ - メッセージウィンドウを隠す
 */
export default async function handleHideWindow(manager, params) {
    const time = Number(params.time);
    const uiScene = manager.scene.scene.get('UIScene');
    
    if (uiScene && typeof uiScene.hideMessageWindow === 'function') {
        // ★ await を使わない！
        uiScene.hideMessageWindow(time);
    }
}