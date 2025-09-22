export default class StateMachineComponent {
    constructor(scene, owner, params = {}) {
        this.scene = scene;
        this.gameObject = owner;
        this.stateMachineData = this.gameObject.getData('stateMachine');
        this.currentStateName = null;
        this.currentStateLogic = null;
        this.actionInterpreter = this.scene.actionInterpreter;
    }

    start() {
        if (!this.stateMachineData || !this.stateMachineData.initialState) return;
        this.transitionTo(this.stateMachineData.initialState);
    }

    update(time, delta) {
        if (!this.currentStateLogic || !this.currentStateLogic.onUpdate) return;
        if (this.actionInterpreter) {
            this.actionInterpreter.run(this.gameObject, this.currentStateLogic.onUpdate);
        }
    }

    // ▼▼▼【asyncを削除し、呼び出しっぱなしにする】▼▼▼
    transitionTo(newStateName) {
        if (!this.actionInterpreter) return;

        // 既にその状態なら何もしない
        if (this.currentStateName === newStateName) return;

        console.log(`[StateMachine] Transitioning from '${this.currentStateName}' to '${newStateName}'...`, this.gameObject.name);

        // 1. 今の状態の onExit を実行 (完了を待たない)
        if (this.currentStateLogic && this.currentStateLogic.onExit) {
            this.actionInterpreter.run(this.gameObject, this.currentStateLogic.onExit);
        }

        const newStateLogic = this.stateMachineData.states[newStateName];
        if (!newStateLogic) {
            console.error(`[StateMachine] 状態 '${newStateName}' が見つかりません。`);
            this.currentStateName = null;
            this.currentStateLogic = null;
            return;
        }
        this.currentStateName = newStateName;
        this.currentStateLogic = newStateLogic;

        // 2. 新しい状態の onEnter を実行 (完了を待たない)
        if (this.currentStateLogic.onEnter) {
            this.actionInterpreter.run(this.gameObject, this.currentStateLogic.onEnter);
        }
        console.log(`[StateMachine] Transition complete. Current state: '${this.currentStateName}'`, this.gameObject.name);
    }
}