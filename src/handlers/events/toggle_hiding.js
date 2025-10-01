// in src/handlers/events/toggle_hiding.js

/**
 * [toggle_hiding]
 * 'player'オブジェクトの'PlayerController'コンポーネントが持つ、
 * 'toggleHiding'メソッドを呼び出す、専用タグ。
 */
export default async function toggle_hiding(interpreter, params, target) {
    // 1. シーンから'player'オブジェクトを探す
    const player = interpreter.scene.children.getByName('player');
    if (!player) {
        console.warn(`[toggle_hiding] 'player' object not found in the scene.`);
        return;
    }

    // 2. プレイヤーから'PlayerController'コンポーネントを取得
    const playerController = player.components?.PlayerController;
    if (!playerController || typeof playerController.toggleHiding !== 'function') {
        console.warn(`[toggle_hiding] 'PlayerController' or its 'toggleHiding' method not found on 'player'.`);
        return;
    }

    // 3. toggleHidingメソッドを呼び出す
    //    引数として、このイベントの発生源（target、つまり隠れ場所オブジェクト）を渡す
    playerController.toggleHiding(target);
}

toggle_hiding.define = {
    description: 'プレイヤーの隠れる/出る状態を切り替えます。',
    params: [
        // このタグは'player'に対してしか機能しないので、ターゲット指定は不要
    ]
};