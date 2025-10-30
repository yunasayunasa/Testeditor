export default class StateMachineComponent {
    constructor(scene, owner, params = {}) {
        this.scene = scene;
        this.gameObject = owner;
        
        this.currentStateName = null;
        this.currentStateLogic = null;
        this.stateMachineData = null; // 初期値は null

    // ▼▼▼【この部分を、このように書き換えてください】▼▼▼
    const systemRegistry = this.scene.scene.manager.getScene('SystemScene')?.registry;
    this.actionInterpreter = systemRegistry ? systemRegistry.get('actionInterpreter') : null;
    }

     // 新しい初期化メソッド
    init(stateMachineData) {
        this.stateMachineData = stateMachineData;
        if (this.stateMachineData && this.stateMachineData.initialState) {
            this.transitionTo(this.stateMachineData.initialState);
        }
    }

    update(time, delta) {
        if (!this.currentStateLogic || !this.currentStateLogic.onUpdate) return;
        if (!this.currentStateLogic.onUpdate.nodes || this.currentStateLogic.onUpdate.nodes.length === 0) {
        return; // 実行するノードがなければ何もしない
    }
        if (this.actionInterpreter) {
            this.actionInterpreter.run(this.gameObject, this.currentStateLogic.onUpdate);
        }
    }

   async transitionTo(newStateName) { // ← async を追加
    if (!this.stateMachineData) {
         console.error(`[StateMachine] Error: stateMachineData is not initialized for '${this.gameObject.name}'.`);
         return;
    }
    if (this.currentStateName === newStateName) return;

    // 1. 今の状態の onExit を実行 (完了を待つ！)
    if (this.currentStateLogic && this.currentStateLogic.onExit) {
        await this.actionInterpreter.run(this.gameObject, this.currentStateLogic.onExit); // ← await を追加
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

    // 2. 新しい状態の onEnter を実行 (完了を待つ！)
    if (this.currentStateLogic.onEnter) {
        await this.actionInterpreter.run(this.gameObject, this.currentStateLogic.onEnter); // ← await を追加
    }
}
}

StateMachineComponent.define = {
    // VSLなどから呼び出しを許可するメソッドのリスト
    methods: [
        'transitionTo'
    ],
    // エディタのプロパティパネルに表示するパラメータ
    params: []
};