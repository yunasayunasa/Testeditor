// ★ import文は不要

export const uiRegistry = {
    'coin_hud': { path: './CoinHud.js', groups: ['hud', 'game', 'battle'] },
    'player_hp_bar': { path: './HpBar.js', groups: ['hud', 'battle'], params: { type: 'player' } },
    'enemy_hp_bar': { path: './HpBar.js', groups: ['hud', 'battle'], params: { type: 'enemy' } },
 //   'virtual_stick': { path: './VirtualStick.js', groups: ['controls', 'action'] },
    'jump_button': { path: './JumpButton.js', groups: ['controls', 'action'] },
    
    // ★★★ メニューとパネルもデータ駆動の対象にする ★★★
    'menu_button': {
        creator: (scene, params) => scene.createMenuButton(params), // ★ UISceneのヘルパーを呼ぶ
        groups: ['menu', 'game']
    },
    'bottom_panel': {
        creator: (scene, params) => scene.createBottomPanel(params), // ★ UISceneのヘルパーを呼ぶ
        groups: ['menu', 'game']
    }
};

export const sceneUiVisibility = {
    'GameScene': ['hud', 'menu', 'game'], // 'controls' はないのでスティックは出ない
    'JumpScene': ['controls', 'action'], // 'hud' 'menu' はないのでHUDやメニューは出ない
    'BattleScene': ['hud', 'battle'],
    'TitleScene': []
};