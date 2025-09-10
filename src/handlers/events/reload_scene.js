// src/actions/reload_scene.js

export default function reload_scene(scene, params, context) {
    console.log(`%c[Action] Reloading scene: ${scene.scene.key}`, 'color: red; font-weight: bold;');
    
    // シーンの再起動を命令する
    scene.scene.restart();

    // このアクションは即座に完了する
    return Promise.resolve();
}