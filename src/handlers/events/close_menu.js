// src/handlers/events/close_menu.js

export default async function close_menu(interpreter) {
    const systemScene = interpreter.scene.scene.get('SystemScene');
    systemScene.events.emit('request-close-menu', {
        from: interpreter.scene.scene.key // 自分自身(OverlayScene)のキーを渡す
    });
}

close_menu.define = {
    description: '現在開いているオーバーレイメニューを閉じます。',
    params: []
};