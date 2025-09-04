
export const uiRegistry = {
    'coin_hud': {
        path: './CoinHud.js', // ★ ui/index.js から見た相対パス
        groups: ['hud', 'game', 'battle']
    },
    'player_hp_bar': {
        path: './HpBar.js',
        groups: ['hud', 'battle'],
        params: { type: 'player' }
    },
    'enemy_hp_bar': {
        path: './HpBar.js',
        groups: ['hud', 'battle'],
        params: { type: 'enemy' }
    },
    'virtual_stick': {
        path: './VirtualStick.js', // ★ ui/index.js から見た相対パス
        groups: ['controls', 'action'],
        params: {}
    },
    'jump_button': {
        path: './JumpButton.js', // ★ ui/index.js から見た相対パス
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