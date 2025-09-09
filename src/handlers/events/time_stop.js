// Odyssey Engine - [time_stop] Action Tag
// Stops the master clock of the engine.
//

export default async function timeStop(interpreter, target, params) {
    const systemScene = interpreter.scene.game.scene.getScene('SystemScene');
    if (systemScene) {
        systemScene.isTimeStopped = true;
        console.log(`%c[time_stop] Master clock has been stopped.`, 'color: orange');
    }
}