// /src/handlers/events/set_ui_visible.js

/**
 * [set_ui_visible] タグハンドラ
 * 指定されたグループに属するUI要素の表示/非表示を切り替える
 * @param {ActionInterpreter} interpreter
 * @param {object} params
 */
export default function setUiVisibleHandler(interpreter, params) {
    const group = params.group;
    const visible = params.visible === 'true'; // 'true'という文字列の場合のみtrue

    if (!group) {
        console.warn('[set_ui_visible] "group" parameter is missing.');
        return;
    }

    // UISceneへの参照を取得
    const uiScene = interpreter.scene.scene.get('UIScene');
    if (uiScene && typeof uiScene.setGroupVisible === 'function') {
        uiScene.setGroupVisible(group, visible);
    }
}