// src/ui/index.js (修正案)

// ★ Buttonクラスは、ここでインポートする必要はありません。
// ★ main.jsなどで、pathから動的にcomponentプロパティを生成するからです。

export const uiRegistry = {
    'coin_hud': { 
        path: './ui/CoinHud.js', 
        groups: ['battle','hud'],
        // ★★★ 監視する変数を、ここに定義する ★★★
        watch: ['coin'] 
    },
    'player_hp_bar': { 
        path: './ui/HpBar.js', 
        groups: ['hud', 'battle'],
        watch: ['player_hp', 'player_max_hp'], // ★ 監視する変数を定義
        params: { 
            // ★ watch定義と重複するので、paramsからは削除するのが望ましい
            // watchVariable: 'player_hp', 
            // maxVariable: 'player_max_hp'
        } 
    },
    'enemy_hp_bar': { 
        path: './ui/HpBar.js', 
        groups: ['hud', 'battle'],
        watch: ['enemy_hp', 'enemy_max_hp'], // ★ 監視する変数を定義
        params: { 
            // watchVariable: 'enemy_hp',
            // maxVariable: 'enemy_max_hp'
        } 
    },
    
    // ★ 'start_button'と'menu_button'は役割が重複しているので、一つに絞るか、明確に分ける
    'menu_button': {
        path: './ui/MenuButton.js', // MenuButton.js は「パネルを開く」機能を持つ専用ボタン
        groups: ['menu', 'game'],
        params: { label: 'MENU' }
    },

    // ★★★ エディタから追加するための「汎用ボタン」を新設 ★★★
    'generic_button': {
        path: './ui/Button.js', // Button.js は見た目だけの汎用ボタン
        groups: ['ui_element'], // どのシーンにも属さない、汎用的なグループ
        params: { label: 'Button' }
    },

    'jump_button': { 
        path: './ui/JumpButton.js', // JumpButton.js は「ジャンプする」機能を持つ専用ボタン
        groups: ['controls', 'action'],
    },

    'message_window': { path: './ui/MessageWindow.js', groups: ['game'] },
    
    'bottom_panel': { path: './ui/BottomPanel.js', groups: ['menu', 'game'] }
};

export const sceneUiVisibility = {
    // ... (この定義は完璧なので、変更は不要です) ...
};