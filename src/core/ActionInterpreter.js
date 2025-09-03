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
