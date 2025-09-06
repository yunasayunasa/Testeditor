// ★ import文は不要

export const uiRegistry = {
    'coin_hud': { path: './ui/CoinHud.js', groups: [ 'battle','hud'] },
    'player_hp_bar': { path: './ui/HpBar.js', groups: ['hud', 'battle'], params: { type: 'player' } , 
},
    'enemy_hp_bar': { path: './ui/HpBar.js', groups: ['hud', 'battle'], params: { type: 'enemy' } },
   'virtual_stick': { path: './ui/VirtualStick.js', groups: ['controls', 'action'] },
    'jump_button': { path: './ui/JumpButton.js', groups: ['controls', 'action'] },
       'message_window': {
        path: './ui/MessageWindow.js',
        groups: ['game'] // GameSceneで表示されるべきなので 'game' グループに所属させる
    },
    'menu_button': {
        path: './ui/MenuButton.js',
        groups: ['menu', 'game']
    },
    'bottom_panel': {
        path: './ui/BottomPanel.js',
        groups: ['menu', 'game']
    }
};

export const sceneUiVisibility = {
    'GameScene': ['hud', 'menu', 'game'], // 'controls' はないのでスティックは出ない
      'NovelOverlayScene': ['game'], // メッセージウィンドウ('game'グループ)だけを表示
    'JumpScene': ['controls', 'action'], // 'hud' 'menu' はないのでHUDやメニューは出ない
    'BattleScene': ['hud', 'battle'],
     'ActionScene': ['hud', 'battle'],
    'TitleScene': []
};