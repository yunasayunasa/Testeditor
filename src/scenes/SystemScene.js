import SoundManager from '../core/SoundManager.js';
import EditorUI from '../editor/EditorUI.js';

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

        // --- 2. イベントリスナーの設定 ---
        this.events.on('request-scene-transition', this._handleRequestSceneTransition, this);
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
     * 初期ゲームを起動する内部メソッド (シーンマネージャーのイベントを利用)
     */
/**
     * 初期ゲームを起動する内部メソッド (最も堅牢なイベント監視)
     */
    _startInitialGame(initialData) {
        this.globalCharaDefs = initialData.charaDefs;
        console.log(`[SystemScene] 初期ゲーム起動リクエストを受信。`);
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これがタイミング問題を完全に解決する、真の最終修正です ★★★
        // this.scene.manager.events ではなく、 this.game.events を使う
        this.game.events.once('scene-wake-UIScene', () => {
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            
            console.log("[SystemScene] UIScene has woken up. Now starting GameScene.");
            
            this._startAndMonitorScene('GameScene', {
                charaDefs: this.globalCharaDefs,
                startScenario: initialData.startScenario,
            });

        });

        this.scene.launch('UIScene');
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
     * サブシーンからノベルパートへの復帰リクエストを処理 (最終修正版)
     * @param {object} data - { from: string, params: object }
     */
    _handleReturnToNovel(data) {
        console.log(`[SystemScene] ノベル復帰リクエスト: from ${data.from}`);

        if (this.scene.isActive(data.from)) {
            this.scene.stop(data.from);
        }
        if (this.scene.isActive('UIScene')) {
            this.scene.get('UIScene').setVisible(true);
        }

        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが今回の修正の核心 ★★★
        // ★★★ GameSceneが必要とするデータを全て渡す ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        this._startAndMonitorScene('GameScene', {
            charaDefs: this.globalCharaDefs, // ★★★ 最重要: キャラ定義を渡す！ ★★★
            resumedFrom: data.from,          // どこから来たかを伝える
            returnParams: data.params,       // サブシーンからの戻り値を渡す
            // startScenarioやstartLabelは、復帰処理(performLoad)で
            // セーブデータから復元されるので、ここでは不要
        });
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

// ... SystemScene.js の他のメソッド ...
      /**
     * ★★★ 新しいシーンを起動し、完了まで監視するコアメソッド (最終確定版) ★★★
     * @param {string} sceneKey - 起動するシーンのキー
     * @param {object} params - シーンに渡すデータ
     */
     /**
     * ★★★ 新しいシーンを起動し、完了まで監視するコアメソッド (真・最終確定版) ★★★
     * @param {string} sceneKey - 起動するシーンのキー
     * @param {object} params - シーンに渡すデータ
     */
    _startAndMonitorScene(sceneKey, params) {
        if (this.isProcessingTransition) {
            console.warn(`[SystemScene] 遷移処理中に新たな遷移リクエスト(${sceneKey})が、無視されました。`);
            return;
        }

        this.isProcessingTransition = true;
        this.game.input.enabled = false;
        console.log(`[SystemScene] シーン[${sceneKey}]の起動を開始。ゲーム全体の入力を無効化。`);
this.tweens.killAll();
        console.log("[SystemScene] すべての既存Tweenを強制終了しました。");

        // ★★★ 修正の核心 ★★★
        // 起動するシーンの「準備完了」を知らせるカスタムイベントを待つ
        const targetScene = this.scene.get(sceneKey);
        
        // GameSceneは 'gameScene-load-complete' を待つ
        if (sceneKey === 'GameScene') {
            targetScene.events.once('gameScene-load-complete', () => {
                this._onTransitionComplete(sceneKey);
            });
        } else {
            // GameScene以外は、'scene-ready' という共通イベントを待つ
            targetScene.events.once('scene-ready', () => {
                this._onTransitionComplete(sceneKey);
            });
        }

        // リスナーを登録した後に、シーンの起動をスケジュールする
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
}