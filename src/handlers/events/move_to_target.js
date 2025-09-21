// src/handlers/events/move_to_target.js

/**
 * [move_to_target]タグ ... (コメントはそのまま)
 */
export default async function move_to_target(interpreter, params) {
    const scene = interpreter.scene;
    const source = interpreter.currentSource;
    const target = interpreter.findTarget(params.target, scene, source, interpreter.currentTarget);
    const speed = parseFloat(params.speed) || 1;

    if (!source || !target || !source.body) {
        console.warn(`[move_to_target] 対象'${source.name}'に物理ボディがないため、移動できません。`);
        return;
    }

    const directionX = target.x - source.x;
    const directionY = target.y - source.y;

    const vec = new Phaser.Math.Vector2(directionX, directionY);
    if (vec.length() > 0) {
        vec.normalize();
    }

    source.setVelocity(vec.x * speed, vec.y * speed);
};

move_to_target.define = {
    description: "ターゲットオブジェクトに向かって、指定された速度で移動します。(物理ボディ必須)",
    params: [
        { key: "target", type: "string", label: "目標", defaultValue: "player" },
        { key: "speed", type: "number", label: "速度", defaultValue: 2 }
    ]
};