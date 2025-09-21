/**
 * [move_to_target]タグ
 * sourceオブジェクトをターゲットオブジェクトに向かって移動させる
 */
export default move_to_target = async (interpreter, params) => {
    const scene = interpreter.scene;
    const source = interpreter.currentSource;
    const target = interpreter.findTarget(params.target, scene, source, interpreter.currentTarget);
    const speed = parseFloat(params.speed) || 1;

    if (!source || !target || !source.body) {
        return; // 物理ボディがないと動かせない
    }

    // ターゲットへの方向ベクトルを計算
    const directionX = target.x - source.x;
    const directionY = target.y - source.y;

    // ベクトルを正規化（長さを1にする）
    const vec = new Phaser.Math.Vector2(directionX, directionY).normalize();

    // 速度を適用
    source.setVelocity(vec.x * speed, vec.y * speed);
};

/**
 * VSLエディタ用の定義
 */
move_to_target.define = {
    description: "ターゲットオブジェクトに向かって、指定された速度で移動します。(物理ボディ必須)",
    params: [
        { key: "target", type: "string", label: "目標", defaultValue: "player" },
        { key: "speed", type: "number", label: "速度", defaultValue: 2 }
    ]
};