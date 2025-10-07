// src/core/GameFlowManager.js
import EngineAPI from './EngineAPI.js';
import GameScene from '../scenes/GameScene.js';
import TitleScene from '../scenes/TitleScene.js';
import GameOverScene from '../scenes/GameOverScene.js';
// JumpSceneなど、JSONから呼ばれる可能性のある他のシーンもインポート
import JumpScene from '../scenes/JumpScene.js';



const SCENE_MAP = {
    GameScene,
    TitleScene,
    GameOverScene,
    JumpScene 
};
export default class GameFlowManager {
    constructor(flowData) {
        this.states = flowData.states;
        this.initialState = flowData.initialState;
        this.currentState = null;
    }

    /**
     * ステートマシンを開始する。
     */
    start() {
        console.log('%c[GameFlowManager] Starting with initial state...', 'color: #795548; font-weight: bold;');
        this.transitionTo(this.initialState);
    }

    /**
     * 外部からイベントを受け取り、状態遷移を試みる。
     * @param {string} eventName 
     */
    handleEvent(eventName) {
        const currentStateDefinition = this.states[this.currentState];
        if (!currentStateDefinition || !currentStateDefinition.transitions) return;

        const transition = currentStateDefinition.transitions.find(t => t.event === eventName);
    if (transition) {
        // ★ 遷移時に実行するアクションがあれば、先に実行する
        if (transition.action) {
            this.executeActions([transition.action]); // 配列にラップして渡す
        }
        this.transitionTo(transition.to);
    }
}

    /**
     * 指定された状態へ遷移する。
     * @param {string} newStateName 
     */
    transitionTo(newStateName) {
        if (this.currentState === newStateName || !this.states[newStateName]) return;

        console.log(`%c[GameFlowManager] Transitioning from '${this.currentState}' to '${newStateName}'`, 'color: #795548; font-weight: bold;');

        const oldStateDefinition = this.states[this.currentState];
        const newStateDefinition = this.states[newStateName];

        // 1. 古い状態の onExit アクションを実行
        if (oldStateDefinition && oldStateDefinition.onExit) {
            this.executeActions(oldStateDefinition.onExit);
        }

        // 2. 状態を更新
        this.currentState = newStateName;

        // 3. 新しい状態の onEnter アクションを実行
        if (newStateDefinition && newStateDefinition.onEnter) {
            this.executeActions(newStateDefinition.onEnter);
        }
    }

    /**
     * アクションの配列を実行する。
     * @param {Array<object>} actions 
     */
        executeActions(actions) {
        for (const action of actions) {
            console.log(`[GameFlowManager] Executing action: ${action.action}`, action.params);
            
           switch (action.action) { // ★ action.type ではなく action.action に統一
            case 'transitionTo':
                    const fromScene = EngineAPI.activeGameSceneKey || 'SystemScene';
                    const toSceneKey = action.params.scene;

                    // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
                    // ★★★ これが今回の解決策の核心です ★★★
                    const systemScene = EngineAPI.systemScene;
                    if (systemScene && !systemScene.scene.get(toSceneKey)) {
                        const SceneClass = SCENE_MAP[toSceneKey];
                        if (SceneClass) {
                            console.log(`%c[GameFlowManager] Dynamically adding scene: '${toSceneKey}'`, 'color: #795548; font-weight: bold;');
                            systemScene.scene.add(toSceneKey, SceneClass, false);
                        }
                    }
                    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

                    EngineAPI.requestSimpleTransition(fromScene, toSceneKey, action.params);
                    break;
                
                
                case 'openMenuOverlay':
                    const activeScene = EngineAPI.activeGameSceneKey;
                    if (activeScene) {
                        EngineAPI.requestPauseMenu(activeScene, action.params.layout, action.params);
                    }
                    break;
                
                case 'closeOverlay':
                    // 閉じるべきオーバーレイシーンを特定する必要があるが、一旦簡略化
                    EngineAPI.requestCloseOverlay('OverlayScene');
                    break;
                
                // ▼▼▼ 新しいアクションを追加 ▼▼▼
            case 'pauseScene': {
                const activeScene = EngineAPI.activeGameSceneKey;
                if (activeScene) {
                    // ここで OverlayManager を呼ぶのではなく、EngineAPIに依頼するのが美しい
                    EngineAPI.requestPauseMenu(activeScene, 'pause_menu');
                }
                break;
            }

            case 'resumeScene': {
                // EngineAPIに依頼するのが美しい
                EngineAPI.requestCloseOverlay('OverlayScene');
                break;
            }
        }
    }
}
}