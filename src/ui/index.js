// import CoinHud from './CoinHud.js'; // ← ここでのインポートはやめる
// import HpBar from './HpBar.js';
import VirtualStick from './VirtualStick.js'; 
import JumpButton from './JumpButton.js'; 



// グローバルスコープに関数を定義
window.registerUiDefinitions = () => {
    // ★ new CoinHud() のようにクラスを直接使うのではなく、
    //   「どのクラスを使うか」を示す文字列のキーを持たせる
    const uiRegistry = {
        'coin_hud': { type: 'CoinHud', groups: ['hud', 'game', 'battle'] },
        'player_hp_bar': { type: 'HpBar', groups: ['hud', 'battle'] },
        'enemy_hp_bar': { type: 'HpBar', groups: ['hud', 'battle'] },
        'menu_button': { type: null, groups: ['menu', 'game'] },
           'virtual_stick': {
        creator: (scene, params) => new VirtualStick(scene, params),
        groups: ['controls', 'action'] // アクションシーンで表示したいコントロールUI
    },
       'jump_button': {
        creator: (scene, params) => new JumpButton(scene, params),
        groups: ['controls', 'action'] // VirtualStickと同じグループに所属させる
    },
        'bottom_panel': { type: null, groups: ['menu', 'game'] }
    };

    const sceneUiVisibility = {
        'GameScene': ['hud', 'menu', 'game'],
        'JumpScene': ['controls', 'action'],
        'BattleScene': ['hud', 'battle'],
        'TitleScene': []
    };
    
    return { uiRegistry, sceneUiVisibility };
};