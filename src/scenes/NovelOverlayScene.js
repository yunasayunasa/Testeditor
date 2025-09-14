import ScenarioManager from '../core/ScenarioManager.js';
import { tagHandlers } from '../handlers/index.js';
import handleOverlayEnd from '../handlers/scenario/overlay_end.js'; // パスを確認

export default class NovelOverlayScene extends Phaser.Scene {
    constructor() {
        super({ key: 'NovelOverlayScene' });
      
        this.messageWindow = null;
        // --- プロパティの初期化 (GameSceneとほぼ同じ) ---
        this.scenarioManager = null; this.uiScene = null; this.soundManager = null;
        this.stateManager = null; this.layer = {}; this.charaDefs = {};
        this.characters = {}; this.isSceneFullyReady = false;
        this.choiceButtons = []; this.pendingChoices = []; this.choiceInputBlocker = null;
        
        this.startScenario = null;
        this.returnTo = null;
        this.inputWasBlocked = false;

       
    } 

      init(data) {
        this.scene.bringToTop();
        this.startScenario = data.scenario;
        this.startLabel = data.target;
        this.charaDefs = data.charaDefs;
        this.returnTo = data.returnTo;
        this.inputWasBlocked = data.inputWasBlocked;
    }

    
    preload() {
        if (this.startScenario) {
            // シナリオキーから拡張子を取り除く (PreloadSceneとの互換性)
            const key = this.startScenario.replace('.ks', '');
            if (!this.cache.text.has(key)) {
                this.load.text(key, `assets/scenario/${this.startScenario}`);
            }
        }
    }
create() {
        console.log("%c[NovelOverlayScene] CREATE START", "color: orange; font-weight: bold;");
        
        // --- 1. サービスの参照を取得 ---
        this.uiScene = this.scene.get('UIScene');
        this.soundManager = this.registry.get('soundManager');
        this.stateManager = this.registry.get('stateManager');
        this.messageWindow = this.uiScene.uiElements.get('message_window');

        if (!this.messageWindow) {
            console.error("[NovelOverlayScene] CRITICAL: message_window not found.");
            return;
        }

        // --- 2. UIの準備 ---
       this.uiScene.setElementVisible('message_window', true);
     //   this.children.add(this.messageWindow); // ★ ウィンドウをこのシーンの管理下に置く

        // --- 3. レイヤーとScenarioManagerの生成 ---
        const OVERLAY_BASE_DEPTH = 1000;
        this.layer = {
            cg: this.add.container(0, 0).setDepth(OVERLAY_BASE_DEPTH + 5),
            character: this.add.container(0, 0).setDepth(OVERLAY_BASE_DEPTH + 10)
        };
        this.messageWindow.setDepth(OVERLAY_BASE_DEPTH + 20);
        
        this.scenarioManager = new ScenarioManager(this, this.messageWindow, this.stateManager, this.soundManager);
        // --- 5. タグハンドラを登録 ---
        for (const tagName in tagHandlers) { this.scenarioManager.registerTag(tagName, tagHandlers[tagName]); }
        this.scenarioManager.registerTag('overlay_end', handleOverlayEnd); // 専用タグを追加
           
         // --- 6. シナリオを開始 ---
        this.scenarioManager.loadScenario(this.startScenario, this.startLabel).then(() => {
            // ★ loadScenarioが終わってから、最初のnextを呼ぶ
            this._finalizeSetup();
        });
    }

   _finalizeSetup() {
        this.isSceneFullyReady = true;
        this.onClickHandler = () => { if (this.scenarioManager) this.scenarioManager.onClick(); };
        this.input.on('pointerdown', this.onClickHandler);
        
        this.time.delayedCall(10, () => this.scenarioManager.next());
        console.log("%c[NovelOverlayScene] CREATE COMPLETE", "color: orange; font-weight: bold;");
    }


  
     /**
     * StateManagerのf変数が変更されたときに呼び出されるリスナー
     * ★★★ 変更された変数がUIに関連する場合のみ、UISceneに通知する ★★★
     * @param {string} key - 変更された変数のキー
     * @param {*} value - 新しい値
     */
    onFVariableChanged(key, value) {
        // シーンの準備が完全に終わっていない場合は、何もしない
        if (!this.isSceneFullyReady) return;

        // ★★★ ここからが修正の核心 ★★★
        
        // 1. uiRegistryを取得する (SystemScene経由などが安全)
        const systemScene = this.scene.get('SystemScene');
        const uiRegistry = systemScene.registry.get('uiRegistry'); // SystemSceneで登録されていると仮定

        if (!uiRegistry) {
            console.warn('[GameScene] uiRegistry not found.');
            return;
        }

        // 2. 変更されたキー(key)が、いずれかのUI要素にwatchされているかチェック
        let isHudVariable = false;
        for (const definition of Object.values(uiRegistry)) {
            if (definition.watch && definition.watch.includes(key)) {
                isHudVariable = true;
                break; // 1つでも見つかればチェック終了
            }
        }
        
        // 3. HUDに関連する変数だった場合のみ、UISceneのupdateHudを呼び出す
        if (isHudVariable) {
            if (this.uiScene && typeof this.uiScene.updateHud === 'function') {
                this.uiScene.updateHud(key, value);
            }
        }
        
        // ★★★ ここまで修正 ★★★
        
        // f.love_meter など、UIに関係ない変数が変更された場合は、このメソッドは何もせずに終了する。
        // これにより、不要なupdateHud呼び出しとTypeErrorを防ぐ。
    }

    displayChoiceButtons() {
        // ブロッカーを表示。depthはcreateで設定済み
        this.choiceInputBlocker.setVisible(true);
        
        const totalButtons = this.pendingChoices.length;
        // Y座標の計算ロジックもあなたのものをそのまま使用
        const startY = (this.scale.height / 2) - ((totalButtons - 1) * 60); 

        this.pendingChoices.forEach((choice, index) => {
            const y = startY + (index * 120);
            
            // ボタンのスタイルもあなたのものをそのまま使用
            const button = this.add.text(this.scale.width / 2, y, choice.text, { fontSize: '40px', fill: '#fff', backgroundColor: '#555', padding: { x: 20, y: 10 }})
                .setOrigin(0.5)
                .setInteractive()
                .setDepth(30); // ★ ボタンを最前面に持ってくる (ブロッカーより手前)
    
            button.on('pointerdown', (pointer, localX, localY, event) => {
                // イベントの伝播を止めて、下のGameSceneのクリックリスナーが反応しないようにする
                event.stopPropagation();
                
                this.scenarioManager.jumpTo(choice.target);
                this.clearChoiceButtons();
                this.scenarioManager.next(); 
            });
    
            this.choiceButtons.push(button);
        });
    
        // 選択肢を表示したら、保留リストはクリアするのが一般的
        this.pendingChoices = [];
    }

    clearChoiceButtons() {
        this.choiceInputBlocker.setVisible(false);
        this.choiceButtons.forEach(button => button.destroy());
        this.choiceButtons = [];
        this.pendingChoices = [];
        
        if (this.scenarioManager) {
            this.scenarioManager.isWaitingChoice = false;
        }
    }

    /**
     * ★★★ 最終FIX版 ★★★
     * create で行ったことを、すべて元に戻す
     */
    shutdown() {
        console.log("%c[NovelOverlayScene] SHUTDOWN START", "color: orange; font-weight: bold;");

        // --- 1. イベントリスナーを解除 ---
        if (this.onClickHandler) {
            this.input.off('pointerdown', this.onClickHandler);
            this.onClickHandler = null;
        }

        // --- 2. ScenarioManagerを停止・破棄 ---
        if (this.scenarioManager) {
            this.scenarioManager.stop();
            this.scenarioManager = null;
        }

       // --- 3. このシーンに追加したすべての子オブジェクトを破棄 ---
        // ★ message_window はもうこのシーンの子ではないので、特別な処理は不要
        this.children.removeAll(true); // キャラクターレイヤーなどを破棄

        // --- 4. メッセージウィンドウを非表示にする ---
        // ★ 所有権はUISceneにあるので、単純に非表示命令を出すだけでOK
        if (this.uiScene) {
            this.uiScene.setElementVisible('message_window', false);
        }
        
        // --- 5. プロパティをリセット ---
        this.isSceneFullyReady = false;
        this.layer = {};
        this.characters = {};
        
        // --- 6. SystemSceneに終了を通知 ---
        this.scene.get('SystemScene').events.emit('end-overlay', {
            from: this.scene.key,
            returnTo: this.returnTo,
            inputWasBlocked: this.inputWasBlocked
        });
        
        console.log("%c[NovelOverlayScene] SHUTDOWN COMPLETE", "color: orange; font-weight: bold;");
    }
}