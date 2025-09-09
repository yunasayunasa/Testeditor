
/**
 * [anim_frame name=... frame=...] アクションタグ
 * 対象オブジェクトを指定されたアニメーションの特定フレームで静止させる。
 */
export default async function animFrame(interpreter, target, params) {
    if (!target || typeof target.setFrame === 'undefined') {
        console.warn(`[anim_frame] Target '${target.name}' cannot set a frame.`);
        return;
    }

    const animKey = params.name;
    const frameNumber = parseInt(params.frame, 10);

    if (!animKey || isNaN(frameNumber)) {
        console.warn('[anim_frame] "name" and "frame" parameters are required.');
        return;
    }

    // PhaserのAnimationManagerから、アニメーションの定義データを取得
    const anim = interpreter.scene.anims.get(animKey);
    if (!anim || !anim.frames[frameNumber]) {
        console.warn(`[anim_frame] Animation or frame not found. animKey: '${animKey}', frameNumber: ${frameNumber}`);
        return;
    }
    
    // 目的のフレームオブジェクトを取得
    const frame = anim.frames[frameNumber];
    
    // ★ オブジェクトのテクスチャとフレームを、直接設定する
    target.setTexture(frame.textureKey, frame.textureFrame);
    console.log(`[anim_frame] Set '${target.name}' to frame ${frameNumber} of '${animKey}'`);
}