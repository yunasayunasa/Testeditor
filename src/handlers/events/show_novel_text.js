/**
 * [show_novel_text]タグ (UIScene対応版)
 */
export default async function show_novel_text(interpreter, params, target) {
    const textToShow = params.text || '';
    
    // 1. シーンマネージャーを経由して、アクティブなUISceneのインスタンスを取得
    const uiScene = interpreter.scene.scene.get('UIScene');
    if (!uiScene) {
        console.warn('[show_novel_text] UIScene is not active.');
        return;
    }

    // 2. UISceneの中から message_window を探す
    const messageWindow = uiScene.children.getByName('message_window');

    if (!messageWindow) {
        console.warn('[show_novel_text] Message window object named "message_window" not found in UIScene.');
        return;
    }

    // --- これ以降のロジックは同じ ---
    if (typeof messageWindow.setText === 'function') {
        messageWindow.setText(textToShow);
    }
    messageWindow.setVisible(true);

    await new Promise(resolve => {
        messageWindow.once('pointerdown', () => {
            resolve();
        });
    });

    messageWindow.setVisible(false);
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