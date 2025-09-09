
/**
 * [anim_stop] アクションタグ
 * 対象オブジェクトの現在のアニメーションを停止させる。
 */
export default async function animStop(interpreter, target, params) {
    // targetが 'stop' メソッドを持っているか確認 (Spriteオブジェクトなら持っている)
    if (target && typeof target.stop === 'function') {
        target.stop();
        console.log(`[anim_stop] Animation stopped on '${target.name}'`);
    } else {
        console.warn(`[anim_stop] Target '${target.name}' cannot stop animation.`);
    }
}