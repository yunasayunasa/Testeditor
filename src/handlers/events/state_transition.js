
export default async function state_transition(interpreter, params, target) {
    // ▼▼▼【デバッグログを追加】▼▼▼
    console.log("%c[state_transition] Handler executed.", "color: magenta;");
    console.log("  > Received target (from interpreter):", target);
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    const newStateName = params.to;
    if (!newStateName) {
        console.warn('[state_transition] "to" parameter is missing.');
        return;
    }

    const finalTarget = target || interpreter.currentSource;
    console.log("  > Final target to transition:", finalTarget);

    if (!finalTarget) {
        console.warn('[state_transition] Target object not found.');
        return;
    }

    const stateMachine = finalTarget.components?.StateMachineComponent;
    
    if (stateMachine && typeof stateMachine.transitionTo === 'function') {
        console.log(`  > Attempting to transition '${finalTarget.name}' to state '${newStateName}'`);
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