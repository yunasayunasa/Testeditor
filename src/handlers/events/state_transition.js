// src/handlers/events/state_transition.js

/**
 * [state_transition] アクションタグ
 * ターゲットのStateMachineComponentの状態を、指定された新しい状態に遷移させます。
 * @param {ActionInterpreter} interpreter
 * @param {object} params
 * @param {Phaser.GameObjects.GameObject} target - 状態遷移させたいオブジェクト
 */
export default async function state_transition(interpreter, params, target) {
    const newStateName = params.to;
    if (!newStateName) {
        console.warn('[state_transition] "to" parameter is missing.');
        return;
    }

    // ターゲットが指定されていなければ、イベントの発生源(source)を対象とする
    const finalTarget = target || interpreter.currentSource;

    if (!finalTarget) {
        console.warn('[state_transition] Target object not found.');
        return;
    }

    // ターゲットがStateMachineComponentを持っているか確認
    const stateMachine = finalTarget.components?.StateMachineComponent;
    
    if (stateMachine && typeof stateMachine.transitionTo === 'function') {
        // transitionToはasync関数なので、完了を待つ
        await stateMachine.transitionTo(newStateName);
    } else {
        console.warn(`[state_transition] Target '${finalTarget.name}' does not have a StateMachineComponent.`);
    }
}

/**
 * ★ VSLエディタ用の自己定義 ★
 */
state_transition.define = {
    description: 'キャラクターなどのオブジェクトの状態（State）を切り替えます。',
    params: [
        { 
            key: 'to', 
            type: 'string', 
            label: '遷移先の状態名', 
            defaultValue: '',
            required: true
        },
        { 
            key: 'target', 
            type: 'string', 
            label: 'ターゲット', 
            defaultValue: 'source' 
        }
    ]
};