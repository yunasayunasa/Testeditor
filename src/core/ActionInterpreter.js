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
    async run(source, eventData, collidedTarget = null) {
        if (!source || !source.scene || !source.scene.scene.isActive()) return;
        if (!eventData || !eventData.nodes || eventData.nodes.length === 0) return;

        this.scene = source.scene;
        this.currentSource = source;
        this.currentTarget = collidedTarget;

        const { nodes, connections } = eventData;
        if (!connections || connections.length === 0) {
             console.warn("[ActionInterpreter] Event has nodes but no connections. Cannot determine execution flow.");
             return;
        }

        const allTargetNodeIds = new Set(connections.map(c => c.toNode));
        let currentNodeData = nodes.find(n => !allTargetNodeIds.has(n.id));
        
        if (!currentNodeData) {
            console.warn("[ActionInterpreter] No starting node found.");
            return;
        }

        while (currentNodeData) {
            console.log(`%c[ActionInterpreter] Executing node: [${currentNodeData.type}]`, 'color: yellow;');
            
            const handler = this.tagHandlers[currentNodeData.type];
            let nextPinName = 'output'; // デフォルトの出力ピン名

            if (handler) {
                // ▼▼▼【ここからが [if] の特別処理です】▼▼▼
                // --------------------------------------------------------------------
                if (currentNodeData.type === 'if') {
                    const expression = currentNodeData.params.exp;
                    let result = false;
                    try {
                        // ゲーム変数(f)とシステム変数(sf)を式のスコープ内で使えるようにする
                        const f = this.scene.stateManager.f;
                        const sf = this.scene.stateManager.sf;
                        // evalを安全に使うための定型句
                        result = Function('f', 'sf', `return ${expression}`)(f, sf);
                    } catch (e) {
                        console.error(`[ActionInterpreter] Error evaluating [if] expression: "${expression}"`, e);
                        result = false; // エラー時はfalseとして扱う
                    }
                    
                    // 評価結果に応じて、次に進むべきピン名を決定
                    nextPinName = result ? 'output_true' : 'output_false';
                    console.log(`  > Expression evaluated to ${result}. Next pin: ${nextPinName}`);

                } 
                // --------------------------------------------------------------------
                // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
                else {
                    // [if]以外の通常のタグを実行
                    const finalTarget = this.findTarget(currentNodeData.params.target, source, collidedTarget);
                    await handler(this, currentNodeData.params, finalTarget);
                }
            }

            // --- 決定されたピン名を使って、次のノードを探す ---
            const connection = connections.find(c => 
                c.fromNode === currentNodeData.id && c.fromPin === nextPinName
            );

            if (connection) {
                currentNodeData = nodes.find(n => n.id === connection.toNode);
            } else {
                // [if]のFalseルートがどこにも接続されていない場合など、ここで正常に終了する
                console.log(`  > No connection found from pin: ${nextPinName}. Sequence finished.`);
                currentNodeData = null; 
            }
        }
        
        console.log("%c[ActionInterpreter] Event sequence finished.", 'color: lightgreen;');
    }
    /**
     * ★★★ グローバルサービス版 ★★★
     */
    findTarget(targetId, scene, source, collidedTarget) {
        if (!targetId || targetId === 'self' || targetId === 'source') {
            return source;
        }
        if (targetId === 'other' || targetId === 'target') {
            return collidedTarget;
        }
        return scene.children.getByName(targetId);
    }
}