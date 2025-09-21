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
// in src/core/ActionInterpreter.js
async run(source, eventData, collidedTarget = null) {
    if (!source || !source.scene || !source.scene.scene.isActive()) return;
    if (!eventData || !eventData.nodes || eventData.nodes.length === 0) return;

    this.scene = source.scene;
    this.currentSource = source;
    this.currentTarget = collidedTarget;
    
    const stateManager = this.scene.registry.get('stateManager');
    if (!stateManager) {
        console.error("[ActionInterpreter] StateManager not found in scene registry!");
        return;
    }

    const { nodes, connections } = eventData;
    
    const allTargetNodeIds = new Set((connections || []).map(c => c.toNode));
    let currentNodeData = nodes.find(n => !allTargetNodeIds.has(n.id));
    
    if (!currentNodeData) return;

    while (currentNodeData) {
        console.log(`%c[ActionInterpreter] Executing node: [${currentNodeData.type}]`, 'color: yellow;');
        
        const handler = this.tagHandlers[currentNodeData.type];
        let nextPinName = 'output';

        if (handler) {
            const params = currentNodeData.params || {};
            
            if (currentNodeData.type === 'if') {
                // [if] タグは特別扱い
                let expression = params.exp || 'false';
                let result = false;
                try {
                    const tempElem = document.createElement('textarea');
                    tempElem.innerHTML = expression;
                    let decodedExpression = tempElem.value;
                    if ((decodedExpression.startsWith('"') && decodedExpression.endsWith('"')) || (decodedExpression.startsWith("'") && decodedExpression.endsWith("'"))) {
                        decodedExpression = decodedExpression.substring(1, decodedExpression.length - 1);
                    }
                    result = stateManager.eval(decodedExpression);
                } catch (e) {
                    console.error(`[ActionInterpreter] Failed to evaluate expression: "${expression}"`, e);
                    result = false;
                }
                
                nextPinName = result ? 'output_true' : 'output_false';
                console.log(`  > Expression "${expression}" evaluated to ${result}. Next pin: ${nextPinName}`);

            } else {
                // ▼▼▼【ここが変数名修正箇所】▼▼▼
                // --- その他の全てのタグ ---
                
                // 1. [tag target="..."]で指定されたオブジェクトを解決する
                const target = this.findTarget(params.target, this.scene, this.currentSource, this.currentTarget);
                
                // 2. ハンドラを呼び出す
                const handlerResult = await handler(
                    this,            // 第1引数: interpreter
                    params,          // 第2引数: params
                    target,          // 第3引数: target (解決済みのGameObject)
                    {                // 第4引数: context (追加情報)
                        source: this.currentSource,
                        target: this.currentTarget
                    }
                );
                // ▲▲▲【ここまでが変数名修正箇所】▲▲▲

                if (typeof handlerResult === 'string') {
                    nextPinName = handlerResult;
                }
            }
        }

        const connection = (connections || []).find(c => 
            c.fromNode === currentNodeData.id && c.fromPin === nextPinName
        );

        if (connection) {
            currentNodeData = nodes.find(n => n.id === connection.toNode);
        } else {
            currentNodeData = null; 
        }
    }}

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