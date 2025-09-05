// src/main.js (直接クラス渡し形式での最終修正 - ステップ1-1)

import PreloadScene from './scenes/PreloadScene.js';
import SystemScene from './scenes/SystemScene.js'; 
import UIScene from './scenes/UIScene.js';       
import GameScene from './scenes/GameScene.js';
import { uiRegistry as rawUiRegistry } from './ui/index.js'; // ★元データを別名でインポート
import SaveLoadScene from './scenes/SaveLoadScene.js';
import ConfigScene from './scenes/ConfigScene.js';
import BacklogScene from './scenes/BacklogScene.js';
import ActionScene from './scenes/ActionScene.js';
import BattleScene from './scenes/BattleScene.js';
//import NovelOverlayScene from './scenes/NovelOverlayScene.js';
import EditorPlugin from './plugins/EditorPlugin.js';
import JumpScene from './scenes/JumpScene.js';

// ★★★ 新設：uiRegistryを自動処理する非同期関数 ★★★
// pathから動的にモジュールをimportするため、asyncにする
async function processUiRegistry(registry) {
    const processed = JSON.parse(JSON.stringify(registry)); // 深いコピーで安全に作業
    
    for (const key in processed) {
        const definition = processed[key];
        
        // pathプロパティを持つUI定義のみが対象
        if (definition.path) {
            try {
                // 動的インポートでコンポーネントのモジュールを読み込む
                const module = await import(definition.path);
                const UiClass = module.default;
                
                // クラスに `dependencies` が自己申告されていれば...
                if (UiClass && UiClass.dependencies) {
                    // watchプロパティを自動生成！
                    definition.watch = UiClass.dependencies;
                    console.log(`[UI Registry] Auto-configured 'watch' for '${key}':`, UiClass.dependencies);
                }
            } catch (e) {
                console.error(`Failed to process UI definition for '${key}'`, e);
            }
        }
    }
    return processed;
}


const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        // ★★★ 変更点1: 親要素のIDを変更 ★★★
        parent: 'game-container', 
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1280,
        height: 720
    },
    // ★★★ 修正箇所: シーン設定を直接クラスを渡す形式に維持 ★★★
    scene: [
        PreloadScene, 
        SystemScene, 
     UIScene,       
      GameScene,   
        
      SaveLoadScene, 
        ConfigScene, 
        BacklogScene, 
        ActionScene,
         BattleScene,
        JumpScene
       // NovelOverlayScene
   ],
    // ★★★ 変更点2: EditorPluginをグローバルプラグインとして登録 ★★★
 plugins: {
        global: [
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            // ★★★ start: true に戻し、Phaserに起動を完全に任せる ★★★
            { key: 'EditorPlugin', plugin: EditorPlugin, start: true }
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        ]
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 }, // 標準の重力
            debug: true // 開発中はtrueにして当たり判定を可視化
        }
    }
};
window.onload = async () => {
    
    // ★ステップ1: 必要なデータを先に非同期で準備する
    const processedUiRegistry = await processUiRegistry(rawUiRegistry);

    // Phaser Gameインスタンスを生成
    const game = new Phaser.Game(config);
    
    // ★ステップ2: ゲームインスタンスができた直後に、準備したデータを登録する
    // これにより、どのシーンが起動するよりも先にデータが利用可能になることが保証される
    game.registry.set('uiRegistry', processedUiRegistry);
};