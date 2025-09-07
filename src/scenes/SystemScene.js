import SoundManager from '../core/SoundManager.js';
import EditorUI from '../editor/EditorUI.js';
import UIScene from './UIScene.js';
import GameScene from './GameScene.js';
import JumpScene from './JumpScene.js';
export default class SystemScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SystemScene' });
        this.globalCharaDefs = null;
        this.isProcessingTransition = false;
        this.initialGameData = null;
        this.novelBgmKey = null; // BGMキーの保持
        this.editorUI = null; // EditorUIへの参照を保持
    }

    init(data) {
        if (data && data.initialGameData) {
            this.initialGameData = data.initialGameData;
        }
    }

    create() {
          console.log('--- SURGICAL LOG BOMB in SystemScene.create ---');
        try {
            console.log('this:', this);
            console.log('this.scene:', this.scene);
            console.log('this.scene.manager:', this.scene.manager);
            console.log('this.scene.manager.events:', this.scene.manager.events);
        } catch (e) {
            console.error('!!! LOG BOMB FAILED !!!', e);
        }
        console.log('--- END OF LOG BOMB ---');
        
        console.log("SystemScene: 起動・グローバルサービスのセットアップを開始。");
        
       // --- 1. コアサービスの初期化 ---
        const soundManager = new SoundManager(this.game);
        this.registry.set('soundManager', soundManager);
        this.input.once('pointerdown', () => soundManager.resumeContext(), this);
        console.log("SystemScene: SoundManagerを登録しました。");
// ★★★ UISceneを動的に追加し、永続的に起動する ★★★
        if (!this.scene.get('UIScene')) {
            this.scene.add('UIScene', UIScene, true); // ★ active: trueで追加・起動
        }
        
        // --- 2. イベントリスナーの設定 ---
        this.events.on('request-scene-transition', this._handleRequestSceneTransition, this);
        this.events.on('return-to-novel', this._handleReturnToNovel, this);
        this.events.on('request-overlay', this._handleRequestOverlay, this);
        this.events.on('end-overlay', this._handleEndOverlay, this);
          this.events.on('request-subscene', this._handleRequestSubScene, this);
         this.events.on('request-gamemode-toggle', (mode) => {
            const gameScene = this.scene.get('GameScene');
            if (gameScene && gameScene.scene.isActive() && gameScene.scenarioManager) {
                const currentMode = gameScene.scenarioManager.mode;
                const newMode = currentMode === mode ? 'normal' : mode;
                gameScene.scenarioManager.setMode(newMode);
                console.log(`モード変更: ${currentMode} -> ${newMode}`);
            }
        });
        // --- 3. エディタ関連の初期化 ---
        this.initializeEditor();
         
        // --- 4. 初期ゲームの起動 ---
        if (this.initialGameData) {
            this._startInitialGame(this.initialGameData);
        }
    }

    initializeEditor() {
        // ★★★ デバッグモードの判定は残す ★★★
        const currentURL = window.location.href;
        const isDebugMode = currentURL.includes('?debug=true') || currentURL.includes('&debug=true');

        if (isDebugMode) {
            console.log("[SystemScene] Debug mode detected. Initializing Editor UI...");
            
            document.body.classList.add('debug-mode');
            
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            // ★★★ これが最もシンプルで確実な方法です ★★★
            // すでにPhaserによって起動済みのプラグインを「取得」するだけ
            const editorPlugin = this.plugins.get('EditorPlugin');
            
            // pluginが有効なら、UIを初期化する
            if (editorPlugin && editorPlugin.isEnabled) {
                 this.editorUI = new EditorUI(this.game, editorPlugin);
                 editorPlugin.setUI(this.editorUI);
            }
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        }
    }
 /**
     * 初期ゲームを起動する内部メソッド (改訂版)
     */

    _startInitialGame(initialData) {
        this.globalCharaDefs = initialData.charaDefs;
        
        // ★ UISceneはすでにcreateで起動済みなので、ここではGameSceneを起動するだけ
        this._startAndMonitorScene('GameScene', {
            charaDefs: this.globalCharaDefs,
            startScenario: initialData.startScenario,
        });
    }



     /**
     * [jump]などによるシーン遷移リクエストを処理 (修正版)
     */
       _handleRequestSceneTransition(data) {
        console.log(`[SystemScene] シーン遷移リクエスト: ${data.from} -> ${data.to}`);
        
        // ★ BGMの操作は一切しない ★

        if (this.scene.isActive(data.from)) {
            this.scene.stop(data.from); 
        }
        if (this.scene.isActive('UIScene')) {
            this.scene.get('UIScene').setVisible(false);
        }


        // ★ 4. 新しいシーンを起動
        // BattleSceneのinitに渡すデータ構造を調整
        this._startAndMonitorScene(data.to, { 
            // BattleSceneのinitが `data.transitionParams` を期待している場合
            transitionParams: data.params 
        });
    };
    

   /**
     * サブシーンからノベルパートへの復帰リクエストを処理する (ロード機能連携版)
     * @param {object} data - { from: string, params: object }
     */
    _handleReturnToNovel(data) {
        const fromSceneKey = data.from;
        console.log(`[SystemScene] ノベル復帰リクエストを受信 (from: ${fromSceneKey})`);

        // 現在のGameSceneとサブシーンを停止させる
        if (this.scene.isActive('GameScene')) {
            this.scene.stop('GameScene');
        }
        if (this.scene.isActive(fromSceneKey)) {
            this.scene.stop(fromSceneKey);
        }
        
        // UISceneの表示を戻す
        const uiScene = this.scene.get('UIScene');
        if (uiScene) {
            uiScene.onSceneTransition('GameScene'); // UIの表示グループをGameScene用に切り替え
        }

        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが全てを解決する、唯一の修正です ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        console.log("[SystemScene] GameSceneを「ロードモード」で再起動します。");
        // GameSceneを起動する際に、どのスロットからロードするかを`init`データで渡す
        this.scene.launch('GameScene', {
            loadSlot: 0, // ★ オートセーブスロット(0)からロードするように指示
            charaDefs: this.globalCharaDefs,
            resumedFrom: fromSceneKey,
            returnParams: data.params
        });

        // ★★★ _startAndMonitorSceneは使わない ★★★
        // なぜなら、新しいGameSceneの起動と完了監視は、launchによって
        // Phaserのシーンマネージャーが自動的に行ってくれるため。
        // そして、GameSceneのcreateがloadSlotを元に正しくperformLoadを呼び出す。
    }

   // src/scenes/SystemScene.js

    /**
     * オーバーレイ表示のリクエストを処理 (入力制御オプション付き)
     * @param {object} data - { from: string, scenario: string, block_input: boolean }
     */
    _handleRequestOverlay(data) {
        console.log(`[SystemScene] オーバーレイ表示リクエストを受信 (from: ${data.from})`);

        // block_inputパラメータをチェック。指定がないか、falseでない場合はtrue（入力をブロックする）
        const shouldBlockInput = (data.block_input !== false);

        if (shouldBlockInput) {
            const fromScene = this.scene.get(data.from);
            if (fromScene && fromScene.scene.isActive()) {
                fromScene.input.enabled = false;
                console.log(`[SystemScene] 背後のシーン[${data.from}]の入力を無効化しました。`);
            }
        } else {
            console.log(`[SystemScene] 背後のシーン[${data.from}]の入力は有効のままです。`);
        }

        // NovelOverlaySceneを起動し、入力ブロックの有無を伝える
        this.scene.launch('NovelOverlayScene', { 
            scenario: data.scenario,
            charaDefs: this.globalCharaDefs,
            returnTo: data.from,
            inputWasBlocked: shouldBlockInput 
        });
    }

    /**
     * オーバーレイ終了のリクエストを処理 (入力制御オプション付き)
     * @param {object} data - { from: 'NovelOverlayScene', returnTo: string, inputWasBlocked: boolean }
     */
    _handleEndOverlay(data) {
        console.log(`[SystemScene] オーバーレイ終了リクエストを受信 (return to: ${data.returnTo})`);

        // NovelOverlaySceneを停止
        if (this.scene.isActive(data.from)) {
            this.scene.stop(data.from); 
        }

        // 入力をブロック「していた」場合のみ、再度有効化する
        if (data.inputWasBlocked) {
            const returnScene = this.scene.get(data.returnTo);
            if (returnScene && returnScene.scene.isActive()) { 
                returnScene.input.enabled = true; 
                console.log(`[SystemScene] シーン[${data.returnTo}]の入力を再有効化しました。`);
            }
        } else {
             console.log(`[SystemScene] シーン[${data.returnTo}]の入力はもともと有効だったので、何もしません。`);
        }
    }

   /**
     * 新しいシーンを起動し、完了まで監視するコアメソッド (動的追加対応版)
     * ★★★ 以下のメソッドで、既存のものを完全に置き換えてください ★★★
     */
    _startAndMonitorScene(sceneKey, params) {
        if (this.isProcessingTransition) {
            console.warn(`[SystemScene] 遷移処理中に新たな遷移リクエスト(${sceneKey})が、無視されました。`);
            return;
        }
        this.isProcessingTransition = true;
        this.game.input.enabled = false;
        
        // --- 1. 起動するシーンのクラスを決定 ---
        // このマップで、どのキーがどのクラスに対応するかを定義する
        const sceneClassMap = {
            'GameScene': GameScene,
            'JumpScene': JumpScene,
            // ... (将来、'BattleScene': BattleScene, を追加) ...
        };
        const SceneClass = sceneClassMap[sceneKey];
        if (!SceneClass) {
            console.error(`[SystemScene] '${sceneKey}'に対応するシーンクラスが見つかりません。`);
            this.isProcessingTransition = false;
            this.game.input.enabled = true;
            return;
        }

        // --- 2. シーンが既に存在しない場合、動的に追加する ---
        if (!this.scene.get(sceneKey)) {
            this.scene.add(sceneKey, SceneClass, false);
            console.log(`[SystemScene] シーン[${sceneKey}]を動的に追加しました。`);
        }
        
        // --- 3. これで、targetSceneは絶対にnullにならない ---
        const targetScene = this.scene.get(sceneKey);
        const completionEvent = (sceneKey === 'GameScene') ? 'gameScene-load-complete' : 'scene-ready';

        targetScene.events.once(completionEvent, () => {
            this._onTransitionComplete(sceneKey);
        });

        // --- 4. シーンを起動する ---
        this.scene.run(sceneKey, params);
        console.log(`[SystemScene] シーン[${sceneKey}]の起動を開始。`);
    }
    _onTransitionComplete(sceneKey) {
        this.isProcessingTransition = false;
        this.game.input.enabled = true;
        console.log(`[SystemScene] シーン[${sceneKey}]の遷移が完了。`);
        this.events.emit('transition-complete', sceneKey);
    }
     /**
     * セーブ/ロード画面などのサブシーン起動リクエストを処理する
     * @param {object} data - { targetScene: string, launchData: object }
     */
    _handleRequestSubScene(data) {
        const gameScene = this.scene.get('GameScene');

        // GameSceneが実行中の場合のみ、特別な待機処理を行う
        if (gameScene && gameScene.scene.isActive()) {
            console.log(`[SystemScene] Sub-scene request for ${data.targetScene}. Preparing GameScene...`);
            
            // 1. GameSceneにオートセーブを実行させる
            gameScene.performSave(0);

            // 2. GameSceneをスリープさせる
             this.scene.pause('GameScene');
            console.log("[SystemScene] GameScene has been put to sleep.");

            // 3. 目的のサブシーンを起動する
            this.scene.launch(data.targetScene, data.launchData);

        } else {
            // GameSceneが実行中でない場合 (タイトル画面など) は、そのまま起動する
            console.log(`[SystemScene] Launching sub-scene ${data.targetScene} directly.`);
            this.scene.launch(data.targetScene, data.launchData);
        }
    }

    // ★★★ request-gamemode-toggleの処理も、専用メソッドに分離すると綺麗です ★★★
    _handleRequestGameModeToggle(mode) {
        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.scene.isActive() && gameScene.scenarioManager) {
            const currentMode = gameScene.scenarioManager.mode;
            const newMode = currentMode === mode ? 'normal' : mode;
            gameScene.scenarioManager.setMode(newMode);
            console.log(`モード変更: ${currentMode} -> ${newMode}`);
        }
    }
}