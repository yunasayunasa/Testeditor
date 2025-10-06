// src/handlers/events/close_menu.js
import EngineAPI from '../../core/EngineAPI.js';
export default async function close_menu(interpreter) {
    EngineAPI.requestCloseMenu(interpreter.scene.scene.key);
}

close_menu.define = {
    description: '現在開いているオーバーレイメニューを閉じます。',
    params: []
};