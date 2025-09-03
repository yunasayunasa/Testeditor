// src/handlers/events/body_velocity.js

/**
 * [body_velocity x=... y=...] タグの処理
 * 対象オブジェクトの物理ボディの速度（Velocity）を設定する
 */
export function handleVelocity(interpreter, target, params) {
    if (target && target.body) {
        // XとY、どちらか一方だけの指定も可能にする
        const x = params.x !== undefined ? Number(params.x) : target.body.velocity.x;
        const y = params.y !== undefined ? Number(params.y) : target.body.velocity.y;
        
        target.body.setVelocity(x, y);

        console.log(`[handleBodyVelocity] Set velocity on '${target.name}' to (x:${x}, y:${y})`);
    } else {
        console.warn(`[handleBodyVelocity] Target '${target.name}' has no physics body.`);
    }
    // このアクションは一瞬で終わるので、Promiseは返さない
}