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
        this.novelBgmKey = null; // BGMキーの保持
        this.editorUI = null; // EditorUIへの参照を保持
         this._isTimeStopped = false;
          this.transitionState = 'none'; // 'none', 'fading_out', 'switching', 'fading_in'
        this.transitionData = null;
        this.onSceneReadyCallback = null; 
        this.scenesToWaitFor = new Set();
        this.onAllScenesReadyCallback = null;
    }
// ★★★ isTimeStoppedへのアクセスを、ゲッター/セッター経由に限定する ★★★
    get isTimeStopped() {
        return this._isTimeStopped;
    }

    set isTimeStopped(value) {
        if (this._isTimeStopped === value) return; // 状態が変わらないなら何もしない
        this._isTimeStopped = value;

        // --- 状態が変化した瞬間に、全てのシーンに影響を及ぼす ---
        this.broadcastTimeScale();
    }

    /**
     * ★★★ 新規メソッド：アクティブな全シーンに、タイムスケールを伝播させる ★★★
     */
    broadcastTimeScale() {
        const newTimeScale = this._isTimeStopped ? 0 : 1;
             // ★★★ ログ爆弾 No.5 ★★★
        console.log(`%c[LOG BOMB 5] broadcastTimeScale: Broadcasting new timeScale: ${newTimeScale}`, 'color: red; font-size: 1.2em; font-weight: bold;');
        // 現在アクティブな全てのシーンをループ
        for (const scene of this.game.scene.getScenes(true)) {
            // そのシーンが matter.world を持っているか（物理シーンか）を確認
            if (scene.matter && scene.matter.world) {
                // ★★★ これが、物理の世界の時間を止める、魔法の呪文だ ★★★
                scene.matter.world.engine.timing.timeScale = newTimeScale;
                
                console.log(`[SystemScene] Time scale of scene '${scene.scene.key}' set to ${newTimeScale}`);
            }
        }
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

        // --- 2. イベントリスナーの設定 ---
          this.events.on('request-scene-transition', this._startTransition, this);
           this.events.on('request-simple-transition', this._handleSimpleTransition, this);
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
         this.events.on('request-scene-resume', (sceneKey) => {
            const targetScene = this.scene.get(sceneKey);
            if (targetScene && targetScene.scene.isPaused()) {
                targetScene.scene.resume();
                console.log(`[SystemScene] Command received. Scene '${sceneKey}' has been resumed.`);
            }
        });
     // ★★★ 時間を再開させるための、公式な命令を追加 ★★★
        this.events.on('request-time-resume', () => {
            this.isTimeStopped = false;
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
                 this.editorUI.start(); 
            }
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        }
    }
 /**
     * 初期ゲームを起動する内部メソッド (改訂版)
     */

_startInitialGame(initialData) {
    this.globalCharaDefs = initialData.charaDefs;
    console.log(`[SystemScene] 初期ゲーム起動リクエストを受信。`);

    // ▼▼▼【ここからが修正箇所です】▼▼▼

    // --- UIScene専用の設定オブジェクトを定義 ---
    const uiSceneConfig = {
        physics: {
            matter: {
                enable: false // UISceneではMatter.jsを無効化する
            }
        }
    };

    // main.jsで登録されていないので、ここで必ず追加する
    if (!this.scene.get('UIScene')) {
        // ★第4引数に、専用の設定オブジェクトを渡す★
        this.scene.add('UIScene', UIScene, false, uiSceneConfig);
        console.log("[SystemScene] UISceneを「物理演算無効」で動的に追加しました。");
    }

    if (!this.scene.get('GameScene')) {
        // GameSceneはデフォルトの物理設定(matter: enable=true)を使いたいので、
        // 設定オブジェクトは渡さない（あるいは空の{}を渡す）
        this.scene.add('GameScene', GameScene, false);
        console.log("[SystemScene] GameSceneを動的に追加しました。");
    }
    
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
console.log(`%c[LOG BOMB B] == STARTING INITIAL GAME SEQUENCE ==`, 'background: #222; color: #ffff00; font-size: 1.4em;');
        
        console.log("[SystemScene] Starting initial game sequence...");
        
        // --- 1. これから起動する「待つべきシーン」をリストアップ ---
        this.scenesToWaitFor.add('UIScene');
        this.scenesToWaitFor.add('GameScene');

        // --- 2. 「すべてのシーン」の準備が完了した時の処理を予約 ---
        this.onAllScenesReadyCallback = () => {
            // このコールバックは、UISceneとGameSceneの両方がreportSceneReadyを呼んだ後に実行される
            this._onTransitionComplete('GameScene');
        };

        // --- 3. 起動と入力無効化 ---
        this.isProcessingTransition = true;
        this.game.input.enabled = false;
         // ★★★ ログ爆弾 C ★★★
        console.log(`%c[LOG BOMB C] >> COMMAND: RUN 'UIScene' >>`, 'background: #222; color: #00ffff; font-size: 1.2em;');
        this.scene.run('UIScene');
        
        // ★★★ ログ爆弾 D ★★★
        console.log(`%c[LOG BOMB D] >> COMMAND: RUN 'GameScene' >>`, 'background: #222; color: #00ffff; font-size: 1.2em;');
        this.scene.run('GameScene', {
            charaDefs: this.globalCharaDefs,
            startScenario: initialData.startScenario,
        });
    }
   /**
     * 他のシーンから「準備完了」の報告を受け取るための公式な窓口
     * @param {string} sceneKey - 報告元のシーンキー
     */
    reportSceneReady(sceneKey) {
           console.log(`%c[LOG BOMB A] << REPORT RECEIVED from [${sceneKey}] >>`, 'background: #222; color: #ff00ff; font-size: 1.2em;');
        console.log(`[SystemScene] Readiness report received from: ${sceneKey}`);
        this.scenesToWaitFor.delete(sceneKey); // 待機リストから削除

        // 待機リストが空になったら、コールバックを実行
        if (this.scenesToWaitFor.size === 0 && this.onAllScenesReadyCallback) {
            console.log(`[SystemScene] All scenes are ready!`);
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
        if (this.isProcessingTransition) return;
        
        console.log(`[SystemScene | Final Fix] Simple transition from ${data.from} to ${data.to}`);

        // --- 古いシーンを停止 ---
        this.scene.stop(data.from);
        
        // --- 新しいシーンを起動・監視 ---
        // ★ _startInitialGame と同じ、最も安全な方法に統一
        this._startAndMonitorScene(data.to, data.params);
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
        console.log(`[SystemScene] ノベル復帰リクエストを受信 (from: ${fromSceneKey})`);

        // 現在のGameSceneとサブシーンを停止させる
        if (this.scene.isActive('GameScene')) {
            this.scene.stop('GameScene');
        }
        if (this.scene.isActive(fromSceneKey)) {
            this.scene.stop(fromSceneKey);
        }
        
       const uiScene = this.scene.get('UIScene');
        if (uiScene) {
            // ★ ここでも onSceneTransition を呼ぶだけ
            uiScene.onSceneTransition('GameScene');
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
    /**
     * シーン遷移が完全に完了したときの処理
     * @param {string} sceneKey - 完了したシーンのキー
     */
     // _onTransitionComplete は変更なしでOK
    _onTransitionComplete(sceneKey) {
        this.isProcessingTransition = false;
        this.game.input.enabled = true;
        console.log(`[SystemScene] Transition to '${sceneKey}' is complete. Global input enabled.`);
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