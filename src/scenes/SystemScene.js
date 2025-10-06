import SoundManager from '../core/SoundManager.js';
import EditorUI from '../editor/EditorUI.js';
import UIScene from './UIScene.js';
import GameScene from './GameScene.js'; 
import OverlayScene from './OverlayScene.js'; 
import ActionInterpreter from '../core/ActionInterpreter.js'; // ★ インポート
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
        this.gameState = 'INITIALIZING';
        this.gameFlow = null;         // game_flow.jsonのデータを保持
        this.currentState = null;     // 現在のゲームフローステート名 (e.g., 'Title', 'Gameplay')
        this.previousState = null;    // 一つ前のステート名（MainMenuからの復帰などで使用）
        
    this.sceneStack = [];
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
        // PreloadSceneから渡されたinitialGameDataが存在するかチェック
        if (data && data.initialGameData && data.initialGameData.charaDefs) {
            // 受け取ったキャラクター定義を、自身のプロパティに即座に保存する
            this.globalCharaDefs = data.initialGameData.charaDefs;
            console.log(`%c[SystemScene] Global character definitions received and stored successfully.`, 'color: lightgreen; font-weight: bold;');
        } else {
            // データが渡されなかった場合も、空のオブジェクトで初期化しておく
            this.globalCharaDefs = {};
            console.warn('[SystemScene] No initial game data or charaDefs found. Initializing with empty definitions.');
        }

        // 古いinitialGameDataプロパティはもはや不要
        this.initialGameData = null;
    }

    // src/scenes/SystemScene.js

create() {
    console.log("SystemScene: 起動・グローバルサービスのセットアップを開始。");
    
    // --- 1. コアサービスの初期化（最優先） ---
    const soundManager = new SoundManager(this.game);
    this.registry.set('soundManager', soundManager);
    this.input.once('pointerdown', () => soundManager.resumeContext(), this);
    console.log("SystemScene: SoundManagerを登録しました。");

    // ★★★ ActionInterpreterを、それを使う全ての処理の「前」に生成・登録する ★★★
    const actionInterpreter = new ActionInterpreter(this.game);
    this.registry.set('actionInterpreter', actionInterpreter);
    console.log("SystemScene: ActionInterpreter has been registered globally.");

    // --- 2. ゲームフロー・ステートマシンの初期化 ---
    this.gameFlow = this.cache.json.get('game_flow');
    if (!this.gameFlow) {
        console.error("CRITICAL: 'game_flow.json' not found. Game cannot start.");
        return; // game_flow.jsonがないと何もできないので、ここで処理を中断
    }
    // ゲームフローイベントのリスナーを設定。全ての遷移はこれを経由する。
    this.events.on('request_game_flow_event', this.handleGameFlowEvent, this);
    
    // --- 3. その他のイベントリスナーの設定（ポーズメニューなど） ---
    // これらは今後、request_game_flow_event に置き換えられていく
    this.events.on('request-pause-menu', this.handleOpenPauseMenu, this);
    this.events.on('request-close-menu', this.handleClosePauseMenu, this);
    this.events.on('request-time-resume', () => { this.isTimeStopped = false; });
    
    // --- 4. エディタ関連の初期化 ---
    this.initializeEditor();
     
    // --- 5. ゲームの起動 ---
    // 古い _startInitialGame() を呼び出すのではなく、ステートマシンを初期ステートに遷移させることでゲームを開始する
    
    // 5a. まず、ゲームに必要なシーン（UISceneなど）を動的に追加する
    if (!this.scene.get('UIScene')) {
        this.scene.add('UIScene', UIScene, false, { physics: { matter: { enable: false } } });
        console.log("[SystemScene] UISceneを動的に追加しました。");
    }
    if (!this.scene.get('GameScene')) {
        this.scene.add('GameScene', GameScene, false);
        console.log("[SystemScene] GameSceneを動的に追加しました。");
    }
     if (!this.scene.get('OverlayScene')) {
        this.scene.add('OverlayScene', OverlayScene, false);
        console.log("[SystemScene] OverlaySceneを動的に追加しました。");
    }
    // JumpSceneなども必要ならここで追加する

    // 5b. UISceneだけは、常に裏で動いていてほしいので、先に起動しておく
    this.scene.run('UIScene');
    // UISceneの準備完了を待つ必要があれば、イベントリスナーを使う
    this.scene.get('UIScene').events.once('scene-ready', () => {
        console.log('[SystemScene] UIScene is ready. Starting game flow.');
        // 5c. UISceneの準備ができてから、ゲームフローを開始する
        this.transitionToState(this.gameFlow.initialState);
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
    this.globalCharaDefs = initialData.charaDefs;
    console.log(`[SystemScene] 初期ゲーム起動リクエストを受信。`);
console.log(`[SystemScene] グローバルキャラクター定義を保持しました。`);
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
    if (!this.scene.get('OverlayScene')) {
        this.scene.add('OverlayScene', OverlayScene, false);
        console.log("[SystemScene] OverlaySceneを動的に追加しました。");
    }
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    const uiScene = this.scene.get('UIScene');

    uiScene.events.once('scene-ready', () => {
        console.log("[SystemScene] UIScene is ready. Now starting GameScene.");
        
        this._startAndMonitorScene('GameScene', {
            charaDefs: this.globalCharaDefs,
            startScenario: initialData.startScenario,
        });
    });

    console.log("[SystemScene] Running UIScene now.");
    this.scene.run('UIScene');
}
// in src/scenes/SystemScene.js

/**
 * ★★★ 新設：ポーズメニューを開く専用ハンドラ (最終修正版) ★★★
 * @param {{ from: string, layoutKey: string, params?: object }} data
 */
handleOpenPauseMenu(data) {
    const fromScene = data.from;
    const menuLayoutKey = data.layoutKey; // ★★★ 'sceneKey' -> 'layoutKey' に修正 ★★★

    // 起動するオーバーレイシーンの名前は、ここでは'OverlayScene'に固定
    const sceneToLaunch = 'OverlayScene';

    if (this.scene.isActive(fromScene)) {
        console.log(`[SystemScene] Pausing '${fromScene}' to open overlay '${sceneToLaunch}' with layout '${menuLayoutKey}'.`);
        
        // 1. 背後のシーンをポーズ
        this.scene.pause(fromScene);
        // 2. 状態を記録
        this.sceneStack.push(fromScene);
        this.gameState = 'MENU';
        
        // 3. 汎用的なOverlaySceneを起動し、どのレイアウトを使うかを渡す
        this.scene.launch(sceneToLaunch, { layoutKey: menuLayoutKey, ...data.params });
    }
}

/**
 * ★★★ 新設：ポーズメニューを閉じる専用ハンドラ ★★★
 * @param {{ from: string }} data
 */
// in src/scenes/SystemScene.js

handleClosePauseMenu(data) {
    console.log("handleClosePauseMenu called with data:", data);
    const closingMenu = data.from; // 'OverlayScene' が渡される
    
    // ★ スタックが空でないことを確認
    if (this.sceneStack.length === 0) {
        console.error("[SystemScene] Close menu requested, but scene stack is empty!");
        // 緊急脱出として、タイトルに戻るなどの処理
        return;
    }

    const sceneToResume = this.sceneStack.pop();

    if (sceneToResume) {
        console.log(`[SystemScene] Closing menu '${closingMenu}' and resuming '${sceneToResume}'.`);

        // 1. メニューシーンを停止
        this.scene.stop(closingMenu);
        
        // 2. 元のシーンを再開
        if (this.scene.isPaused(sceneToResume)) {
            this.scene.resume(sceneToResume);
        } else {
            // もし何らかの理由でポーズされていなくても、アクティブにする
            this.scene.run(sceneToResume);
            this.scene.bringToTop(sceneToResume);
            this.scene.bringToTop('UIScene'); // UISceneは常に上に
        }
        
        // 3. 状態を戻す
        this.gameState = (sceneToResume === 'GameScene') ? 'NOVEL' : 'GAMEPLAY';
    }
}

 /**
     * [jump]や[transition_scene]によるシーン遷移リクエストを処理する (最終確定版)
     * @param {object} data - { from: string, to: string, params: object, fade: object }
     */
     /**
     * ★★★ 最終FIX版 ★★★
     * [transition_scene]などから呼ばれる、最も基本的なシーン遷移
     */
   // in src/scenes/SystemScene.js

_handleSimpleTransition(data) {
    const { from, to, params } = data;

    // ★★★ 状態の更新は、遷移が「開始」されたこのタイミングで行うのが正しい ★★★
    this.gameState = (to === 'GameScene') ? 'NOVEL' : 'GAMEPLAY';
    this.sceneStack = [to];
    console.log(`[State Logger] Game state changing to: ${this.gameState}`);

    // --- ここからが、安全なシーン切り替えのロジック ---
    const sceneToStop = this.scene.get(from);

    if (sceneToStop && sceneToStop.scene.isActive() && from !== 'UIScene') {
        
        // 1. 停止対象シーンの 'shutdown' イベントを一度だけリッスン
        sceneToStop.events.once('shutdown', () => {
            console.log(`[SystemScene] '${from}' has shut down. Now starting '${to}'.`);
            
            // 2. shutdown完了後に、新しいシーンを開始
            this._startAndMonitorScene(to, params);
        });

        // 3. シーンの停止を命令
        this.scene.stop(from);

    } else {
        // 停止すべきシーンがない場合（最初の起動など）は、直接新しいシーンを開始
        this._startAndMonitorScene(to, params);
    }
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
     * ★★★ 最終FIX版 ★★★
     * [return_novel]から呼ばれる、ノベルパートへの復帰
     */
    _handleReturnToNovel(data) {
        const fromSceneKey = data.from;

        // --- 1. 古い「ゲームシーン」を停止する ---
        // ★ 呼び出し元が'UIScene'であっても、他のシーンであっても、
        //    'UIScene'以外なら停止する
        if (this.scene.isActive(fromSceneKey) && fromSceneKey !== 'UIScene') {
            this.scene.stop(fromSceneKey);
        }
        
        // --- 2. GameSceneを起動し、完了を待つ ---
        this._startAndMonitorScene('GameScene', { 
            loadSlot: 0, 
            charaDefs: this.globalCharaDefs
        });

        this.gameState = 'NOVEL';
    this.sceneStack = ['GameScene'];
    console.log(`[State Logger] Game state changed to: ${this.gameState}`);
    }

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
  // ★★★ 2. UISceneに、UIの状態を「戻り先」のシーン用に更新するよう命令 ★★★
        const uiScene = this.scene.get('UIScene');
        if (uiScene) {
            console.log(`[SystemScene] Requesting UI update for scene: ${data.returnTo}`);
            uiScene.onSceneTransition(data.returnTo);
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
        this.isTimeStopped = false;
    }

   /**
     * ★★★ 新しい、中核となるシーン起動ヘルパー (最終FIX版) ★★★
     * @param {string} sceneKey - 起動するシーンのキー
     * @param {object} params - シーンに渡すデータ
     */
    // src/scenes/SystemScene.js

/**
 * ★★★ UI表示問題を解決する最終確定版 ★★★
 * シーンを起動し、完了を監視する中核ヘルパー
 */
_startAndMonitorScene(sceneKey, params = {}) {
    if (this.isProcessingTransition) { return; }
    this.isProcessingTransition = true;
    
    // ▼▼▼【ここが核心の修正】▼▼▼
    // --- 1. シーンを起動する「前」に、まずUIの状態を更新する命令を出す ---
    const uiScene = this.scene.get('UIScene');
    if (uiScene && typeof uiScene.onSceneTransition === 'function') {
        // UISceneが準備完了しているかに関わらず、遷移先のキーを伝える
        console.log(`[SystemScene] Pre-notifying UIScene about transition to '${sceneKey}'.`);
        uiScene.onSceneTransition(sceneKey);
    }
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    const targetScene = this.scene.get(sceneKey);
    const completionEvent = (sceneKey === 'GameScene') ? 'gameScene-load-complete' : 'scene-ready';

    // --- 2. 目的のシーンの準備完了を待つ ---
    targetScene.events.once(completionEvent, () => {
        console.log(`[SystemScene] Scene '${sceneKey}' is ready.`);
        
        // ジョイスティックの生成命令などは、シーンの準備完了後に行う
        if (sceneKey === 'JumpScene') {
            if (typeof targetScene.setupJoystick === 'function') {
                targetScene.setupJoystick();
            }
        }

        // --- 3. カメラのフェードインと遷移完了処理 ---
        this.cameras.main.fadeFrom(300, 0, 0, 0, false, (camera, progress) => {
            if (progress === 1) {
                this.isProcessingTransition = false;
                this.game.input.enabled = true;
                this.events.emit('transition-complete', sceneKey);
            }
        });
    });

    // --- 4. 実際にシーンを起動する ---
    this.scene.run(sceneKey, params);
}
    /**
     * シーン遷移が完全に完了したときの処理
     * @param {string} sceneKey - 完了したシーンのキー
     */
    _onTransitionComplete(sceneKey) {
        this.isProcessingTransition = false;
        this.game.input.enabled = true;
        console.log(`[SystemScene] シーン[${sceneKey}]の遷移が完了。ゲーム全体の入力を再有効化。`);
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

    // src/scenes/SystemScene.js (クラス内のどこか)

/**
 * ★★★ 新設：ゲームフローステートを遷移させるための中核メソッド ★★★
 * @param {string} newStateName - 遷移先のステート名
 */
transitionToState(newStateName) {
    if (!this.gameFlow.states[newStateName]) {
        console.error(`[GameFlow] Attempted to transition to unknown state: '${newStateName}'`);
        return;
    }

    const actionInterpreter = this.registry.get('actionInterpreter');
    const oldStateName = this.currentState;

    console.log(`%c[GameFlow] State Transition: ${oldStateName || 'null'} -> ${newStateName}`, 'color: #7b1fa2; font-weight: bold;');

    // --- 1. 現在のステートの onExit アクションを実行 ---
    if (oldStateName && this.gameFlow.states[oldStateName].onExit) {
        console.log(`[GameFlow] Executing onExit for state '${oldStateName}'`);
        this.gameFlow.states[oldStateName].onExit.forEach(action => {
            actionInterpreter.runVSLFromData(action); // 新しいヘルパーメソッドを想定
        });
    }

    // --- 2. ステートを更新 ---
    this.previousState = oldStateName;
    this.currentState = newStateName;
    
    // gameStateプロパティも更新しておく（下位互換性のため）
    this.gameState = newStateName;

    // --- 3. 新しいステートの onEnter アクションを実行 ---
    const newState = this.gameFlow.states[newStateName];
    if (newState.onEnter) {
        console.log(`[GameFlow] Executing onEnter for state '${newStateName}'`);
        newState.onEnter.forEach(action => {
            // @previousState のような特別な値を解決する
            const resolvedAction = this.resolvePlaceholders(action);
            actionInterpreter.runVSLFromData(resolvedAction);
        });
    }
}

/**
 * ★★★ 新設：イベントに基づいて状態遷移を試みるハンドラ ★★★
 * @param {string} eventName - 発生したイベント名
 */
handleGameFlowEvent(eventName) {
    if (!this.currentState) return;

    const currentState = this.gameFlow.states[this.currentState];
    if (!currentState || !currentState.transitions) return;

    const transition = currentState.transitions.find(t => t.event === eventName);

    if (transition) {
        console.log(`[GameFlow] Event '${eventName}' triggered transition to '${transition.target}'`);
        
        let targetState = transition.target;
        // @previousState キーワードを解決
        if (targetState === '@previousState') {
            targetState = this.previousState || this.gameFlow.initialState; //  fallback
        }

        this.transitionToState(targetState);
    }
}

/**
 * ★★★ 新設ヘルパー：アクションデータ内のプレースホルダーを解決する ★★★
 * @param {object} action - VSLアクションデータ
 * @returns {object} 解決後のアクションデータ
 */
resolvePlaceholders(action) {
    const resolvedAction = JSON.parse(JSON.stringify(action)); // Deep copy
    if (resolvedAction.params) {
        for (const key in resolvedAction.params) {
            if (resolvedAction.params[key] === '@previousState') {
                resolvedAction.params[key] = this.previousState;
            }
        }
    }
    return resolvedAction;
}
}