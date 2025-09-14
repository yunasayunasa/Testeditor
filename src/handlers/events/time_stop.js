// time_stop.js

export default async function timeStop(interpreter, params, target) {
    const systemScene = interpreter.scene.game.scene.getScene('SystemScene');
    if (systemScene) {
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが、全てを解決する、最後の魔法だ ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // 処理を、次のフレームに遅延させる
        interpreter.scene.time.delayedCall(0, () => {
            console.log(`%c[LOG BOMB 4] time_stop handler: Setting isTimeStopped to TRUE. (Delayed)`, 'color: red; font-size: 1.2em; font-weight: bold;');
            systemScene.isTimeStopped = true;
        });
        
    }
}