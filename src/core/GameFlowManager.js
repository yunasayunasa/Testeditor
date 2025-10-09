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
        // console.log('%c[GameFlowManager] Starting with initial state...', 'color: #795548; font-weight: bold;');
        this.transitionTo(this.initialState);
    }

   /**
 * 外部からイベントを受け取り、状態遷移を試みる。
 * @param {string} eventName 
 * @param {object} [data={}] イベントに関連するデータ
 */
handleEvent(eventName, data = {}) { // ★ data引数を追加
    const currentStateDefinition = this.states[this.currentState];
    if (!currentStateDefinition || !currentStateDefinition.transitions) return;

    const transition = currentStateDefinition.transitions.find(t => t.event === eventName);
    if (transition) {
        // console.log(`%c[GameFlowManager] Event '${eventName}' triggered transition to '${transition.to}'.`, 'color: #795548; font-weight: bold;');
        
        // ★ 遷移時アクションを実行する際に、イベントデータを渡す
        if (transition.action) {
            this.executeActions([transition.action], data); 
        }
        this.transitionTo(transition.to, data); // ★ transitionToにも渡す
    }
}

    /**
     * 指定された状態へ遷移する。
     * @param {string} newStateName 
     */
    transitionTo(newStateName, data = {}) { 
        if (this.currentState === newStateName || !this.states[newStateName]) return;

        // console.log(`%c[GameFlowManager] Transitioning from '${this.currentState}' to '${newStateName}'`, 'color: #795548; font-weight: bold;');

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
        async executeActions(actions, eventData = {}) {// ★ eventData引数を追加
    for (const action of actions) {
            // console.log(`[GameFlowManager] Executing action: ${action.action}`, action.params);
            
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
                            // console.log(`%c[GameFlowManager] Dynamically adding scene: '${toSceneKey}'`, 'color: #795548; font-weight: bold;');
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
                    const activeSceneKey = EngineAPI.activeGameSceneKey;
                    const activeScene = EngineAPI.systemScene.scene.get(activeSceneKey);
                    if (activeScene) {
                        console.log(`[GameFlowManager] -> Applying custom pause to scene: ${activeSceneKey}`);
                        activeScene.isCustomPaused = true; // ★ updateを止める
                        
                        // 物理エンジンも止める
                        if (activeScene.matter?.world) {
                            activeScene.matter.world.engine.timing.timeScale = 0;
                        }
                    }
                    break;
                }

                case 'resumeScene': {
                    const sceneToResumeKey = EngineAPI.activeGameSceneKey;
                    const sceneToResume = EngineAPI.systemScene.scene.get(sceneToResumeKey);
                    if (sceneToResume) {
                        console.log(`[GameFlowManager] -> Removing custom pause from scene: ${sceneToResumeKey}`);
                        sceneToResume.isCustomPaused = false; // ★ updateを再開
                        
                        // 物理エンジンも再開
                        if (sceneToResume.matter?.world) {
                            sceneToResume.matter.world.engine.timing.timeScale = 1;
                        }

                        // ★★★ EngineAPIのsafeResumeはもう不要になる ★★★
                        // なぜなら、入力が止まっていないので競合が起きないから
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
                    const scenarioFile = eventData.scenario; 
                    
                    if (activeScene && scenarioFile) {
                        // console.log(`[GameFlowManager] Awaiting completion of scenario overlay: ${scenarioFile}`);
                        
                        // EngineAPI.runScenarioAsOverlay が返すPromiseを待つ
                        // このPromiseは、[overlay_end]が実行され、'overlay-closed'イベントが
                        // 発行された時に解決される
                        await EngineAPI.runScenarioAsOverlay(activeScene, scenarioFile, true);
                        
                        // awaitが完了した = オーバーレイが正常に終了した、ということ
                        // console.log(`[GameFlowManager] Scenario overlay completed. Firing END_NOVEL_OVERLAY event.`);
                        EngineAPI.fireGameFlowEvent('END_NOVEL_OVERLAY');
                    }
                    break;
                }
                    case 'playBgm': {
                // SoundManagerはregistryから取得するのが安全
                const soundManager = EngineAPI.systemScene?.registry.get('soundManager');
                if (soundManager && params.key) {
                    soundManager.playBgm(params.key, params.volume);
                }
                break;
                }
            }
        }
    }

}