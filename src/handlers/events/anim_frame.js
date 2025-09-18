// src/handlers/events/anim_frame.js

/**
 * [anim_frame] アクションタグ
 * ターゲットを、指定されたスプライトシートアニメーションの特定フレームで静止させます。
 * @param {ActionInterpreter} interpreter
 * @param {object} params
 * @param {Phaser.GameObjects.Sprite} target - 適用対象のスプライト
 */
export default async function anim_frame(interpreter, params, target) {
    // --- ガード節: ターゲットが有効か、フレームを設定できるオブジェクトかを確認 ---
    if (!target || typeof target.setTexture !== 'function' || typeof target.setFrame !== 'function') {
        const targetName = target ? target.name : 'unknown';
        console.warn(`[anim_frame] Target '${targetName}' is not a valid Sprite or cannot set a frame.`);
        return;
    }

    // --- パラメータの取得と検証 ---
    const animKey = params.name;
    const frameNumber = parseInt(params.frame, 10);

    if (!animKey || isNaN(frameNumber)) {
        console.warn('[anim_frame] "name" (アニメーション名) and "frame" (フレーム番号) parameters are required.');
        return;
    }

    // --- アニメーションデータの取得 ---
    const anim = interpreter.scene.anims.get(animKey);
    if (!anim) {
        console.warn(`[anim_frame] Animation with key '${animKey}' not found.`);
        return;
    }
    if (!anim.frames[frameNumber]) {
        console.warn(`[anim_frame] Frame number ${frameNumber} is out of bounds for animation '${animKey}'.`);
        return;
    }
    
    // --- 実行 ---
    const frame = anim.frames[frameNumber];
    
    // ★ ターゲットのテクスチャとフレームを、取得したデータで設定する
    target.setTexture(frame.textureKey, frame.textureFrame);

    console.log(`[anim_frame] Set '${target.name}' to frame ${frameNumber} of animation '${animKey}'`);
}

/**
 * ★ VSLエディタ用の自己定義 ★
 */
anim_frame.define = {
    description: 'スプライトを、特定のアニメーションの指定フレームで静止させます。',
    params: [
        {
            key: 'name',
            type: 'string', // 将来的にはシーンに登録済みのアニメーションキーをリスト表示したい
            label: 'アニメーション名',
            defaultValue: ''
        },
        {
            key: 'frame',
            type: 'number',
            label: 'フレーム番号',
            defaultValue: 0
        }
    ]
};