// src/core/GameFlowManager.js
import EngineAPI from './EngineAPI.js';
import GameScene from '../scenes/GameScene.js';
import TitleScene from '../scenes/TitleScene.js';
import GameOverScene from '../scenes/GameOverScene.js';
// JumpSceneなど、JSONから呼ばれる可能性のある他のシーンもインポート
import JumpScene from '../scenes/TestimonyScene.js';



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
        if (eventName === 'CLOSE_PAUSE_MENU' && data.closedBy) {
            const stateManager = EngineAPI.systemScene.registry.get('stateManager');
            if (stateManager) {
                // [close_menu] から渡されたIDを、f.selected_evidence に保存
                stateManager.setF('selected_evidence', data.closedBy);

                // そして、即座に判定アクションを実行
                this.executeActions([{ type: 'check_evidence_action' }]);
            }
        }
        
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        if (transition.action) {
            this.executeActions(Array.isArray(transition.action) ? transition.action : [transition.action], data);
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
                
                
                case 'openMenuOverlay': {
    const activeScene = EngineAPI.activeGameSceneKey;
    if (!activeScene) break;
    
    const layoutKey = eventData.layout || action.params.layout;
    const layoutData = JSON.parse(JSON.stringify(EngineAPI.systemScene.cache.json.get(layoutKey))); // ★ ディープコピーする

    // ▼▼▼【ここからが、最後の、そして真実の修正です】▼▼▼
    
    // もし "dynamic_type" パラメータがあれば、動的生成ロジックを実行
    const dynamicType = eventData.dynamic_type || action.params.dynamic_type;
    if (dynamicType === 'evidence_list') {
        const stateManager = EngineAPI.systemScene.registry.get('stateManager');
        const evidenceMaster = EngineAPI.systemScene.cache.json.get('evidence_master');
        const playerEvidence = stateManager ? stateManager.getValue('f.player_evidence') : [];
        const dynamicObjects = [];

        if (playerEvidence && evidenceMaster) {
            playerEvidence.forEach((evidenceId, index) => {
                const evidenceData = evidenceMaster[evidenceId];
                if (evidenceData) {
                    dynamicObjects.push({
                        "name": `evidence_${evidenceId}`,
                        "type": "Button",
                        "x": 640,
                        "y": 200 + (index * 80),
                        "label": evidenceData.name,
                        "data": { "registryKey": "generic_button" },
                        "events": [
                          {
                            "trigger": "onClick", "id": `event_${evidenceId}`,
                            "nodes": [
                              { "id": `eval_${evidenceId}`, "type": "eval", "params": { "exp": `f.selected_evidence = "${evidenceId}"` } },
                              { "id": `close_${evidenceId}`, "type": "close_menu", "params": {} }
                            ],
                            "connections": [
                              { "fromNode": "start", "fromPin": "output", "toNode": `eval_${evidenceId}`, "toPin": "input" },
                              { "fromNode": `eval_${evidenceId}`, "fromPin": "output", "toNode": `close_${evidenceId}`, "toPin": "input" }
                            ]
                          }
                        ]
                    });
                }
            });
        }
        // 生成したオブジェクトを、元のレイアウトデータに結合
        layoutData.objects = (layoutData.objects || []).concat(dynamicObjects);
    }

    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    // ★★★ 改造した layoutData を、新しいユニークなキーでキャッシュに保存 ★★★
    const dynamicLayoutKey = `${layoutKey}_${Date.now()}`;
    EngineAPI.systemScene.cache.json.add(dynamicLayoutKey, layoutData);
    
    // ★★★ OverlaySceneには、その新しいキーを渡す ★★★
    EngineAPI.requestPauseMenu(activeScene, dynamicLayoutKey);

    break;
}
                
                case 'closeOverlay': {
    // 1. 閉じるべきシーンは OverlayScene で固定
    const sceneToClose = EngineAPI.systemScene.scene.get('OverlayScene');

    if (sceneToClose && sceneToClose.scene.isActive()) {
        console.log(`[GameFlowManager] closeOverlay: Destroying all objects in 'OverlayScene'...`);
        
        // 2. シーンが持つ全てのゲームオブジェクトを明示的に破棄
        if (sceneToClose.children && sceneToClose.children.list) {
            [...sceneToClose.children.list].forEach(child => {
                if (child && typeof child.destroy === 'function') {
                    child.destroy();
                }
            });
        }
        // 3. シーンを停止
        EngineAPI.requestCloseOverlay('OverlayScene');
    } else {
        console.warn("[GameFlowManager] 'OverlayScene' not found or not active.");
    }
    
    // 4. suppressRefresh 関連のコードは削除！
    // const editor = ...; if (editor) editor.suppressRefresh(false);  ← 削除
    
    break;
}
                
                // ▼▼▼ 新しいアクションを追加 ▼▼▼
              case 'pauseScene': {
                const activeScene = EngineAPI.activeGameSceneKey;
                if (activeScene) {
                    // console.log(`[GameFlowManager] -> Pausing scene: ${activeScene}`);
                    
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

           case 'check_evidence_action': {
    console.log("[GameFlowManager] Starting check_evidence_action...");

    const stateManager = EngineAPI.systemScene.registry.get('stateManager');
    
    // ★重要: アクティブなシーンが見つからなくても、TestimonySceneを決め打ちで探すフォールバックを追加
    let activeScene = EngineAPI.systemScene.scene.get(EngineAPI.activeGameSceneKey);
    if (!activeScene) {
        console.warn("[GameFlowManager] Active scene not found via key. Trying 'TestimonyScene'...");
        activeScene = EngineAPI.systemScene.scene.get('TestimonyScene');
    }

    if (!stateManager || !activeScene) {
        console.error("[GameFlowManager] CRITICAL: StateManager or Scene not found. Forcing return to InGame.");
        // 復帰できないと困るので、強制的に NO_SELECTION (ゲーム再開) を発行
        EngineAPI.fireGameFlowEvent('NO_SELECTION');
        break;
    }

    const selectedEvidence = stateManager.getValue('f.selected_evidence');
    console.log(`[GameFlowManager] Selected Evidence ID: ${selectedEvidence}`);

    // 「やめる」が押された場合 (null または "null" 文字列)
    if (!selectedEvidence || selectedEvidence === "null") {
        console.log("[GameFlowManager] No evidence selected. Returning to game.");
        EngineAPI.fireGameFlowEvent('NO_SELECTION');
    } else {
        const testimonyId = stateManager.getValue('f.current_testimony_id');
        const statementIndex = stateManager.getValue('f.current_statement_index');
        
        const testimonyData = activeScene.cache.json.get(testimonyId);
        // データ取得の安全性チェック
        if (!testimonyData || !testimonyData.statements) {
            console.error(`[GameFlowManager] Testimony data not found for ID: ${testimonyId}`);
            EngineAPI.fireGameFlowEvent('NO_SELECTION'); // 安全策
            break;
        }

        const statement = testimonyData.statements[statementIndex];
        const correctEvidence = statement ? statement['correct_evidence'] : undefined;
        
        console.log(`[GameFlowManager] Judging... Selected: ${selectedEvidence}, Correct: ${correctEvidence}`);

        if (selectedEvidence === correctEvidence) {
            console.log("[GameFlowManager] Result: CORRECT");
            EngineAPI.fireGameFlowEvent('CORRECT_ANSWER');
        } else {
            console.log("[GameFlowManager] Result: WRONG");
            EngineAPI.fireGameFlowEvent('WRONG_ANSWER');
        }
    }
    
    // 判定後は選択済み証拠品をリセット
    stateManager.setF('selected_evidence', null);
    break;
}

            case 'resumeScene': {
    const sceneToResume = EngineAPI.activeGameSceneKey;
    if (sceneToResume) {
        console.log(`[GameFlowManager] Resuming scene: ${sceneToResume}`);
        
        // ★★★ 修正: await を削除し、直接 SystemScene のメソッドを呼ぶ ★★★
        // EngineAPI.requestSafeResume は待機しすぎてしまう可能性があるため回避
        const systemScene = EngineAPI.systemScene;
        if (systemScene) {
            systemScene.scene.resume(sceneToResume);
        }
        
    } else {
        console.warn('[GameFlowManager] resumeScene: No active scene to resume.');
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
                const soundManager = EngineAPI.systemScene?.registry.get('soundManager');
                if (soundManager && action.params.key) {
                    // ★ 新しい「撃ちっぱなし」メソッドを呼び出す
                    soundManager.playBgmFireAndForget(action.params.key, action.params.volume);
                }
                break;
            }
            }
        }
    }

}