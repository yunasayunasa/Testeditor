/**
 * [input_check] - 入力チェック
 * 特定のキーが押されているかをチェック
 */
export default async function input_check(interpreter, params) {
    const keyName = params.key;
    if (!keyName) return 'not_pressed';
    
    const scene = interpreter.scene;
    const cursors = scene.input.keyboard.createCursorKeys();
    const keys = {
        'up': cursors.up,
        'down': cursors.down,
        'left': cursors.left,
        'right': cursors.right,
        'space': scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        'shift': scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
        'enter': scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    };
    
    const key = keys[keyName.toLowerCase()];
    if (key && key.isDown) {
        return 'pressed';
    }
    
    return 'not_pressed';
}

input_check.define = {
    description: '特定のキーが押されているかをチェックします',
    params: [
        { 
            key: 'key', 
            type: 'select', 
            options: ['up', 'down', 'left', 'right', 'space', 'shift', 'enter'], 
            label: 'キー', 
            defaultValue: 'space' 
        }
    ],
    outputs: ['pressed', 'not_pressed']
};
