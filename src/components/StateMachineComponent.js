// src/components/StateMachineComponent.js

class StateMachineComponent { // ← 先頭の'export'を削除
    constructor(scene, owner, params = {}) {
        this.scene = scene;
        this.gameObject = owner;
        this.stateMachineData = this.gameObject.getData('stateMachine');
        this.currentStateName = null;
        this.currentStateLogic = null;
        this.actionInterpreter = this.scene.actionInterpreter;
    }

    start() {
        if (!this.stateMachineData || !this.stateMachineData.initialState) {
            return;
        }
        this.transitionTo(this.stateMachineData.initialState);
    }

    update(time, delta) {
        if (!this.currentStateLogic || !this.currentStateLogic.onUpdate) {
            return;
        }
        if (this.actionInterpreter) {
            this.actionInterpreter.run(this.gameObject, this.currentStateLogic.onUpdate);
        }
    }

    transitionTo(newStateName) {
        if (!this.actionInterpreter) return;

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

        if (this.currentStateLogic.onEnter) {
            this.actionInterpreter.run(this.gameObject, this.currentStateLogic.onEnter);
        }
    }
}

// ▼▼▼【ここが重要】▼▼▼
// クラス定義が終わった後で、defaultとしてエクスポートする
export default StateMachineComponent;