export const uiRegistry = {
    'coin_hud': {
        path: 'src/ui/CoinHud.js', // ★ プロジェクトルートからのフルパス
        groups: ['hud', 'game', 'battle']
    },
    'player_hp_bar': {
        path: 'src/ui/HpBar.js',
        groups: ['hud', 'battle'],
        params: { type: 'player' }
    },
    'enemy_hp_bar': {
        path: 'src/ui/HpBar.js',
        groups: ['hud', 'battle'],
        params: { type: 'enemy' }
    },
    'virtual_stick': {
        path: 'src/ui/VirtualStick.js', // ★ プロジェクトルートからのフルパス
        groups: ['controls', 'action'],
        params: {}
    },
    'jump_button': {
        path: 'src/ui/JumpButton.js', // ★ プロジェクトルートからのフルパス
        groups: ['controls', 'action'],
        params: {}
    },
    'menu_button': { path: null, groups: ['menu', 'game'] },
    'bottom_panel': { path: null, groups: ['menu', 'game'] }
};


export const sceneUiVisibility = {
    'GameScene': ['hud', 'menu', 'game'],
    'JumpScene': ['controls', 'action'],
    'BattleScene': ['hud', 'battle'],
    'TitleScene': []
};