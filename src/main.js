// src/main.js

// --- 1. 必要なモジュールを全てインポート ---
import PreloadScene from './scenes/PreloadScene.js';
import SystemScene from './scenes/SystemScene.js'; 
import { uiRegistry as rawUiRegistry, sceneUiVisibility } from './ui/index.js';
import { eventTagHandlers } from './handlers/events/index.js';
import EditorPlugin from './plugins/EditorPlugin.js';
// ... GameScene, UIScene, JumpSceneなど、動的にaddするシーンはここでは不要 ...

// --- 2. uiRegistryを処理する非同期関数（変更なし） ---
async function processUiRegistry(registry) {
    const processed = JSON.parse(JSON.stringify(registry));
    for (const key in processed) {
        const definition = processed[key];
        if (definition.path) {
            try {
                const module = await import(definition.path);
                definition.component = module.default;
                if (module.default && module.default.dependencies) {
                    definition.watch = module.default.dependencies;
                }
            } catch (e) { console.error(`Failed to process UI definition for '${key}'`, e); }
        }
    }
    return processed;
}

// --- 3. Phaserゲームコンフィグの定義 ---
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'game-container', 
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1280,
        height: 720
    },
    // ▼▼▼【ここが最重要ポイント ①】▼▼▼
    // --- シーン配列からは、手動で起動する SystemScene と PreloadScene のみを指定 ---
    // --- active: false にすることで、自動起動を完全に抑制する ---
    scene: [ PreloadScene, SystemScene ],
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    plugins: {
        global: [
            { key: 'EditorPlugin', plugin: EditorPlugin, start: true }
        ]
    },
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1 },
            // ★ Matter.jsのデバッグ表示設定
            debug: {
                showBody: true,
                showStaticBody: true,
                showVelocity: true,
                bodyColor: 0xff00ff, // 動くボディの色 ( magenta )
                staticBodyColor: 0x0000ff, // 静的なボディの色 ( blue )
                velocityColor: 0x00ff00, // 速度ベクトルの色 ( lime green )
            }
        }
    }
};

// --- 4. ゲーム起動のエントリーポイント ---
window.onload = async () => {
    // URLパラメータの処理
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('debug')) {
        document.body.classList.add('debug-mode');
    }

    // ▼▼▼【ここが最重要ポイント ②】▼▼▼
    // --- 全ての非同期データ準備を「先」に完了させる ---
    console.log("[main.js] Starting asynchronous data preparation...");
    const processedUiRegistry = await processUiRegistry(rawUiRegistry);
    console.log("[main.js] Asynchronous data preparation complete.");

    // --- Phaserゲームインスタンスを生成 ---
    const game = new Phaser.Game(config);

    // --- 準備完了したデータを、ゲームが起動する「前」にregistryにセットする ---
    game.registry.set('uiRegistry', processedUiRegistry);
   console.log("%c[LOG BOMB 1A] main.js: About to set 'sceneUiVisibility'. Data is:", "color: red; font-size: 1.2em; font-weight: bold;", sceneUiVisibility);

// --- 2. 実際に登録する ---
game.registry.set('sceneUiVisibility', sceneUiVisibility);

// --- 3. 登録した「直後」に、registryから取得して、本当に保存されたか確認する ---
const checkVisibility = game.registry.get('sceneUiVisibility');
console.log("%c[LOG BOMB 1B] main.js: Just set 'sceneUiVisibility'. Verification get:", "color: red; font-size: 1.2em; font-weight: bold;", checkVisibility);
    game.registry.set('eventTagHandlers', eventTagHandlers);
    console.log("[main.js] All global data has been set in the registry.");

    // --- 全ての準備が整ったので、最初のシーン（PreloadScene）を手動で「起動」する ---
    console.log("[main.js] Starting the first scene: PreloadScene");
    game.scene.start('PreloadScene');
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
};