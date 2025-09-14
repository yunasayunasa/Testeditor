// src/core/ActionInterpreter.js (新規作成)

import { eventTagHandlers } from '../handlers/events/index.js';

export default class ActionInterpreter {
    constructor(scene) {
        
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
 // in ActionInterpreter.js run()

  async run(source, actionsString, collidedTarget = null) {
    if (!source || !source.scene || !source.scene.scene.isActive()) {
        return;
    }
    this.scene = source.scene; // ★ 実行時のシーンをプロパティとして保持
    this.gameObject = source; // ★ self もプロパティとして保持
    this.targetObject = collidedTarget; // ★ other もプロパティとして保持

    const tags = actionsString.match(/\[(.*?)\]/g) || [];

    for (const tagString of tags) {
        try {
            const { tagName, params } = this.parseTag(tagString);
            
            // ★ findTarget ヘルパーメソッドを新設して、ターゲット解決を任せる
            const finalTarget = this.findTarget(params.target);

            if (!finalTarget) {
                console.warn(`[ActionInterpreter] Target not found: '${params.target}' for tag [${tagName}]`);
                continue;
            }
            
            const handler = this.tagHandlers[tagName];
            if (handler) {
                // ▼▼▼【ここが核心の修正です】▼▼▼
                // ハンドラには、シーンではなく、ActionInterpreterのインスタンス自身(this)を渡す。
                // これにより、ハンドラは interpreter.scene や interpreter.gameObject を参照できる。
                await handler(this, params, finalTarget);
            } else {
                console.warn(`[ActionInterpreter] Unknown action tag: ${tagName}`);
            }
        } catch (error) {
            console.error(`[ActionInterpreter] Error running action: ${tagString}`, error);
        }
    }
}

    /**
     * ★★★ 新規ヘルパーメソッド ★★★
     * ターゲット文字列から、実際のGameObjectを見つけ出す
     * @param {string} targetId - "self", "other", またはオブジェクト名
     * @returns {Phaser.GameObjects.GameObject | null}
     */
    findTarget(targetId) {
        if (!targetId || targetId === 'self') {
            return this.gameObject; // self
        }
        if (targetId === 'other') {
            return this.targetObject; // other
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
