import ScenarioManager from '../core/ScenarioManager.js';
import { tagHandlers } from '../handlers/index.js';
import handleOverlayEnd from '../handlers/scenario/overlay_end.js'; // パスを確認

export default class NovelOverlayScene extends Phaser.Scene {
    constructor() {
        super({ key: 'NovelOverlayScene' });
        
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
        this.scene.bringToTop(); // ★ 自身を最前面に持ってくる
        this.startScenario = data.scenario;
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
        console.log("[NovelOverlayScene] create 開始");
        
        // --- 1. グローバルサービスとUISceneを取得 ---
        this.uiScene = this.scene.get('UIScene');
        this.soundManager = this.registry.get('soundManager');
        this.stateManager = this.registry.get('stateManager');

   
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // 1. オーバーレイ用の巨大なdepth基準値を定義
        const OVERLAY_BASE_DEPTH = 1000;

        // 2. GameSceneと全く同じ構造で、かつ高いdepth値を持つレイヤーを生成
        this.layer.cg = this.add.container(0, 0).setDepth(OVERLAY_BASE_DEPTH + 5);
        this.layer.character = this.add.container(0, 0).setDepth(OVERLAY_BASE_DEPTH + 10);
        this.choiceInputBlocker = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height)
            .setInteractive().setVisible(false).setDepth(25);
        this.uiScene = this.scene.get('UIScene');

        // ★★★ 「使う宣言」を追加 ★★★
        if (this.uiScene) {
            this.uiScene.setElementVisible('message_window', true);
        }
        // 3. UISceneからmessageWindowを取得し、そのdepthも引き上げる
        const messageWindow = this.uiScene.uiElements.get('message_window');
        this.uiScene.children.remove(messageWindow);

        // --- 2. メッセージウィンドウを、このNovelOverlaySceneに所属させる ---
        this.add.existing(messageWindow);
        if (!messageWindow) { return; }
        messageWindow.setDepth(OVERLAY_BASE_DEPTH + 20);
 console.log(`%c[LOG BOMB A] UIScene found:`, 'color: cyan', this.uiScene);
        
       
        
        console.log(`%c[LOG BOMB B] Message window found:`, 'color: cyan', messageWindow);

        if (messageWindow) {
            console.log(`%c[LOG BOMB C] Message window properties:
                - visible: ${messageWindow.visible}
                - alpha: ${messageWindow.alpha}
                - depth: ${messageWindow.depth}`, 'color: cyan');
            
            // ★★★ 強制的に表示させてみる ★★★
            messageWindow.setVisible(true);
            messageWindow.setAlpha(1);

        } else {
            console.error("%c[LOG BOMB FAILED] Could not get 'message_window' from UIScene!", 'color: red; font-weight: bold;');
        }
        // 4. ScenarioManagerに、新しく作った`this` (NovelOverlayScene) を渡す
        //    (これにより、manager.scene.layerが正しく参照される)
        this.scenarioManager = new ScenarioManager(this, messageWindow, this.stateManager, this.soundManager);
        
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

        // ▼▼▼ リスナー登録を、後で解除できるように参照を保持する ▼▼▼
        this.onClickHandler = () => { if (this.scenarioManager) this.scenarioManager.onClick(); };
        this.input.on('pointerdown', this.onClickHandler);
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        this.time.delayedCall(10, () => this.scenarioManager.next());
        console.log("[NovelOverlayScene] create 完了");
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
     * シーン終了時に、createで生成したものをすべて破棄・リセットする
     */
    shutdown() {
        console.log("[NovelOverlayScene] shutdown されました。");

        // --- 1. 登録したイベントリスナーを解除 ---
        if (this.onClickHandler) {
            this.input.off('pointerdown', this.onClickHandler);
            this.onClickHandler = null;
        }

        // --- 2. ScenarioManagerを停止・破棄 ---
        if (this.scenarioManager) {
            this.scenarioManager.stop();
            this.scenarioManager = null; // ★ 参照を完全に破棄
        }

        // --- 3. このシーンに追加したすべての子オブジェクト（キャラクターレイヤーなど）を破棄 ---
        // これにより、2回目のcreateで新しいレイヤーが作られる
        this.children.removeAll(true); // ★ trueで子要素もdestroy

        // --- 4. メッセージウィンドウをUISceneに戻す ---
        const messageWindow = this.uiScene.uiElements.get('message_window');
        if (messageWindow) {
            // ★ 親が既に破棄されている可能性があるので、add.existingの前にシーンの所属を確認
            if (messageWindow.scene !== this.uiScene) {
                 this.uiScene.add.existing(messageWindow);
            }
        }
        
        // --- 5. プロパティを初期値に戻す ---
        this.isSceneFullyReady = false;
        this.characters = {}; // キャラクター参照もリセット
        
        // --- 6. SystemSceneに終了を通知 (変更なし) ---
        this.scene.get('SystemScene').events.emit('end-overlay', {
            from: this.scene.key,
            returnTo: this.returnTo,
            inputWasBlocked: this.inputWasBlocked
        });
    }
}