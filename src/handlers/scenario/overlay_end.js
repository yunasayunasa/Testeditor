// handleOverlayEnd.js

export default async function handleOverlayEnd(manager, params) {
    const scene = manager.scene; // scene は NovelOverlayScene のインスタンス

    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★★★ これが最後のピースです ★★★
    
    // SystemSceneにイベントを投げる必要はもうない。
    // シーン自身が停止すれば、shutdown()メソッドが自動的に呼ばれ、
    // その中で'end-overlay'イベントが発行される。
    
    // 明示的に、このシーン自身を停止する
    scene.scene.stop();
    
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
}