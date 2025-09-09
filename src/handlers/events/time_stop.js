// Odyssey Engine - [time_stop] Action Tag
// Stops the master clock of the engine.
//

export default async function timeStop(interpreter, target, params) {
    const systemScene = interpreter.scene.game.scene.getScene('SystemScene');
    if (systemScene) {
        systemScene.isTimeStopped = true;
      console.log(`%c[LOG BOMB 4] time_stop handler: Setting isTimeStopped to TRUE.`, 'color: red; font-size: 1.2em; font-weight: bold;');
      }
}