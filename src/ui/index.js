// src/ui/index.js (最終修正版)
import Button from './Button.js';
export const uiRegistry = {
    'coin_hud': { path: './ui/CoinHud.js', groups: [ 'battle','hud'] },
    'player_hp_bar': { path: './ui/HpBar.js', groups: ['hud', 'battle'], params: { type: 'player' } },
    'enemy_hp_bar': { path: './ui/HpBar.js', groups: ['hud', 'battle'], params: { type: 'enemy' } },

 'start_button': {
       component: Button, // ★ 作成した汎用Buttonクラスを指定
        path: './ui/Button.js', // ★ パスも忘れずに
        groups: ['menu', 'game'],
        params: { label: 'Menu',shape: 'circle' } // ★ labelでテキストを指定
    },

    'jump_button': { 
        path: './ui/JumpButton.js', 
        groups: ['controls', 'action'],
        params: { group: 'jump_button' }
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
    'TitleScene': [],
     'NovelOverlayScene': ['game'], // ★★★ この行を追加 ★★★
};