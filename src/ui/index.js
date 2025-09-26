// src/ui/index.js (最終確定・完成版)

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
      if (registryKey === 'joystick') {
        console.group("--- [DEBUG] Joystick Creation Attempt ---");
        
        const registry = this.registry.get('uiRegistry');
        console.log("1. Got uiRegistry from Phaser Registry:", registry);
        
        const joystickDef = registry ? registry['joystick'] : undefined;
        console.log("2. Got 'joystick' definition from uiRegistry:", joystickDef);
        
        if (joystickDef) {
            console.log("3. Type of 'addFromEditor' property is:", typeof joystickDef.addFromEditor);
            console.log("4. Is it a function?", typeof joystickDef.addFromEditor === 'function');
        } else {
            console.error("CRITICAL: 'joystick' key does not exist in the uiRegistry object!");
        }
        
        console.groupEnd();
    }

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