import ScenarioManager from '../core/ScenarioManager.js';
import { tagHandlers } from '../handlers/index.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        // プロパティをnullで、かつシンプルに初期化
        this.scenarioManager = null;
        this.uiScene = null;
        this.soundManager = null;
        this.stateManager = null;
        this.layer = {};
        this.charaDefs = {};
        this.characters = {}; // キャラクターオブジェクトを保持する場所
        this.isSceneFullyReady = false;
    }

    init(data) {
        // SystemSceneから渡されるデータをプロパティに保存
        this.charaDefs = data.charaDefs;
        this.startScenario = data.startScenario || 'test'; // .ksは不要
    }

    preload() {
        // 事前に読み込むシナリオファイル
        this.load.text('test', 'assets/test.ks'); 
    }

    create() {
        console.log("GameScene: create処理を開始します。");
        this.cameras.main.setBackgroundColor('#000000');
        
        // --- 1. 必須オブジェクトとサービスの取得（最優先） ---
        this.uiScene = this.scene.get('UIScene');
        this.soundManager = this.registry.get('soundManager');
        this.stateManager = this.registry.get('stateManager');

        // --- 2. レイヤーの生成 ---
        this.layer.background = this.add.container(0, 0).setDepth(0);
        this.layer.character = this.add.container(0, 0).setDepth(10);
        
        // --- 3. MessageWindowの取得 ---
        const messageWindow = this.uiScene.uiElements.get('message_window');
        if (!messageWindow) {
            console.error("GameScene 致命的エラー: 'message_window'がUISceneに見つかりません。");
            return;
        }

        // --- 4. ScenarioManagerの生成（全ての材料が揃ってから）---
        this.scenarioManager = new ScenarioManager(this, messageWindow, this.stateManager, this.soundManager);
        
        // --- 5. タグハンドラの登録 ---
        console.log("[GameScene] タグハンドラの登録を開始します...");
        for (const tagName in tagHandlers) {
            this.scenarioManager.registerTag(tagName, tagHandlers[tagName]);
        }
        console.log(`[GameScene] ${Object.keys(tagHandlers).length}個のタグハンドラを登録しました。`);

        // --- 6. シナリオの読み込み ---
        this.scenarioManager.load(this.startScenario);
        
        // --- 7. 最終準備と入力受付開始 ---
        this._finalizeSetup();
    }

    /**
     * シーンのセットアップ最終処理
     */
    _finalizeSetup() {
        console.log("GameScene: 最終準備を開始します。");
        this.isSceneFullyReady = true;

        // クリック（タップ）でシナリオを進めるためのリスナーを設定
        this.input.on('pointerdown', () => {
            if (this.isSceneFullyReady && this.scenarioManager) {
                this.scenarioManager.onClick();
            }
        });
        
        // 準備完了をSystemSceneに通知
        this.events.emit('gameScene-load-complete');
        console.log("GameScene: 準備完了。SystemSceneに通知しました。");

        // 最初の行へ進むように指示
        this.time.delayedCall(10, () => {
             this.scenarioManager.next();
        });
    }

    shutdown() {
        console.log("GameScene: shutdown処理");
        if (this.input) {
            this.input.off('pointerdown');
        }
    }
}
