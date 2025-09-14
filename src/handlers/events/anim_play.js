/**
 * [anim_play name=...] タグの処理
 * 対象オブジェクトのアニメーションを再生する
 */
export default function handleAnim(interpreter, params, target) {
    if (target && typeof target.play === 'function') {
        const animKey = params.name;
        if (animKey) {
            target.play(animKey);
            console.log(`[handleAnimPlay] Playing animation '${animKey}' on '${target.name}'`);
        } else {
            console.warn(`[anim_play] 'name' parameter is missing.`);
        }
    } else {
        console.warn(`[anim_play] Target '${target.name}' is not a Sprite or cannot play animations.`);
    }
}
