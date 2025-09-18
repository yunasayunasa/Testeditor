// src/core/ActionInterpreter.js (新規作成)

import { eventTagHandlers } from '../handlers/events/index.js';

export default class ActionInterpreter {
    constructor(scene) {
         this.scene = scene; // ★ シーンへの参照を保持
        this.tagHandlers = eventTagHandlers;
         this.currentSource = null;
        this.currentTarget = null;
    }

  
    /**
     * ★★★ VSL対応版 ★★★
     * イベントデータに基づいて、ノードグラフを実行する
     * @param {Phaser.GameObjects.GameObject} source - イベントを発生させたオブジェクト
     * @param {object} eventData - 単一のイベント定義 ({ trigger, nodes, connections })
     * @param {Phaser.GameObjects.GameObject} [collidedTarget=null] - 衝突イベントの相手
     */
    async run(source, eventData, collidedTarget = null) {
        if (!source || !source.scene || !source.scene.scene.isActive()) return;
        if (!eventData || !eventData.nodes || eventData.nodes.length === 0) return;

        this.currentSource = source;
        this.currentTarget = collidedTarget;

        const { nodes, connections } = eventData;

        // --- 1. 開始ノードを探す ---
        // (入力ピンに何も接続されていないノードが開始点)
        const allTargetNodeIds = new Set((connections || []).map(c => c.toNode));
        let currentNodeData = nodes.find(n => !allTargetNodeIds.has(n.id));

        // --- 2. 実行ループ ---
        while (currentNodeData) {
            console.log(`%c[ActionInterpreter] Executing node: [${currentNodeData.type}]`, 'color: yellow;');
            if (currentNodeData.type === 'return_novel') {
            console.log(`%c[LOG BOMB 1] ActionInterpreter:これから [return_novel] を実行します。Source: ${this.currentSource.name}, Scene: ${this.scene.scene.key}`, "color: orange; font-weight: bold;");
        }
            const handler = this.tagHandlers[currentNodeData.type];
            if (handler) {
                const finalTarget = this.findTarget(currentNodeData.params.target, source, collidedTarget);

                // ★ ハンドラに、interpreter(this), params, target を渡して実行
                await handler(this, currentNodeData.params, finalTarget);
            }

            // --- 3. 次のノードを探す ---
            const connection = (connections || []).find(c => c.fromNode === currentNodeData.id);
            if (connection) {
                currentNodeData = nodes.find(n => n.id === connection.toNode);
            } else {
                currentNodeData = null; // 次の接続がなければ、ループ終了
            }
        }
        
        console.log("[ActionInterpreter] Event sequence finished.");
    }

    /**
     * ★★★ VSL対応版 ★★★
     * ターゲット文字列から、実際のGameObjectを見つけ出す
     */
    findTarget(targetId, source, collidedTarget) {
        if (!targetId || targetId === 'self' || targetId === 'source') {
            return source;
        }
        if (targetId === 'other' || targetId === 'target') {
            return collidedTarget;
        }
        // それ以外は、シーンから名前で検索
        return this.scene.children.getByName(targetId);
    }

    /**
     
     * タグ文字列をパースして、タグ名とパラメータのオブジェクトを返す
     * @param {string} tagString - '[tagName key1=value1 key2="value with space"]' のようなタグ文字列
     * @returns {{tagName: string, params: object}}
     */
    parseTag(tagString) {
        // 1. タグの最初と最後の角括弧 '[' ']' を取り除く
        const content = tagString.slice(1, -1).trim();

        // 2. 正規表現を使って、タグ名とパラメータ部分を安全に分割する
        //    正規表現: /\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/
        //    意味: クォーテーションの外側にあるスペースで分割する
        const parts = content.split(/\s+(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/);
        
        // 3. 最初の部分がタグ名
        const tagName = parts.shift();
        const params = {};
        
        // 4. 残りの部分をループして、パラメータを解析
        parts.forEach(part => {
            const eqIndex = part.indexOf('=');
            if (eqIndex > -1) {
                const key = part.substring(0, eqIndex);
                let value = part.substring(eqIndex + 1);

                // 5. 値が '"' または "'" で囲まれていれば、それを取り除く
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                
                params[key] = value;
            }
        });
        
        return { tagName, params };
    }
}
