// src/actions/reload_scene.js

export default async function reload_scene(interpreter, target, params) {
    const scene = interpreter.scene;
    console.log(`%c[Action] Reloading scene: ${scene.scene.key}`, 'color: red; font-weight: bold;');
    scene.scene.restart();
}