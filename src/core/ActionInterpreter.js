// src/core/ActionInterpreter.js

// ▼▼▼【ここのimport文を、以下の内容に完全に置き換えてください】▼▼▼

// --- 1. gameplay/index.js (または events/index.js) からインポート ---
//    'export const eventTagHandlers' という形式を想定
import { eventTagHandlers } from '../handlers/events/index.js';

// --- 2. system/index.js からインポート ---
//    'export const tagHandlers' という形式を想定
import { tagHandlers as systemTagHandlers } from '../handlers/system/index.js';

// --- 3. scenario/index.js からインポート ---
import { tagHandlers as scenarioTagHandlers } from '../handlers/index.js';

export default class ActionInterpreter {
    constructor(game) {
        this.game = game;
        
       this.tagHandlers = {
            ...(eventTagHandlers || {}),
            ...(systemTagHandlers || {}),
            ...(scenarioTagHandlers || {}) // ★ シナリオタグもマージ
        };

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
      
    // パラメータやコンテキスト情報をログに出力
  
    if(this.currentTarget);
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
 console.groupEnd();
        if (connection) {
            currentNodeData = nodes.find(n => n.id === connection.toNode);
        } else {
            currentNodeData = null; 
        }
    }}
// in src/core/ActionInterpreter.js

// ... (constructor や run メソッドは変更なし) ...

/**
 * ★★★ 'player'検索を高速化するキャッシュ機能付き・最終FIX版 ★★★
 * 指定されたIDに基づいて、シーンからターゲットとなるGameObjectを検索して返す。
 * @param {string} targetId - 検索するID ('player', 'source', 'target', またはオブジェクト名)
 * @param {Phaser.Scene} scene - 検索対象のシーン
 * @param {Phaser.GameObjects.GameObject} source - イベントの発生源オブジェクト
 * @param {Phaser.GameObjects.GameObject} collidedTarget - 衝突イベントの相手オブジェクト
 * @returns {Phaser.GameObjects.GameObject | null} 見つかったGameObject、またはnull
 */
findTarget(targetId, scene, source, collidedTarget) {
    // 1. 特殊なIDを先に処理する ('source', 'self', 'target')
    if (!targetId || targetId === 'source' || targetId === 'self') {
        return source;
    }
    if (targetId === 'target') {
        return collidedTarget;
    }

    // ▼▼▼【ここがパフォーマンス改善の核心です】▼▼▼
    // --------------------------------------------------------------------
    // 2. 'player' が指定された場合の特別高速化処理
    if (targetId === 'player') {
        // a) シーンにプレイヤーのキャッシュが存在し、かつそのオブジェクトがまだ有効かチェック
        //    (シーン遷移後などに古いキャッシュを使わないようにするため)
        if (scene._playerCache && scene._playerCache.scene === scene && scene._playerCache.active) {
            // 有効なキャッシュがあれば、検索せずに即座に返す
            return scene._playerCache;
        }

        // b) キャッシュがない、または無効な場合のみ、通常の名前検索を実行
        const playerObject = scene.children.getByName('player');

        if (playerObject) {
            // c) 見つかったplayerオブジェクトを、シーンのカスタムプロパティとして保存（キャッシュ）
            scene._playerCache = playerObject;
          
        }
        
        return playerObject;
    }
    // --------------------------------------------------------------------
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    // 3. 'player' 以外の、すべての通常オブジェクトの名前検索
    return scene.children.getByName(targetId);
}

// src/core/ActionInterpreter.js (クラス内のどこか)

/**
 * ★★★ 新設 ★★★
 * VSLのタグオブジェクト({ type, params })を直接受け取って実行する。
 * game_flow.json からの実行に使われる。
 * @param {object} vslData - { type: "タグ名", params: { ... } }
 */
async runVSLFromData(vslData) {
    if (!vslData || !vslData.type) return;

    const handler = this.tagHandlers[vslData.type];
    if (handler) {
        try {
            // SystemSceneから呼ばれる場合、特定のGameObjectコンテキストはないので、
            // interpreterの第一引数(コンテキスト)はnullで良い。
            // interpreter.sceneはSystemSceneへの参照を持つようにする。
            const systemScene = this.game.scene.getScene('SystemScene');
            const tempInterpreterContext = { scene: systemScene, stop: () => {} };

            await handler(tempInterpreterContext, vslData.params || {});

        } catch (e) {
            console.error(`[ActionInterpreter] Error executing VSL data:`, vslData, e);
        }
    } else {
        console.warn(`[ActionInterpreter] Unknown VSL type in data: '${vslData.type}'`);
    }
}

}

