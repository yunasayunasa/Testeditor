// in src/handlers/events/apply_force.js (最終手段バージョン)

const MatterBody = Phaser.Physics.Matter.Matter.Body;

export default async function apply_force(interpreter, params, target) {
    if (!target || !target.body) {
        console.warn(`[apply_force] Target or its physics body not found.`);
        return;
    }

    const forceX = parseFloat(params.x) || 0;
    const forceY = parseFloat(params.y) || 0;
    const forceVector = { x: forceX, y: forceY };
    
    // 1. ネイティブAPIで力を加える
    MatterBody.applyForce(target.body, target.body.position, forceVector);
    console.log(`%c[Force Native] Force calculation submitted to the engine.`, 'color: white; background: blue;');
    
    // ▼▼▼【ここが最後の切り札です】▼▼▼
    // --------------------------------------------------------------------
    // Phaserの次の更新を待たずに、Matter.jsエンジンを手動で1ステップ進める
    
    console.log('%c[Engine Step] Manually stepping the Matter.js engine forward...', 'color: white; background: purple;');
    
    // a) シーンから物理エンジン本体への参照を取得
    const engine = target.scene.matter.world.engine;
    
    // b) 手動でエンジンを更新する (通常、deltaは約16.66ms)
    Phaser.Physics.Matter.Matter.Engine.update(engine, 16.66);
    // --------------------------------------------------------------------
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    // --- 実行結果の最終確認ログ ---
    // 手動ステップ後なので、速度が反映されているはず
    console.log(`  > Velocity AFTER manual engine step: { x: ${target.body.velocity.x.toFixed(2)}, y: ${target.body.velocity.y.toFixed(2)} }`);
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