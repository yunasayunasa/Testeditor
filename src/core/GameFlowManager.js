import EngineAPI from './EngineAPI.js';
import GameScene from '../scenes/GameScene.js';
import TitleScene from '../scenes/TitleScene.js';
import GameOverScene from '../scenes/GameOverScene.js';
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

    start() {
        this.transitionTo(this.initialState);
    }

    handleEvent(eventName, data = {}) {
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
            this.transitionTo(transition.to, transition.action, data);
        } else {
            console.error(`%cFAILURE: No transition found for event '${eventName}' in state '${this.currentState}'.`, "color: #F44336;");
        }
        
        console.groupEnd(); // ★★★ 修正点1: groupEndをメソッドの最後に移動
    }

    transitionTo(newStateName, transitionAction = null, eventData = {}) {
        if (this.currentState === newStateName || !this.states[newStateName]) return;

        const oldStateDefinition = this.states[this.currentState];
        if (oldStateDefinition && oldStateDefinition.onExit) {
            this.executeActions(oldStateDefinition.onExit, eventData);
        }

        if (transitionAction) {
            this.executeActions([transitionAction], eventData);
        }
        
        this.currentState = newStateName;

        const newStateDefinition = this.states[newStateName];
        if (newStateDefinition && newStateDefinition.onEnter) {
            this.executeActions(newStateDefinition.onEnter, eventData);
        }
    }

    executeActions(actions, eventData = {}) {
        for (const action of actions) {
            const params = { ...action.params, ...eventData };
            console.log(`[GameFlowManager] Executing action type: ${action.type}`, params);
            
            switch (action.type) {
                case 'transitionTo': {
                    // ★★★ 修正点2: paramsから toSceneKey を取得 ★★★
                    const fromScene = EngineAPI.activeGameSceneKey || 'SystemScene';
                    const toSceneKey = params.scene; 

                    const systemScene = EngineAPI.systemScene;
                    if (systemScene && !systemScene.scene.get(toSceneKey)) {
                        const SceneClass = SCENE_MAP[toSceneKey];
                        if (SceneClass) {
                            systemScene.scene.add(toSceneKey, SceneClass, false);
                        }
                    }
                    EngineAPI.requestSimpleTransition(fromScene, toSceneKey, params);
                    break;
                }
                
                case 'pauseScene': {
                    const activeScene = EngineAPI.activeGameSceneKey;
                    if (activeScene) {
                        const systemScene = EngineAPI.systemScene;
                        if (systemScene) {
                            systemScene.scene.pause(activeScene);
                            systemScene.sceneStack.push(activeScene); 
                        }
                    }
                    break;
                }
                
                case 'resumeScene': {
                    const systemScene = EngineAPI.systemScene;
                    if (systemScene && systemScene.sceneStack.length > 0) {
                        const sceneToResume = systemScene.sceneStack.pop();
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
                
                case 'openMenuOverlay': {
                     const activeScene = EngineAPI.activeGameSceneKey;
                     if (activeScene) {
                         EngineAPI.requestPauseMenu(activeScene, params.layout, params);
                     }
                     break;
                }

                  case 'closeOverlay':
                    // 閉じるべきオーバーレイシーンを特定する必要があるが、一旦簡略化
                    EngineAPI.requestCloseOverlay('OverlayScene');
                    break;
                

                case 'runNovelOverlay': {
                    const activeScene = EngineAPI.activeGameSceneKey;
                    const scenarioFile = params.scenario;
                    if (activeScene && scenarioFile) {
                        EngineAPI.runScenarioAsOverlay(activeScene, scenarioFile, true)
                            .then(() => {
                                EngineAPI.fireGameFlowEvent('END_NOVEL_OVERLAY');
                            });
                    } else {
                        console.warn('[GameFlowManager] runNovelOverlay: activeScene or scenario file not found.', { activeScene, scenarioFile });
                    }
                    break;
                }
                
                // 他の 'stopTime', 'resumeTime', 'closeOverlay' などは省略
            }
        }
    }
}
