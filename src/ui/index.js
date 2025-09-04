import CoinHud from './CoinHud.js';
import HpBar from './HpBar.js';
// import VirtualStick from './VirtualStick.js'; // 必要ならインポート

/**
 * UI要素の定義カタログ
 * key: UIの一意な名前 (これがレイアウトJSONのnameと一致する)
 * value: {
 *   creator: (scene, params) => { ... }, // UIインスタンスを生成する関数
 *   groups: ['group1', 'group2']        // UIが所属する表示グループ
 * }
 */
export const uiRegistry = {
    // --- HUDグループ ---
    'coin_hud': {
        creator: (scene, params) => new CoinHud(scene, { ...params, stateManager: scene.registry.get('stateManager') }),
        groups: ['hud', 'game', 'battle']
    },
    'player_hp_bar': {
        creator: (scene, params) => new HpBar(scene, { ...params, stateManager: scene.registry.get('stateManager'), type: 'player' }),
        groups: ['hud', 'battle']
    },
    'enemy_hp_bar': {
        creator: (scene, params) => new HpBar(scene, { ...params, stateManager: scene.registry.get('stateManager'), type: 'enemy' }),
        groups: ['hud', 'battle']
    },
    
    // --- ゲームコントロールグループ ---
    'virtual_stick': {
        // creator: (scene, params) => new VirtualStick(scene, params),
        groups: ['controls', 'action']
    },

    // --- メニュー関連 (ハードコードでもOKだが、一応ここに定義) ---
    // これらはレイアウトJSONには記載せず、UISceneが直接生成する
    'menu_button': {
        creator: null, // UISceneが直接生成
        groups: ['menu', 'game']
    },
    'bottom_panel': {
        creator: null, // UISceneが直接生成
        groups: ['menu', 'game']
    }
};

/**
 * シーンごとのUI表示設定
 * key: シーンのキー (e.g., 'GameScene', 'BattleScene')
 * value: 表示するUIグループの配列
 */
export const sceneUiVisibility = {
    'GameScene': ['hud', 'menu', 'game'],
    'JumpScene': ['controls', 'action'],
    'BattleScene': ['hud', 'battle'],
    // TitleSceneなど、UIを一切表示したくないシーンは空にするか、定義しない
    'TitleScene': []
};