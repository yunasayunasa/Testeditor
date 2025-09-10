// src/actions/apply_force.js

export default async function apply_force(interpreter, target, params) {
    // 1. ターゲットに物理ボディがなければ、警告を出して終了
    if (!target || !target.body) {
        console.warn(`[apply_force] Target '${target.name}' has no physics body.`);
        return;
    }

    // 2. パラメータからXとYの力を読み取る。指定がなければ0とする。
    const forceX = parseFloat(params.x) || 0;
    const forceY = parseFloat(params.y) || 0;

    // 3. 力を適用する
    target.applyForce({ x: forceX, y: forceY });
    
    // このアクションは即座に完了する
}