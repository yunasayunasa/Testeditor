// src/core/ActionInterpreter.js (新規作成)

import { eventTagHandlers } from '../handlers/events/index.js';

export default class ActionInterpreter {
    constructor(scene) {
        this.scene = scene;
        this.tagHandlers = eventTagHandlers;
         this.currentSource = null;
        this.currentTarget = null;
    }

  
    /**
     * アクションを解釈・実行する (ターゲット解決機能付き)
     * @param {Phaser.GameObjects.GameObject} source - イベントを定義したオブジェクト
     * @param {string} actionsString - アクション文字列
     * @param {Phaser.GameObjects.GameObject} [collidedTarget=null] - 衝突イベントの相手
     */
     async run(source, actionsString, collidedTarget = null) {
        // ★★★ 実行開始時に、コンテキストを保存する ★★★
        this.currentSource = source;
        this.currentTarget = collidedTarget;

        const tags = actionsString.match(/\[(.*?)\]/g) || [];

        for (const tagString of tags) {
            try {
                const { tagName, params } = this.parseTag(tagString);
                
                let finalTarget = source;
                if (params.target) {
                    if (params.target === 'self') {
                        finalTarget = source;
                    } else if (params.target === 'other' && collidedTarget) {
                        finalTarget = collidedTarget;
                    } else {
                        finalTarget = this.scene.children.getByName(params.target);
                    }
                }
                
                if (!finalTarget) {
                    console.warn(`[ActionInterpreter] Target not found: '${params.target}'`);
                    continue;
                }
                
                const handler = this.tagHandlers[tagName];
                if (handler) {
                    // ★★★ ハンドラには、これまで通り解決済みのfinalTargetを渡す ★★★
                    await handler(this, finalTarget, params);
                } else {
                    console.warn(`[ActionInterpreter] Unknown action tag: ${tagName}`);
                }
            } catch (error) {
                console.error(`[ActionInterpreter] Error running action: ${tagString}`, error);
            }
        }
        
        // ★★★ 実行終了後に、コンテキストをクリアする ★★★
        this.currentSource = null;
        this.currentTarget = null;
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
