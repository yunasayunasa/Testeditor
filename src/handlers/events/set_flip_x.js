
/**
 * [set_flip_x value=true/false] アクションタグ
 * 対象オブジェクトの左右反転(flipX)を設定する。
 */
export default async function setFlipX(interpreter, params, target) {
    if (target && typeof target.setFlipX === 'function') {
        const shouldFlip = (params.value === 'true');
        target.setFlipX(shouldFlip);
    } else {
        console.warn(`[set_flip_x] Target '${target.name}' cannot be flipped.`);
    }
}