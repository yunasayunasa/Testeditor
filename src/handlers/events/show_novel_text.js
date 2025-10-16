/**
 * [show_novel_text]タグ (UIScene対応・UI状態管理機能付き)
 * データ駆動シーン内で、指定されたテキストをメッセージウィンドウに表示し、クリックを待つ。
 * 実行中は f.is_novel_mode を true に設定する。
 */
export default async function show_novel_text(interpreter, params, target) {
    // --- StateManagerを取得 ---
    const stateManager = interpreter.scene.registry.get('stateManager');
    if (!stateManager) {
        console.warn('[show_novel_text] StateManager not found.');
        return;
    }

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