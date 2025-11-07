// in src/handlers/events/close_menu.js
import EngineAPI from '../../core/EngineAPI.js';

export default async function close_menu(interpreter) {
    
    // ▼▼▼【ここからが、最後の修正です】▼▼▼
    
    const currentScene = interpreter.scene;
    
    if (currentScene && currentScene.scene.key === 'OverlayScene') {
        console.log(`[close_menu] Destroying all objects in '${currentScene.scene.key}' before closing...`);
        
        // 1. 自分が所属するシーンの、全てのゲームオブジェクトを破棄する
        [...currentScene.children.list].forEach(child => {
            child.destroy();
        });
    }
    
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    // 2. (これまでの処理) GameFlowManagerにイベントを発行する
    EngineAPI.fireGameFlowEvent('CLOSE_PAUSE_MENU');
    
    // 3. (これまでの処理) VSLの実行を中断する
    return '__interrupt__';
}

// defineプロパティは変更なし