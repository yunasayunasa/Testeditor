// src/handlers/events/apply_force.js

export default async function apply_force(interpreter, params, target) {
    // ▼▼▼【デバッグログを追加】▼▼▼
    console.log("%c[apply_force] Handler executed.", "color: cyan;");
    console.log("  > Received target:", target);
    console.log("  > Target has body?:", !!(target && target.body));
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    if (!target || !target.body) {
        const targetName = target ? target.name : 'unknown';
        console.warn(`[apply_force] Target '${targetName}' has no physics body.`);
        return;
    }

    const forceX = parseFloat(params.x) || 0;
    const forceY = parseFloat(params.y) || 0;
    
    console.log(`  > Applying force: { x: ${forceX}, y: ${forceY} }`);
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