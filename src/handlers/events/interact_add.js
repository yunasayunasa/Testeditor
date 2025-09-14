// src/actions/interact_add.js
export default async function interact_add(interpreter, params, target) {
    const player = interpreter.scene.player; // JumpSceneにplayerの参照がある前提
    if (player && player.components.Interactor) {
        player.components.Interactor.add(target);
    }
}