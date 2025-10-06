// src/handlers/events/open_menu.js

/**
 * [open_menu] VSL Tag - ゲームフロー・ステートマシン対応版
 * 
 * SystemSceneに、ゲームフローの状態遷移をリクエストします。
 * どのメニューを開くか(どのステートに遷移するか)は、game_flow.jsonの定義に依存します。
 */
export default async function open_menu(interpreter, params) {
    console.log(`[VSL LOG] Tag [open_menu] executed with params:`, params);
    
    // interpreter.scene は、このタグを呼び出したUI要素が所属するUISceneを指す
    const systemScene = interpreter.scene.scene.get('SystemScene');
    
    if (systemScene) {
        // ▼▼▼【ここが、全てを解決する修正です】▼▼▼
        // --------------------------------------------------------------------
        // 古い 'request-pause-menu' イベントを発行するのをやめる
        // systemScene.events.emit('request-pause-menu', ...);

        // 新しい公式な命令系統である 'request_game_flow_event' を発行する
        // 'open_pause_menu' というイベント名を指定する
        console.log(`[open_menu] Requesting game flow event 'open_pause_menu'.`);
        systemScene.events.emit('request_game_flow_event', 'open_pause_menu');
        // --------------------------------------------------------------------
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        // ★★★ layoutKeyを渡す必要はありません ★★★
        // どのレイアウトを開くかは、game_flow.jsonの'MainMenu'ステートのonEnterアクション
        // ({ "type": "launch_scene", "params": { "layoutKey": "pause_menu_layout" } })
        // が決定するため、このタグは「メニューを開け」と命令するだけで良くなります。
        // これにより、責務が完全に分離されます。

    } else {
        console.error("[open_menu] CRITICAL: SystemScene not found.");
    }
}

// define部分は、もはやlayoutパラメータを必要としないので、シンプルになります（任意）
open_menu.define = {
    params: [] // パラメータ不要
};