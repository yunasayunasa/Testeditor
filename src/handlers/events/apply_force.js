// in src/handlers/events/apply_force.js (最終決定版)

// Matter.jsのネイティブ Body モジュールをインポート（Phaserがグローバルに公開しているものを利用）
const MatterBody = Phaser.Physics.Matter.Matter.Body;

export default async function apply_force(interpreter, params, target) {
    // --- ガード節 ---
    if (!target || !target.body) {
        console.warn(`[apply_force] Target or its physics body not found.`);
        return;
    }

    // --- 力のベクトルを計算 ---
    const forceX = parseFloat(params.x) || 0;
    const forceY = parseFloat(params.y) || 0;
    const forceVector = { x: forceX, y: forceY };

    // ▼▼▼【ここが核心の変更点です】▼▼▼
    // --------------------------------------------------------------------
    // Phaserの target.applyForce() の代わりに、
    // Matter.jsネイティブの Body.applyForce() を直接呼び出す
    
    console.log(`%c[Force Native] Applying force via Matter.js native API.`, 'color: white; background: green;');
    
    MatterBody.applyForce(
        target.body,          // 第1引数: 対象の物理ボディ (target ではなく target.body)
        target.body.position, // 第2引数: 力を加える位置 (通常はボディの中心)
        forceVector           // 第3引数: 適用する力のベクトル
    );
    // --------------------------------------------------------------------
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    // --- 実行結果の確認ログ ---
    // (注意: 実際の速度変化は次の物理ステップまで反映されない場合があるが、ログとして記録する)
    console.log(`  > Force applied. Velocity is now: { x: ${target.body.velocity.x.toFixed(2)}, y: ${target.body.velocity.y.toFixed(2)} }`);
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