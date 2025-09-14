// src/ui/index.js (最終修正版)

export const uiRegistry = {
    'coin_hud': { path: './ui/CoinHud.js', groups: [ 'battle','hud'] },
    'player_hp_bar': { path: './ui/HpBar.js', groups: ['hud', 'battle'], params: { type: 'player' } },
    'enemy_hp_bar': { path: './ui/HpBar.js', groups: ['hud', 'battle'], params: { type: 'enemy' } },

    'jump_button': { 
        path: './ui/JumpButton.js', 
        groups: ['controls', 'action'],
        params: { group: 'jump_button' }
    },
 'start_button': {
        path: './ui/JumpButton.js', // 既存のJumpButtonクラスを再利用できる
        groups: ['game_start'],     // ★ 'game_start' という新しいグループ
        params: {
            x: 640,
            y: 360,
            label: 'TAP TO START' // 表示される文字
        }
    },

    'message_window': { path: './ui/MessageWindow.js', groups: ['game'] },
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

    'menu_button': {
        path: './ui/MenuButton.js',
        groups: ['menu', 'game']
    },
    'bottom_panel': {
        path: './ui/BottomPanel.js',
        groups: ['menu', 'game']
    }
};

// ... sceneUiVisibility は変更なし ...

export const sceneUiVisibility = {
    'GameScene': ['hud', 'menu', 'game'], // 'controls' はないのでスティックは出ない
      'NovelOverlayScene': ['game'], // メッセージウィンドウ('game'グループ)だけを表示
    'JumpScene': ['controls', 'action',], // 'hud' 'menu' はないのでHUDやメニューは出ない
    'BattleScene': ['hud', 'battle'],
     'ActionScene': ['menu', 'game'],
    'TitleScene': []
};