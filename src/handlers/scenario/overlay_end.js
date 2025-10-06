// src/handlers/scenario/overlay_end.js
import EngineAPI from '../../core/EngineAPI.js'; // ★ 1. インポート

/**
 * [overlay_end] タグ - 現在のオーバーレイシーンを終了するようシステムにリクエストする
 * 
 * @param {ScenarioManager} manager - ScenarioManagerのインスタンス
 */
export default async function handleOverlayEnd(manager) {
    const overlaySceneKey = manager.scene.scene.key;
    console.log(`%c[overlay_end] Requesting system to end overlay: ${overlaySceneKey}`, "color: green; font-weight: bold;");

    // ★ 2. EngineAPIにオーバーレイの終了をリクエストするだけ
    EngineAPI.requestEndOverlay(overlaySceneKey);
    
    // ★ 3. 自身のシナリオマネージャーを停止する (これはこのタグの責務)
    manager.stop();
}