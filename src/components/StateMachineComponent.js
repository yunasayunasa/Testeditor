import Component from './Component.js';

export default class StateMachineComponent extends Component {
    /**
     * @param {Phaser.Scene} scene - このコンポー-ントが属するシーン
     * @param {Phaser.GameObjects.GameObject} owner - このコンポーネントがアタッチされるGameObject
     * @param {object} params - コンポーネントの初期化パラメータ (ここでは未使用)
     */
    constructor(scene, owner, params = {}) {
        super(scene, owner);

        // --- 1. ActionInterpreterへの参照を取得 ---
        this.actionInterpreter = this.scene.registry.get('actionInterpreter');
        if (!this.actionInterpreter) {
            console.error("StateMachineComponent requires a registered 'actionInterpreter' service.");
        }

        // --- 2. ステートマシンの状態を初期化 ---
        this.states = new Map(); // 各状態の定義を格納するMap
        this.currentState = null; // 現在の状態の名前 (例: 'idle')
        this.isTransitioning = false; // 状態遷移中の多重実行を防ぐフラグ
        
        // --- 3. GameObjectのデータからステートマシン定義を読み込んで設定 ---
        const sm_data = this.owner.getData('state_machine');
        if (sm_data && sm_data.states) {
            sm_data.states.forEach(stateDef => {
                this.states.set(stateDef.name, stateDef);
            });

            // --- 4. 初期状態を開始する ---
            if (sm_data.initialState && this.states.has(sm_data.initialState)) {
                this.transitionTo(sm_data.initialState);
            } else {
                console.warn(`[StateMachine] Initial state '${sm_data.initialState}' not found.`, this.owner.name);
            }
        }
    }

    /**
     * ゲームループで毎フレーム呼び出される
     * @param {number} time - 全体時間
     * @param {number} delta - 前フレームからの経過時間
     */
    update(time, delta) {
        // 状態遷移中や、現在の状態がなければ何もしない
        if (this.isTransitioning || !this.currentState) return;
        
        const currentStateDef = this.states.get(this.currentState);
        
        // 現在の状態に onUpdate イベントがあれば実行する
        if (currentStateDef && currentStateDef.onUpdate && this.actionInterpreter) {
            // ★ onUpdateは毎フレーム呼ばれるので、run()は非同期で呼び出しっぱなしにする
            this.actionInterpreter.run(this.owner, currentStateDef.onUpdate, null);
        }
    }

    /**
     * 指定された新しい状態に遷移する
     * @param {string} newStateName - 新しい状態の名前 (例: 'chase')
     */
    async transitionTo(newStateName) {
        // 既にその状態であるか、遷移中、または状態が存在しない場合は何もしない
        if (this.currentState === newStateName || this.isTransitioning || !this.states.has(newStateName)) {
            return;
        }

        this.isTransitioning = true;
        console.log(`[StateMachine] Transitioning from '${this.currentState}' to '${newStateName}'...`, this.owner.name);

        const oldStateDef = this.states.get(this.currentState);
        const newStateDef = this.states.get(newStateName);

        // --- 1. 古い状態の onExit を実行 (存在すれば) ---
        if (oldStateDef && oldStateDef.onExit && this.actionInterpreter) {
            // awaitで完了を待つ
            await this.actionInterpreter.run(this.owner, oldStateDef.onExit, null);
        }

        // --- 2. 現在の状態を更新 ---
        this.currentState = newStateName;

        // --- 3. 新しい状態の onEnter を実行 (存在すれば) ---
        if (newStateDef && newStateDef.onEnter && this.actionInterpreter) {
            // awaitで完了を待つ
            await this.actionInterpreter.run(this.owner, newStateDef.onEnter, null);
        }
        
        this.isTransitioning = false;
        console.log(`[StateMachine] Transition complete. Current state: '${this.currentState}'`, this.owner.name);
    }

    destroy() {
        this.states.clear();
        this.currentState = null;
    }
}