// src/handlers/scenario/overlay_end.js (ファイルパスは適宜読み替えてください)

/**
 * [overlay_end] タグ - オーバーレイシーンの強制終了とUIのリセット
 * 
 * NovelOverlaySceneを強制的にシャットダウンし、呼び出し元のシーンへUIを復元する。
 * このタグは、非同期処理の競合を避けるため、すべての終了処理を明示的に実行する。
 * 
 * @param {ActionInterpreter} interpreter - アクションインタープリタのインスタンス
 */
export default async function handleOverlayEnd(interpreter) {
    // interpreterから、現在実行中のシーン(NovelOverlayScene)のインスタンスを取得
    const overlayScene = interpreter.scene;

    console.log(`%c[overlay_end] Force shutdown sequence initiated for ${overlayScene.scene.key}`, "color: red; font-weight: bold;");

    // --- Step 1: 依存するシーンやサービスへの参照を確保 ---
    const systemScene = overlayScene.scene.get('SystemScene');
    const uiScene = overlayScene.scene.get('UIScene');
    
    if (!systemScene || !uiScene) {
        console.error("[overlay_end] Critical error: SystemScene or UIScene not found.");
        return;
    }

    // --- Step 2: シナリオエンジンのループを完全に停止させる ---
    interpreter.stop();

    // --- Step 3: NovelOverlaySceneのshutdownメソッドを明示的に呼び出す ---
    // これにより、イベントリスナーの解除やタイマーの破棄などを確実に行う
    if (typeof overlayScene.shutdown === 'function') {
        console.log(`[overlay_end] Explicitly calling shutdown() for ${overlayScene.scene.key}`);
        // ★★★ あなたが指摘した「明示的なシャットダウン」の実行 ★★★
        overlayScene.shutdown(); 
    }

    // --- Step 4: UIの状態を、呼び出し元のシーンの状態に強制的に戻す ---
    // shutdown()内で'end-overlay'が発行され、SystemSceneがこれを行うが、念のためここでも実行する
    console.log(`[overlay_end] Requesting UI transition back to ${overlayScene.returnTo}`);
    uiScene.onSceneTransition(overlayScene.returnTo);

    // --- Step 5: 入力がブロックされていた場合、それを解除する ---
    if (overlayScene.inputWasBlocked) {
        const returnScene = systemScene.scene.get(overlayScene.returnTo);
        if (returnScene && returnScene.scene.isActive()) { 
            returnScene.input.enabled = true; 
            console.log(`[overlay_end] Input re-enabled for scene ${overlayScene.returnTo}`);
        }
    }
    
    // --- Step 6: 最後に、NovelOverlaySceneをPhaserの管理下から完全に停止・破棄する ---
    console.log(`[overlay_end] Stopping scene ${overlayScene.scene.key} via scene manager.`);
    overlayScene.scene.stop();
}