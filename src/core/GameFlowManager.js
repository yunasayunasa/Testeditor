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
 * @param {object} [data={}] イベントに関連するデータ
 */
handleEvent(eventName, data = {}) {
    // ▼▼▼ ここにログ爆弾を仕掛ける ▼▼▼
    console.group(`%c[GameFlowManager] Event Received: ${eventName}`, "background: #795548; color: white; padding: 2px 5px;");
    console.log(`CURRENT STATE: '${this.currentState}'`);
    console.log(`Event Data:`, data);

    const currentStateDefinition = this.states[this.currentState];
    if (!currentStateDefinition) {
        console.error("Current state definition not found!");
        console.groupEnd();
        return;
    }
    
    console.log("Searching for transition in:", currentStateDefinition.transitions);
    const transition = currentStateDefinition.transitions.find(t => t.event === eventName);

    if (transition) {
        console.log(`%cSUCCESS: Transition found! -> to: '${transition.to}'`, "color: #4CAF50;");
        console.log(`%c[GameFlowManager] Event '${eventName}' triggered transition to '${transition.to}'.`, 'color: #795548; font-weight: bold;');
      } else {
        console.error(`%cFAILURE: No transition found for event '${eventName}' in state '${this.currentState}'.`, "color: #F44336;");
    }
    console.groupEnd();

    // 元のロジックはここから...
    if (transition) {
        if (transition.action) {
            this.executeActions([transition.action], data); 
        }
        this.transitionTo(transition.to, data);
    }
}

    /**
     * 指定された状態へ遷移する。
     * @param {string} newStateName 
     */
    transitionTo(newStateName, data = {}) { 
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
        this.executeActions(newStateDefinition.onEnter, data); // ★ onEnterにも渡す
    }
}

    /**
     * アクションの配列を実行する。
     * @param {Array<object>} actions 
     */
        executeActions(actions, eventData = {}) { // ★ eventData引数を追加
    for (const action of actions) {
            console.log(`[GameFlowManager] Executing action: ${action.action}`, action.params);
            
          switch (action.type) {
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
                    console.log(`[GameFlowManager] -> Pausing scene: ${activeScene}`);
                    
                    // ★ EngineAPIに新しいメソッドを追加するのが理想だが、
                    //    今回は直接PhaserのAPIを呼んでみる
                    const systemScene = EngineAPI.systemScene;
                    if (systemScene) {
                        systemScene.scene.pause(activeScene);
                        // ポーズしたシーンをスタックに積むのはOverlayManagerの役割だったが、
                        // ここでも行う必要がある
                        systemScene.sceneStack.push(activeScene); 
                    }
                }
                break;
            }

            case 'resumeScene': {
                const systemScene = EngineAPI.systemScene;
                if (systemScene && systemScene.sceneStack.length > 0) {
                    const sceneToResume = systemScene.sceneStack.pop();
                    console.log(`[GameFlowManager] -> Resuming scene: ${sceneToResume}`);
                    systemScene.scene.resume(sceneToResume);
                }
                break;
            }

            case 'stopTime':
                EngineAPI.stopTime();
                break;
            
            case 'resumeTime':
                EngineAPI.resumeTime();
                break;
            
            case 'runNovelOverlay': {
                const activeScene = EngineAPI.activeGameSceneKey;
                
                // ★★★ eventDataからシナリオファイル名を取得する ★★★
                const scenarioFile = eventData.scenario; 
                
                if (activeScene && scenarioFile) {
                    EngineAPI.runScenarioAsOverlay(activeScene, scenarioFile, true)
                        .then(() => {
                            EngineAPI.fireGameFlowEvent('END_NOVEL_OVERLAY');
                        });
                } else {
                    console.warn('[GameFlowManager] runNovelOverlay: activeScene or scenario file not found.', {activeScene, scenarioFile});
                }
                break;
            }
        }
    }
}
}