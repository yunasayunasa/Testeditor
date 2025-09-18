// src/handlers/events/anim_play.js

/**
 * [anim_play] アクションタグ
 * ターゲットのスプライトアニメーションを再生します。
 * @param {ActionInterpreter} interpreter
 * @param {object} params
 * @param {Phaser.GameObjects.Sprite} target
 */
export default async function anim_play(interpreter, params, target) {
    if (target && typeof target.play === 'function') {
        const animKey = params.name;
        if (animKey) {
            target.play(animKey);
        } else {
            console.warn(`[anim_play] 'name' parameter is missing for target '${target.name}'.`);
        }
    } else {
        const targetName = target ? target.name : 'unknown';
        console.warn(`[anim_play] Target '${targetName}' is not a valid Sprite.`);
    }
}

/**
 * ★ VSLエディタ用の自己定義 ★
 */
anim_play.define = {
    description: 'スプライトの特定のアニメーションを再生します。',
    params: [
        {
            key: 'name',
            type: 'string',
            label: 'アニメーション名',
            defaultValue: ''
        }
    ]
};