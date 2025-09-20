// src/core/ActionInterpreter.js (グローバルサービス版)

import { eventTagHandlers } from '../handlers/events/index.js';

export default class ActionInterpreter {
    constructor(game) { // ★ Phaser.Game のインスタンスを受け取る
        this.game = game;
        this.tagHandlers = eventTagHandlers;
        
        // ★ 実行のたびに更新されるプロパティ
        this.scene = null;
        this.currentSource = null;
        this.currentTarget = null;
    }

    /**
     * ★★★ グローバルサービス版 ★★★
     * @param {Phaser.GameObjects.GameObject} source - イベントを発生させたオブジェクト
     * @param {object} eventData - 単一のイベント定義 ({ trigger, nodes, connections })
     * @param {Phaser.GameObjects.GameObject} [collidedTarget=null] - 衝突イベントの相手
     */
   /**
     * ★★★ VSL実行エンジン - 完成版 ★★★
     * イベントデータに基づいて、ノードグラフを「接続順に」実行する
     */
    // in src/core/ActionInterpreter.js

    /**
     * ★★★ [if]分岐ロジック対応版 ★★★
     * イベントデータに基づいて、ノードグラフを「接続順に」実行する
     * @param {Phaser.GameObjects.GameObject} source - イベントを発生させたオブジェクト
     * @param {object} eventData - 単一のイベント定義 ({ trigger, nodes, connections })
     * @param {Phaser.GameObjects.GameObject} [collidedTarget=null] - 衝突イベントの相手
     */
 // in src/core/ActionInterpreter.js

    async run(source, eventData, collidedTarget = null) {
        if (!source || !source.scene || !source.scene.scene.isActive()) return;
        if (!eventData || !eventData.nodes || eventData.nodes.length === 0) return;

        this.scene = source.scene;
        this.currentSource = source;
        this.currentTarget = collidedTarget;
        
        // ▼▼▼【ここが修正の核心です】▼▼▼
        const stateManager = this.scene.registry.get('stateManager');
        if (!stateManager) {
            console.error("[ActionInterpreter] StateManager not found in scene registry!");
            return;
        }
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        const { nodes, connections } = eventData;
        
        const allTargetNodeIds = new Set((connections || []).map(c => c.toNode));
        let currentNodeData = nodes.find(n => !allTargetNodeIds.has(n.id));
        
        if (!currentNodeData) {
            console.warn("[ActionInterpreter] No starting node found.");
            return;
        }

        while (currentNodeData) {
            console.log(`%c[ActionInterpreter] Executing node: [${currentNodeData.type}]`, 'color: yellow;');
            
            const handler = this.tagHandlers[currentNodeData.type];
            let nextPinName = 'output';

           if (handler) {
                if (currentNodeData.type === 'if') {
                    // ▼▼▼【ここが修正の核心です】▼▼▼
                    // --------------------------------------------------------------------
                    let expression = currentNodeData.params.exp;
                    let result = false;
                    
                    try {
                        // ステップ1: HTMLエンティティのデコード
                        const tempElem = document.createElement('textarea');
                        tempElem.innerHTML = expression;
                        let decodedExpression = tempElem.value;

                        // ステップ2: 式が " " または ' ' で囲まれていたら、それを取り除く
                        if ((decodedExpression.startsWith('"') && decodedExpression.endsWith('"')) ||
                            (decodedExpression.startsWith("'") && decodedExpression.endsWith("'"))) {
                            decodedExpression = decodedExpression.substring(1, decodedExpression.length - 1);
                        }

                        // ステップ3: クリーニングした式を、StateManagerのシンプルなevalに渡す
                        result = stateManager.eval(decodedExpression);

                    } catch (e) {
                        // このtry-catchは、主にデコード処理中のエラーを捕捉するためのもの
                        console.error(`[ActionInterpreter] Failed to clean/prepare expression: "${expression}"`, e);
                        result = false;
                    }
                    // --------------------------------------------------------------------
                    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
                    
                    nextPinName = result ? 'output_true' : 'output_false';
                    console.log(`  > Expression "${expression}" evaluated to ${result}. Next pin: ${nextPinName}`);

                } else {
                    // [if]以外のタグの処理 (以前の destroy 修正を適用)
                    const context = {
                        source: this.currentSource,
                        target: this.currentTarget
                    };
                    await handler(this, currentNodeData.params, context);
                }
            }

            const connection = (connections || []).find(c => 
                c.fromNode === currentNodeData.id && c.fromPin === nextPinName
            );

            if (connection) {
                currentNodeData = nodes.find(n => n.id === connection.toNode);
            } else {
                console.log(`  > No connection found from pin: ${nextPinName}. Sequence finished.`);
                currentNodeData = null; 
            }
        }
        
        console.log("%c[ActionInterpreter] Event sequence finished.", 'color: lightgreen;');
    }
   // in src/core/ActionInterpreter.js

    findTarget(targetId, scene, source, collidedTarget) {
        // デフォルトは source (イベント発生源)
        if (!targetId || targetId === 'source') {
            return source;
        }
        // 'target' は明確に衝突相手などを指す
        if (targetId === 'target') {
            return collidedTarget;
        }
        // 'self' は後方互換性のために残すが、source と同じ
        if (targetId === 'self') {
            return source;
        }
        // それ以外は名前で検索
    
    

        // ▼▼▼【ここが最重要のデバッグログです】▼▼▼
        console.log(`%c[DEBUG | findTarget] が呼ばれました。`, 'background: #222; color: #bada55');
        console.log(`  > targetId: '${targetId}'`);
        console.log(`  > source: '${source ? source.name : 'null'}'`);
        console.log(`  > collidedTarget: '${collidedTarget ? collidedTarget.name : 'null'}'`);
        console.log(`  > 最終的に返すオブジェクト: '${result ? result.name : 'null'}'`);
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        return result; // ★ 最後に結果を返す
    }
}