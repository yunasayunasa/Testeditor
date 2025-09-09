/**
 * [scene_pause] アクションタグ
 * このタグが実行されたシーンの更新と物理演算を一時停止する。
 * @param {ActionInterpreter} interpreter - 呼び出し元のインタープリタ
 * @param {Phaser.GameObjects.GameObject} target - アクションの対象オブジェクト
 * @param {object} params - パラメータ (今回は未使用)
 */
export default async function scenePause(interpreter, target, params) {
    const scene = interpreter.scene;

    if (scene && scene.scene.isPaused() === false) {
        // ★★★ これが、時間を凍結させる魔法だ ★★★
        scene.scene.pause();
        
        console.log(`%c[scene_pause] Scene '${scene.scene.key}' has been paused.`, 'color: orange');
    }
}