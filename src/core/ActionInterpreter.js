// src/core/ActionInterpreter.js (新規作成)

import { eventTagHandlers } from '../handlers/events/index.js';

export default class ActionInterpreter {
    constructor(scene) {
        this.scene = scene;
        this.tagHandlers = eventTagHandlers;
    }

    /**
     * オブジェクトと、実行すべきアクション文字列を受け取り、解釈・実行する
     * @param {Phaser.GameObjects.GameObject} target - アクションの対象となるオブジェクト
     * @param {string} actionsString - '[tag1][tag2]...' のようなアクション文字列
     */
    async run(target, actionsString) {
        // 文字列を、個々のタグに分割
        const tags = actionsString.match(/\[(.*?)\]/g) || [];

        for (const tagString of tags) {
            try {
                // タグをパースして、タグ名とパラメータを取得
                const { tagName, params } = this.parseTag(tagString);
                
                const handler = this.tagHandlers[tagName];
                if (handler) {
                    // await で、[tween]のような時間のかかる処理の完了を待つ
                    await handler(this, target, params);
                } else {
                    console.warn(`[ActionInterpreter] Unknown action tag: ${tagName}`);
                }
            } catch (error) {
                console.error(`[ActionInterpreter] Error running action: ${tagString}`, error);
            }
        }
    }

    /**
     * タグ文字列をパースして、タグ名とパラメータのオブジェクトを返す
     * (これはScenarioManagerのロジックを簡略化したもの)
     */
    parseTag(tagString) {
        const content = tagString.slice(1, -1);
        const parts = content.split(/\s+/);
        const tagName = parts.shift();
        const params = {};
        parts.forEach(part => {
            const [key, value] = part.split('=');
            if (value !== undefined) {
                // " " で囲まれた値をクリーンにする
                params[key] = value.replace(/"/g, '');
            }
        });
        return { tagName, params };
    }
}