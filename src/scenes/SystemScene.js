import SoundManager from '../core/SoundManager.js';
import EditorUI from '../editor/EditorUI.js';
import UIScene from './UIScene.js';
import GameScene from './GameScene.js'; 

export default class SystemScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SystemScene' });
        this.globalCharaDefs = null;
        this.isProcessingTransition = false;
        this.initialGameData = null;
        
        // ★ 状態管理プロパティをシンプル化
        this.scenesToWaitFor = new Set();
        this.onAllScenesReadyCallback = null;
    }

    init(data) {
        if (data && data.initialGameData) {
            this.initialGameData = data.initialGameData;
        }
    }

    create() {
        console.log("SystemScene: Setup started.");
        
        // --- 1. コアサービスの初期化 ---
        this.registry.set('soundManager', new SoundManager(this.game));
        
        // --- 2. イベントリスナーの設定 ---
        this.events.on('request-simple-transition', this._handleSimpleTransition, this);
        this.events.on('return-to-novel', this._handleReturnToNovel, this);
        this.events.on('request-overlay', this._handleRequestOverlay, this);
        this.events.on('end-overlay', this._handleEndOverlay, this);
        
        // --- 3. エディタ関連の初期化 ---
        this.initializeEditor();
         
        // --- 4. 初期ゲームの起動 ---
        if (this.initialGameData) {
            this._startInitialGame(this.initialGameData);
        }
    }

    /**
     * ★★★ 統一されたシーン起動シーケンス ★★★
     * @param {Array<object>} scenesToRun - 起動するシーンの情報の配列 e.g., [{ key: 'MyScene', params: {} }]
     * @param {string} finalSceneKey - 完了後にフォーカスするシーンのキー
     */
    _startSceneSequence(scenesToRun, finalSceneKey) {
        if (this.isProcessingTransition) return;
        this.isProcessingTransition = true;
        this.game.input.enabled = false;

        // --- 1. 待機リストを作成 ---
        this.scenesToWaitFor.clear();
        scenesToRun.forEach(s => this.scenesToWaitFor.add(s.key));
        console.log(`[SystemScene] Input disabled. Waiting for [${scenesToRun.map(s=>s.key).join(', ')}]...`);

        // --- 2. 完了処理を予約 ---
        this.onAllScenesReadyCallback = () => {
            this.scene.get('UIScene').onSceneTransition(finalSceneKey);
            this._onTransitionComplete(finalSceneKey);
        };
        
        // --- 3. シーンをすべて起動 ---
        scenesToRun.forEach(s => {
            if (this.scene.isActive(s.key)) this.scene.stop(s.key);
            this.scene.run(s.key, s.params);
        });
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
                 this.editorUI.start(); 
            }
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        }
    }
 /**
     * 初期ゲームを起動する内部メソッド (改訂版)
     */

  _startInitialGame(initialData) {
        // --- 事前準備 ---
        this.globalCharaDefs = initialData.charaDefs;
        if (!this.scene.get('UIScene')) this.scene.add('UIScene', UIScene, false, { physics: { matter: { enable: false } } });
        if (!this.scene.get('GameScene')) this.scene.add('GameScene', GameScene, false);
        
        // --- シーンシーケンスを起動 ---
        this._startSceneSequence([
            { key: 'UIScene', params: {} },
            { key: 'GameScene', params: {
                charaDefs: this.globalCharaDefs,
                startScenario: initialData.startScenario
            }}
        ], 'GameScene');
    }

    /**
     * ★★★ 新規・公式な完了報告受付メソッド ★★★
     */
    reportSceneReady(sceneKey) {
        console.log(`%c[SystemScene] << REPORT RECEIVED from [${sceneKey}] >>`, 'color: #ff00ff;');
        this.scenesToWaitFor.delete(sceneKey);

        if (this.scenesToWaitFor.size === 0 && this.onAllScenesReadyCallback) {
            this.onAllScenesReadyCallback();
            this.onAllScenesReadyCallback = null;
        }
    }


 /**
     * [jump]や[transition_scene]によるシーン遷移リクエストを処理する (最終確定版)
     * @param {object} data - { from: string, to: string, params: object, fade: object }
     */
     /**
     * ★★★ 新規メソッド ★★★
     * GameSceneからの[jump]など、シンプルな遷移を処理する
     */
   /**
     * ★★★ 究極の最終FIX版・改6 ★★★
     * ゲームシーン間の遷移を処理する
     */
    /**
     * ★★★ 究極の最終FIX版 ★★★
     * GameSceneからの[jump]など、シンプルな遷移を処理する
     */
   _handleSimpleTransition(data) {
        // --- 古いシーンを停止 ---
        if (this.scene.isActive(data.from)) this.scene.stop(data.from);

        // --- シーンシーケンスを起動 ---
        this._startSceneSequence([
            { key: data.to, params: data.params }
        ], data.to);
    }

    /**
     * シーン遷移を開始する (フェードなし・シンプル版)
     */
    _startTransition(data) {
        if (this.isProcessingTransition) return;

        console.log(`[SystemScene] シーン遷移リクエスト(シンプル版): ${data.from} -> ${data.to}`);
        
        this.isProcessingTransition = true;
        this.game.input.enabled = false;
        
        // ★★★ 実際のシーン切り替えを、直接呼び出す ★★★
        this._performSceneSwitch(data);
    }

    /**
     * 実際のシーン切り替え処理 (シンプル版)
     */
    _performSceneSwitch(data) {
        const sceneParams = data.params || {};
        const toScene = this.scene.get(data.to);
        if (!toScene) {
            console.error(`[SystemScene] 遷移先のシーンが見つかりません: ${data.to}`);
            this.isProcessingTransition = false;
            this.game.input.enabled = true;
            return;
        }

        const completionEvent = (data.to === 'GameScene') ? 'gameScene-load-complete' : 'scene-ready';
        
        // 新しいシーンの準備ができたら、即座に遷移を完了させる
        toScene.events.once(completionEvent, () => {
            this.isProcessingTransition = false;
            this.game.input.enabled = true;
            console.log(`[SystemScene] シーン[${data.to}]への遷移が完了しました。`);
            this.events.emit('transition-complete', data.to);
        });

        // 古いシーンを停止
        if (this.scene.isActive(data.from)) {
            this.scene.stop(data.from);
        }
        if (this.scene.isActive('UIScene')) {
            this.scene.get('UIScene').setVisible(false);
        }
        
        // 新しいシーンを開始
        this.scene.run(data.to, sceneParams);
    }
    

   /**
     * サブシーンからノベルパートへの復帰リクエストを処理する (ロード機能連携版)
     * @param {object} data - { from: string, params: object }
     */
     _handleReturnToNovel(data) {
        const fromSceneKey = data.from;
        if (this.scene.isActive(fromSceneKey)) this.scene.stop(fromSceneKey);
        
        // --- シーンシーケンスを起動 ---
        this._startSceneSequence([
            { key: 'UIScene', params: {} }, // UISceneも再起動シーケンスに含めるのが安全
            { key: 'GameScene', params: {
                loadSlot: 0,
                charaDefs: this.globalCharaDefs,
                resumedFrom: fromSceneKey,
                returnParams: data.params
            }}
        ], 'GameScene');
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

   // in SystemScene.js

    /**
     * ★★★ 最終FIX版 ★★★
     * オーバーレイ終了のリクエストを処理する。
     * どのシーンに戻るかに関わらず、UIの状態をリセットする。
     */
    _handleEndOverlay(data) {
        console.log(`[SystemScene] オーバーレイ終了リクエストを受信 (return to: ${data.returnTo})`);

        // NovelOverlaySceneを停止
        if (this.scene.isActive(data.from)) {
            this.scene.stop(data.from); 
        }

        // ▼▼▼【ここからが核心の修正です】▼▼▼
        // --------------------------------------------------------------------
        // --- UIの状態を、オーバーレイ表示前の状態に戻す ---
         const uiScene = this.scene.get('UIScene');
        if (uiScene) {
            // ★ stop() や sleep() は絶対に呼ばない
            // ★ onSceneTransition で、戻り先のシーンに必要なUIだけを表示させる
            uiScene.onSceneTransition(data.returnTo); 
        }
        // --------------------------------------------------------------------
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        // 入力をブロック「していた」場合のみ、再度有効化する
        if (data.inputWasBlocked) {
            const returnScene = this.scene.get(data.returnTo);
            if (returnScene && returnScene.scene.isActive()) { 
                returnScene.input.enabled = true; 
                console.log(`[SystemScene] シーン[${data.returnTo}]の入力を再有効化しました。`);
            }
        }
    }

    // _startAndMonitorScene は、単一シーンの遷移で使うので、
    // 以前のコールバック方式に戻すのが安全です。
     /**
     * ★★★ 究極の最終FIX版 ★★★
     * 新しい「単一」シーンを起動し、完了まで監視するコアメソッド
     */
    _startAndMonitorScene(sceneKey, params) {
        if (this.isProcessingTransition) return;
        this.isProcessingTransition = true;
        this.game.input.enabled = false;
        console.log(`[SystemScene | Final Fix] Starting scene '${sceneKey}'. Global input disabled.`);

        // --- 1. 完了報告を待つためのコールバックを設定 ---
        // ★ イベントではなく、コールバック方式に戻すのが最も確実
        this.onSceneReadyCallback = (readySceneKey) => {
            if (readySceneKey === sceneKey) {
                // ★ 遷移が完了した「後」に、UIの状態を更新する
                this.scene.get('UIScene').onSceneTransition(sceneKey);
                this._onTransitionComplete(sceneKey);
            }
        };

        // --- 2. 起動する ---
        this.scene.run(sceneKey, params);
    }
     _onTransitionComplete(sceneKey) {
        this.isProcessingTransition = false;
        this.game.input.enabled = true;
        console.log(`%c[SystemScene] Transition to '${sceneKey}' is COMPLETE. Global input enabled.`, 'font-weight: bold; color: lightgreen;');
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

   /**
     * 16進数カラーコード(0xRRGGBB)を、Phaserのカメラが要求するRGB(0-255)に変換する
     * @param {number} hex - 0x000000のような16進数カラーコード
     * @returns {Array<number>} [r, g, b] の配列
     */
    hexToRgb(hex) {
        const r = (hex >> 16) & 255;
        const g = (hex >> 8) & 255;
        const b = hex & 255;
        return [r, g, b];
    }
}