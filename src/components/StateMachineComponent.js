// src/components/StateMachineComponent.js

export class StateMachineComponent {
    // コンストラクタはシーン(this), オーナー(gameObject), パラメータを受け取る
    constructor(scene, owner, params = {}) {
        this.scene = scene;
        this.gameObject = owner; // BaseGameSceneの設計に合わせて'owner'を'gameObject'として保存
        this.stateMachineData = this.gameObject.getData('stateMachine');
        this.currentStateName = null;
        this.currentStateLogic = null;
        this.actionInterpreter = this.scene.actionInterpreter; // シーンから参照を取得
    }

    // コンポーネントが有効になった時にシーンから一度だけ呼ばれる
    start() {
        if (!this.stateMachineData || !this.stateMachineData.initialState) {
            return; // データがなければ何もしない
        }
        this.changeState(this.stateMachineData.initialState);
    }

    // 毎フレーム、シーンから呼ばれる
    update(time, delta) {
        if (!this.currentStateLogic || !this.currentStateLogic.onUpdate) {
            return; // onUpdateがなければ何もしない
        }
        // ActionInterpreterにonUpdateの実行を依頼
        if (this.actionInterpreter) {
            this.actionInterpreter.run(this.gameObject, this.currentStateLogic.onUpdate);
        }
    }

    // 状態を切り替えるメソッド
    changeState(newStateName) {
        if (!this.actionInterpreter) return;

        // 1. 今の状態の onExit を実行
        if (this.currentStateLogic && this.currentStateLogic.onExit) {
            this.actionInterpreter.run(this.gameObject, this.currentStateLogic.onExit);
        }

        // 2. 新しい状態に切り替え
        const newStateLogic = this.stateMachineData.states[newStateName];
        if (!newStateLogic) {
            console.error(`[StateMachine] 状態 '${newStateName}' が見つかりません。`);
            this.currentStateName = null;
            this.currentStateLogic = null;
            return;
        }
        this.currentStateName = newStateName;
        this.currentStateLogic = newStateLogic;

        // 3. 新しい状態の onEnter を実行
        if (this.currentStateLogic.onEnter) {
            this.actionInterpreter.run(this.gameObject, this.currentStateLogic.onEnter);
        }
    }
}