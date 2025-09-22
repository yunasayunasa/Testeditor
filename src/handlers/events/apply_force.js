// src/handlers/events/apply_force.js

export default async function apply_force(interpreter, params, target) {
    if (!target || !target.body) {
        console.warn(`[apply_force] Target has no physics body.`);
        return;
    }

    // ▼▼▼【ここから最終デバッグコード】▼▼▼
    console.log("--- Physics Body Diagnostics ---");
    console.log("Target Name:", target.name);
    const body = target.body;
    console.log("Is Static?:", body.isStatic);
    console.log("Mass:", body.mass);
    console.log("Inverse Mass:", body.inverseMass); // 0だと動かない
    console.log("Friction:", body.friction);
    console.log("Static Friction:", body.frictionStatic);
    console.log("Is Sleeping?:", body.isSleeping);
    console.log("World Time Scale:", target.scene.matter.world.timeScale); // 0だと物理計算が止まる
    console.log("--------------------------------");
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    const forceX = parseFloat(params.x) || 0;
    const forceY = parseFloat(params.y) || 0;
    
    console.log(`  > Applying force: { x: ${forceX}, y: ${forceY} }`);
    target.setAwake(); // スリープ状態からの復帰を試す
    target.applyForce({ x: forceX, y: forceY });
}
/**
 * ★ VSLエディタ用の自己定義 ★
 */
apply_force.define = {
    description: '物理ボディを持つオブジェクトに、瞬間的な力（衝撃）を加えます。',
    params: [
        {
            key: 'x', type: 'number', label: 'X方向の力', defaultValue: 0
        },
        {
            key: 'y', type: 'number', label: 'Y方向の力', defaultValue: 0
        },
        // ▼▼▼【ここを追加】▼▼▼
        {
            key: 'target',
            type: 'string',
            label: '力の対象',
            defaultValue: 'source'
        }
        // ▲▲▲【ここまで追加】▲▲▲
    ]
};