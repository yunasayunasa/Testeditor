// src/handlers/events/move_to_target.js

/**
 * ★★★ 引数の受け取り方を修正した最終FIX版 ★★★
 */
export default async function move_to_target(interpreter, params, moveTarget) {
    // moveTargetはActionInterpreterがfindTargetで解決してくれたGameObject
    const source = interpreter.currentSource; // 移動の目標点を知るためのオブジェクト
    const speed = parseFloat(params.speed) || 1;
    
    // ▼▼▼【ここが修正の核心】▼▼▼
    // 1. 移動させたい対象(source)と、目標(moveTarget)の両方が存在するかチェック
    if (!source || !moveTarget || !source.body) {
        console.warn(`[move_to_target] 移動対象または目標が見つからないか、物理ボディがありません。`);
        return;
    }

    // 2. 目標(moveTarget)への方向ベクトルを計算
    const directionX = moveTarget.x - source.x;
    const directionY = moveTarget.y - source.y;
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    const vec = new Phaser.Math.Vector2(directionX, directionY);
    if (vec.length() > 0) {
        vec.normalize();
    }

    // ★★★ 移動するのは常にsourceオブジェクト ★★★
    source.setVelocity(vec.x * speed, vec.y * speed);
};

move_to_target.define = {
    description: "自分自身(source)を、ターゲットオブジェクトに向かって移動させます。(物理ボディ必須)",
    params: [
        { key: "target", type: "string", label: "目標", defaultValue: "player" },
        { key: "speed", type: "number", label: "速度", defaultValue: 2 }
    ]
};