/**
 * [show_novel_text]タグ
 * データ駆動シーン内で、指定されたテキストをメッセージウィンドウに表示し、クリックを待つ。
 */
export default async function show_novel_text(interpreter, params, target) {
    // 1. パラメータから表示するテキストを取得
    const textToShow = params.text || '';
    
    // 2. シーンからメッセージウィンドウのGameObjectを取得する
    //    (今回は'message_window'という名前でシーンに配置されていることを前提とする)
    const messageWindow = interpreter.scene.children.getByName('message_window');

    if (!messageWindow) {
        console.warn('[show_novel_text] Message window object named "message_window" not found in the scene.');
        return; // メッセージウィンドウがなければ処理を終了
    }

    // 3. テキストを表示し、ウィンドウを可視化する
    //    (メッセージウィンドウに setText と show というカスタムメソッドがあると仮定)
    if (typeof messageWindow.setText === 'function') {
        messageWindow.setText(textToShow);
    }
    if (typeof messageWindow.show === 'function') {
        messageWindow.show();
    }
    messageWindow.setVisible(true); // 最低限の表示

    // 4. クリックされるまで待機するPromiseを作成
    await new Promise(resolve => {
        // メッセージウィンドウがクリックされたら、一度だけイベントをリッスン
        messageWindow.once('pointerdown', () => {
            resolve(); // Promiseを解決して、awaitを終了させる
        });
    });

    // 5. クリックされた後、ウィンドウを非表示にする
    if (typeof messageWindow.hide === 'function') {
        messageWindow.hide();
    }
     messageWindow.setVisible(false); // 最低限の非表示
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