// src/handlers/events/close_menu.js (修正後)
import EngineAPI from '../../core/EngineAPI.js';

export default async function close_menu(interpreter) {
    // ★ 汎用的な「閉じる」メソッドを呼び出す
    EngineAPI.requestCloseOverlay(interpreter.scene.scene.key);

    // ★ 遷移系タグではないので、'__interrupt__' は不要
}

close_menu.define = {
    description: '現在開いているオーバーレイメニューを閉じます。',
    params: []
};
