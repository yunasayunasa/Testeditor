// src/ui/index.js (最終確定・完成版)
// --- 1. ジョイスティック生成関数を、uiRegistryの外で独立した関数として定義する ---

/**
 * ジョイスティックをシーンに追加するための、独立したファクトリ関数。
 * @param {Phaser.Scene} scene - 追加先のシーン
 * @returns {object | null} 生成されたジョイスティックオブジェクト
 */
const createJoystickFromEditor = (scene) => {
    if (scene.joystick) {
        alert('ジョイスティックは既にシーンに存在します。');
        return scene.joystick;
    }
    const joystickPlugin = scene.plugins.get('rexvirtualjoystickplugin');
    if (!joystickPlugin) {
        alert('エラー: Virtual Joystick Pluginがロードされていません。');
        return null;
    }
    console.log("[uiRegistry] joystick.addFromEditor: Creating new joystick...");
    scene.joystick = joystickPlugin.add(scene, {
        x: 150,
        y: scene.cameras.main.height - 150,
        radius: 100,
        base: scene.add.circle(0, 0, 100, 0x888888, 0.5).setScrollFactor(0).setDepth(1000),
        thumb: scene.add.circle(0, 0, 50, 0xcccccc, 0.8).setScrollFactor(0).setDepth(1000),
    });
    return scene.joystick;
};
/**
 * uiRegistry
 * 
 * ゲーム内で使用される全ての「カスタムUIコンポーネント」の設計図を定義します。
 * EditorUIのアセットブラウザは、このリストを元に「追加可能なUI」のカタログを動的に生成します。
 * 
 * - path: UIコンポーネントのクラスが定義されているJSファイルへのパス。
 *         main.jsがこれを元に動的にimportし、'component'プロパティを自動生成します。
 * - groups: このUIが所属するグループの配列。UIScene.onSceneTransitionが、
 *           このグループ名とsceneUiVisibilityの定義を照合して、表示/非表示を自動で切り替えます。
 * - watch: (オプション) このUIが監視すべきゲーム変数(f.)のキーの配列。
 *          StateManagerでこれらの変数が変更されると、UIScene.updateHud経由で、
 *          コンポーネント自身のupdateValue(state)メソッドが呼び出されます。
 * - params: (オプション) このUIコンポーネントのインスタンスが生成される際に、
 *           コンストラクタに渡されるデフォルトのパラメータ。
 */
export const uiRegistry = {
    'coin_hud': { 
        path: './ui/CoinHud.js', 
        groups: ['hud', 'battle'],
        watch: ['coin'] 
    },
    'player_hp_bar': { 
        path: './ui/HpBar.js', 
        groups: ['hud', 'battle'],
        watch: ['player_hp', 'player_max_hp']
    },
    'enemy_hp_bar': { 
        path: './ui/HpBar.js', 
        groups: ['hud', 'battle'],
        watch: ['enemy_hp', 'enemy_max_hp']
    },
    
    'menu_button': {
        path: './ui/MenuButton.js',
        groups: ['menu', 'game'],
        params: { label: 'MENU' }
    },

    'generic_button': {
        path: './ui/Button.js',
        groups: ['ui_element', 'action'], // 特定のシーンに依存しない、汎用UIグループ
        params: { label: 'Button' }
    },

    'jump_button': { 
        path: './ui/JumpButton.js',
        groups: ['controls', 'action']
    },
   // --- 2. joystickの定義で、先ほど定義した独立関数を「参照」する ---
    'joystick': {
        groups: ['controls', 'action'],
        addFromEditor: createJoystickFromEditor // ★ アロー関数ではなく、関数の名前を直接指定
    },
      

    'message_window': { 
        path: './ui/MessageWindow.js', 
        groups: ['game']
    },
    
    'bottom_panel': { 
        path: './ui/BottomPanel.js', 
        groups: ['menu', 'game']
    },

    // Phaser標準のTextオブジェクトを、uiRegistryで管理するための特別な定義。
    // これにより、onSceneTransitionが他のUIと同様にグループベースで表示制御できるようになる。
    'Text': {
        component: Phaser.GameObjects.Text, // pathは不要。main.jsがcomponentを直接参照する。
        groups: ['game', 'ui_element','text_ui']      // テキストは'game'グループと汎用グループに所属させる。
    }
};


/**
 * sceneUiVisibility
 * 
 * 各シーンで、どのUI「グループ」を表示するかを定義します。
 * SystemSceneがシーン遷移を完了した際に、この定義を元にUIScene.onSceneTransitionが呼び出され、
 * UIの表示状態が一括で更新されます。
 */
export const sceneUiVisibility = {
    'GameScene': ['hud', 'menu', 'game'],
    'JumpScene': ['controls', 'action','hud', 'ui_element','text_ui'],
    'BattleScene': ['hud', 'battle'],
    'ActionScene': ['menu', 'game'], // 例
    'TitleScene': [],
    'NovelOverlayScene': ['game'] // オーバーレイ中は'game'グループ(メッセージウィンドウなど)のみ表示
};