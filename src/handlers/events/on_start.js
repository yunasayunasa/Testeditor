/**
 * [on_start] - ゲーム開始時に実行
 * オブジェクトの最初のフレームで一度だけ実行されます
 */
export default async function on_start(interpreter, params, target, context) {
    // このイベントは BaseGameScene の initComponentsAndEvents で
    // 自動的に 'start' トリガーとして発火されることを想定
    // 特に処理は不要で、このノードに接続された次のノードが実行される
}

on_start.define = {
    description: 'オブジェクトの開始時に一度だけ実行されます',
    params: [],
    isTrigger: true
};
