// src/actions/interact_remove.js
export default async function interact_remove(interpreter, target, params) {
    const player = interpreter.scene.player;
    if (player && player.components.Interactor) {
        player.components.Interactor.remove(target);
    }
}