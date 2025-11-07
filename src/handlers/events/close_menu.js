// in src/handlers/events/close_menu.js (最強版)
import EngineAPI from '../../core/EngineAPI.js';

export default async function close_menu(interpreter, params) {
    const currentScene = interpreter.scene;
    if (currentScene && currentScene.scene.key === 'OverlayScene') {
        [...currentScene.children.list].forEach(child => {
            child.destroy();
        });
    }
    
    // ★★★ GameFlowManager に渡す「追加情報」をここで作る ★★★
    const dataToPass = { closedBy: params.id };

    EngineAPI.fireGameFlowEvent('CLOSE_PAUSE_MENU', dataToPass);
    
    return '__interrupt__';
}

// ★ define を改造して、ボタンのIDを受け取れるようにする
close_menu.define = {
    params: [ { key: 'id', type: 'string', label: 'ボタンID' } ]
};