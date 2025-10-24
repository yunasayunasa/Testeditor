import EngineAPI from '../../core/EngineAPI.js';

export default async function open_menu(interpreter, params) {
    const layoutKey = params.layout;
    if (!layoutKey) {
        console.warn('[open_menu] "layout" parameter is missing. This tag now requires a layout key.');
        return;
    }

    // 現在のシーンキーを取得
    const fromSceneKey = interpreter.scene.scene.key;

    console.log(`%c[VSL LOG] [open_menu] called. Requesting overlay directly. from: '${fromSceneKey}', layout: '${layoutKey}'`, 'color: #2196F3; font-weight: bold;');
    
    // GameFlowManagerを介さず、EngineAPIのメソッドを直接呼び出す！
    EngineAPI.requestPauseMenu(fromSceneKey, layoutKey);
}

// defineプロパティも、layoutを受け取れるように修正
open_menu.define = {
    description: '指定したレイアウトファイルをオーバーレイとして開きます。',
    params: [
        { 
            key: 'layout', 
            type: 'string', 
            label: 'レイアウトファイル名', 
            required: true 
        }
    ]
};