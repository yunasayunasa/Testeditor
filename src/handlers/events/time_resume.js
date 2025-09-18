// src/handlers/events/time_resume.js

/**
 * [time_resume] アクションタグ
 * ゲーム全体の時間を再開します。
 * @param {ActionInterpreter} interpreter
 */
export default async function time_resume(interpreter) {
    const systemScene = interpreter.scene.scene.get('SystemScene');
    if (systemScene) {
        systemScene.isTimeStopped = false;
    }
}

/**
 * ★ VSLエディタ用の自己定義 ★
 */
time_resume.define = {
    description: 'ゲーム内世界の時間（物理演算など）を再開します。',
    params: []
};