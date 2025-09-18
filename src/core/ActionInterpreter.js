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
    async run(source, eventData, collidedTarget = null) {
        if (!source || !source.scene || !source.scene.scene.isActive()) return;
        if (!eventData || !eventData.nodes || eventData.nodes.length === 0) return;

        // ★ 実行のたびに、現在のコンテキストをプロパティに設定
        this.scene = source.scene;
        this.currentSource = source;
        this.currentTarget = collidedTarget;

        const { nodes, connections } = eventData;
        const allTargetNodeIds = new Set((connections || []).map(c => c.toNode));
        let currentNodeData = nodes.find(n => !allTargetNodeIds.has(n.id));

        while (currentNodeData) {
            const handler = this.tagHandlers[currentNodeData.type];
            if (handler) {
                // ★ findTargetに、必要なコンテキストをすべて渡す
                const finalTarget = this.findTarget(currentNodeData.params.target, this.scene, source, collidedTarget);
                // ★ ハンドラにも、interpreter(this)を渡す
                await handler(this, currentNodeData.params, finalTarget);
            }

            const connection = (connections || []).find(c => c.fromNode === currentNodeData.id);
            currentNodeData = connection ? nodes.find(n => n.id === connection.toNode) : null;
        }
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