/**
 * [show_novel_text]タグ (変数埋め込み対応版)
 */
export default async function show_novel_text(interpreter, params, target) {
    const stateManager = interpreter.scene.registry.get('stateManager');
    if (!stateManager) return;
    
    // ▼▼▼【ここからが新しい機能です】▼▼▼
    let textToShow = params.text || '';
    
    // &{...} という形式の変数埋め込みを正規表現で探す
    const variableRegex = /&\{([^}]+)\}/g;
    textToShow = textToShow.replace(variableRegex, (match, variablePath) => {
        // 見つかった変数パス (例: f.temp_press_text) の値を StateManager から取得
        const value = stateManager.getValue(variablePath.trim());
        // 値が存在すればそれに置換、なければ空文字に置換
        return value !== undefined ? value : '';
    });

    // --- UISceneとメッセージウィンドウを取得 ---
    const uiScene = interpreter.scene.scene.get('UIScene');
    if (!uiScene) {
        console.warn('[show_novel_text] UIScene is not active.');
        return;
    }
    const messageWindow = uiScene.children.getByName('message_window');
    if (!messageWindow) {
        console.warn('[show_novel_text] Message window object named "message_window" not found in UIScene.');
        return;
    }
    
    // --- 1. ノベルモード開始を宣言 ---
    stateManager.setF('is_novel_mode', true);
    
    // --- 2. テキストを表示し、ウィンドウを可視化 ---
    const textToShow = params.text || '';
    if (typeof messageWindow.setText === 'function') {
        // タイプライター表示機能があるかチェック
        if (typeof messageWindow.startTyping === 'function') {
            // startTypingがPromiseを返すなら、それを待つ
            await messageWindow.startTyping(textToShow);
        } else {
            // なければ、即時表示
            messageWindow.setText(textToShow);
        }
    }
    messageWindow.setVisible(true);

    // --- 3. クリックされるまで待機 ---
    await new Promise(resolve => {
        // 既にタイプライター表示が終わっている場合も考慮し、
        // クリックイベントを一度だけリッスン
        messageWindow.once('pointerdown', () => {
            resolve();
        });
    });

    // --- 4. 後片付け ---
    // 表示したテキストをクリア
    if (typeof messageWindow.setText === 'function') {
        messageWindow.setText('');
    }
    // ウィンドウを非表示
    messageWindow.setVisible(false);

    // --- 5. ノベルモード終了を宣言 ---
    stateManager.setF('is_novel_mode', false);
}

// VSLエディタ用の定義
show_novel_text.define = {
    description: 'データ駆動シーン内でメッセージウィンドウにテキストを表示し、クリックを待ちます。',
    params: [
        { 
            key: 'text', 
            type: 'string', 
            label: '表示テキスト', 
            defaultValue: '',
            required: true
        }
    ]
};