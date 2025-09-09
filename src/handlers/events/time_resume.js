//
// Odyssey Engine - [time_resume] Action Tag
// Resumes the master clock of the engine.
//

export default async function timeResume(interpreter, target, params) {
    const systemScene = interpreter.scene.game.scene.getScene('SystemScene');
    if (systemScene) {
        systemScene.isTimeStopped = false;
        console.log(`%c[time_resume] Master clock has been resumed.`, 'color: orange');
    }
}