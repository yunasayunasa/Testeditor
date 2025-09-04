// ★★★ import文はすべて削除 ★★★

export const uiRegistry = {
    'coin_hud': {
        path: './CoinHud.js', // ★ creatorの代わりにファイルパスを文字列で指定
        groups: ['hud', 'game', 'battle']
    },
    'player_hp_bar': {
        path: './HpBar.js',
        groups: ['hud', 'battle'],
        params: { type: 'player' } // ★ パラメータはここに集約
    },
    'enemy_hp_bar': {
        path: './HpBar.js',
        groups: ['hud', 'battle'],
        params: { type: 'enemy' }
    },
   'virtual_stick': {
        path: './VirtualStick.js',
        groups: ['controls', 'action'],
        // ★★★ デフォルトのパラメータを定義 ★★★
        params: {
            texture_base: 'stick_base', // 仮のアセットキー
            texture_stick: 'stick_knob' , // 
               params: {} // JumpButtonはパラメータ不要なので空オブジェクト
        }
    },
    'jump_button': {
        path: './JumpButton.js',
        groups: ['controls', 'action']
    },
    'menu_button': { path: null, groups: ['menu', 'game'] }, // ハードコードするものはnull
    'bottom_panel': { path: null, groups: ['menu', 'game'] }
};

export const sceneUiVisibility = {
    'GameScene': ['hud', 'menu', 'game'],
    'JumpScene': ['controls', 'action'],
    'BattleScene': ['hud', 'battle'],
    'TitleScene': []
};