/**
 * [on_update] - 毎フレーム実行
 * update ループで毎フレーム実行されます
 */
export default async function on_update(interpreter, params, target, context) {
    // このイベントは BaseGameScene の update で
    // 自動的に 'update' トリガーとして発火されることを想定
}

on_update.define = {
    description: '毎フレーム実行されます',
    params: [],
    isTrigger: true
};
