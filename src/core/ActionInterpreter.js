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
        let nextPinName = 'output'; // デフォルトの出力ピン

        if (handler) {
            const params = currentNodeData.params || {};
            
            // ▼▼▼【ここからがハンドラ呼び出しの修正】▼▼▼
            // --- ターゲットオブジェクトを解決 ---
            const finalTarget = this.findTarget(params.target, this.scene, this.currentSource, this.currentTarget);
            
            // --- 戻り値を受け取るための変数 ---
            let handlerResult;

            // --- ハンドラのタイプに応じて呼び出し方を切り替える ---
            if (currentNodeData.type === 'if' || currentNodeData.type === 'distance_check' || currentNodeData.type === 'timer_check') {
                // [if]や[distance_check]のような、ピンを分岐させる特殊なタグ
                // (ifタグのロジックは、ここに直接書いても良いし、ハンドラに任せても良い)
                handlerResult = await handler(this, params, finalTarget);

            } else if (currentNodeData.type === 'destroy') {
                 // [destroy]のような、特別なコンテキストを必要とするタグ
                const context = { source: this.currentSource, target: this.currentTarget };
                handlerResult = await handler(this, params, finalTarget, context);

            } else {
                // その他のほとんどの汎用タグ (apply_force, anim_play など)
                handlerResult = await handler(this, params, finalTarget);
            }

            // --- ハンドラの戻り値に応じて、次に進むピンを決定 ---
            if (typeof handlerResult === 'string') {
                nextPinName = handlerResult;
            }
            // ▲▲▲【ここまでがハンドラ呼び出しの修正】▲▲▲
        }

        const connection = (connections || []).find(c => 
            c.fromNode === currentNodeData.id && c.fromPin === nextPinName
        );

        if (connection) {
            currentNodeData = nodes.find(n => n.id === connection.toNode);
        } else {
            currentNodeData = null; 
        }
    }
}

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