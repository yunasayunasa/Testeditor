// src/handlers/events/apply_force.js

/**
 * [apply_force] アクションタグ
 * ターゲットの物理ボディに、指定されたベクトルで力を加えます。
 * @param {ActionInterpreter} interpreter
 * @param {object} params
 * @param {Phaser.GameObjects.GameObject} target
 */
export default async function apply_force(interpreter, params, target) {
    if (!target || !target.body) {
        const targetName = target ? target.name : 'unknown';
        console.warn(`[apply_force] Target '${targetName}' has no physics body.`);
        return;
    }

    const forceX = parseFloat(params.x) || 0;
    const forceY = parseFloat(params.y) || 0;

    // ★ Phaserの公式APIである target.applyForce を使用
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