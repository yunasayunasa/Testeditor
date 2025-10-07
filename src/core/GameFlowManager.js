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
    const currentStateDefinition = this.states[this.currentState];
    if (!currentStateDefinition || !currentStateDefinition.transitions) return;
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
        
        // ★★★ 見つけた遷移情報と、イベントデータを、全てtransitionToに託す ★★★
        this.transitionTo(transition.to, transition.action, data);

    } else {
        console.error(`%cFAILURE: No transition found...`, "color: #F44336;");
    }
}

    // src/core/GameFlowManager.js (ReferenceError修正版)


/**
 * @param {string} newStateName
 * @param {object | null} transitionAction - 遷移時に実行されるアクション
 * @param {object} [eventData={}] - イベントから渡されたデータ
 */
transitionTo(newStateName, transitionAction = null, eventData = {}) {
    if (this.currentState === newStateName || !this.states[newStateName]) return;

    const oldStateDefinition = this.states[this.currentState];
    if (oldStateDefinition && oldStateDefinition.onExit) {
        this.executeActions(oldStateDefinition.onExit, eventData);
    }

    // ★ 遷移時アクションは、状態が変わる「前」に実行する
    if (transitionAction) {
        this.executeActions([transitionAction], eventData);
    }
    
    this.currentState = newStateName;

    const newStateDefinition = this.states[newStateName];
    if (newStateDefinition && newStateDefinition.onEnter) {
        this.executeActions(newStateDefinition.onEnter, eventData);
    }
}

    /**
     * アクションの配列を実行する。
     * @param {Array<object>} actions 
     */
        executeActions(actions, eventData = {}) { // ★ eventData引数を追加
    for (const action of actions) {
            console.log(`[GameFlowManager] Executing action: ${action.action}`, action.params);
             // ★★★ 1. アクション自身のparamsと、イベントのdataをマージする ★★★
        const params = { ...action.params, ...eventData };
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

                    EngineAPI.requestSimpleTransition(fromScene, params.scene, params); 
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
                const scenarioFile = params.scenario; 
                
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