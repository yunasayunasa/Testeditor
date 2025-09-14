
// src/scenes/NovelOverlayScene.js (最終確定・完成版)

import ScenarioManager from '../core/ScenarioManager.js';
import { tagHandlers } from '../handlers/index.js';
import handleOverlayEnd from '../handlers/scenario/overlay_end.js'; // パスを確認

export default class NovelOverlayScene extends Phaser.Scene {
    constructor() {
        super({ key: 'NovelOverlayScene' });
        
        // --- プロパティの初期化 ---
        this.scenarioManager = null;
        this.uiScene = null;
        this.soundManager = null;
        this.stateManager = null;
        this.layer = {};
        this.charaDefs = {};
        this.characters = {};
        this.isSceneFullyReady = false;
        
        this.startScenario = null;
        this.returnTo = null;
        this.inputWasBlocked = false;

        this.onClickHandler = null; // ★ リスナー解除のためにプロパティとして保持
    } 

    init(data) {
        this.scene.bringToTop();
        this.startScenario = data.scenario;
        this.charaDefs = data.charaDefs;
        this.returnTo = data.returnTo;
        this.inputWasBlocked = data.inputWasBlocked;
    }
    
    preload() {
        if (this.startScenario) {
            const key = this.startScenario.replace('.ks', '');
            if (!this.cache.text.has(key)) {
                this.load.text(key, `assets/scenario/${this.startScenario}`);
            }
        }
    }

    create() {
        console.log("[NovelOverlayScene] create 開始");
        
        // --- 1. サービスの参照を取得 ---
        this.uiScene = this.scene.get('UIScene');
        this.soundManager = this.registry.get('soundManager');
        this.stateManager = this.registry.get('stateManager');
        const messageWindow = this.uiScene.uiElements.get('message_window');

        if (!messageWindow) {
            console.error("[NovelOverlayScene] CRITICAL: message_window not found.");
            return;
        }

        // ★★★ 解決策 (A): UIの状態を、ルールブックに従って更新するよう依頼する ★★★
        // これにより、UISceneが'NovelOverlayScene'用のUI('game'グループ)を表示してくれる。
        // これには messageWindow.y を正しい位置に戻す処理も含まれる。
        this.scene.get('SystemScene').events.emit('transition-complete', this.scene.key);
        
      // --- 2. UIの準備 ---
    this.uiScene.showMessageWindow(); // 座標を戻す

    const OVERLAY_BASE_DEPTH = 10000;

    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★★★ これが最後の修正です ★★★
    // (A) メッセージウィンドウをUISceneから「借りて」、このシーンの子にする
    this.add.existing(messageWindow);
    // (B) このシーンの中で、depthを再設定する
    messageWindow.setDepth(OVERLAY_BASE_DEPTH + 20);
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

    // --- 3. レイヤーの生成 ---
    this.layer.cg = this.add.container(0, 0).setDepth(OVERLAY_BASE_DEPTH + 5);
    this.layer.character = this.add.container(0, 0).setDepth(OVERLAY_BASE_DEPTH + 10);
        this.scenarioManager = new ScenarioManager(this, messageWindow, this.stateManager, this.soundManager);
        
        // --- 4. タグハンドラの登録 ---
        for (const tagName in tagHandlers) { this.scenarioManager.registerTag(tagName, tagHandlers[tagName]); }
        // ★ handleOverlayEndは、強制執行FIX版を使うことを想定
        this.scenarioManager.registerTag('overlay_end', handleOverlayEnd);
           
        // --- 5. シナリオを開始 ---
        this.scenarioManager.loadScenario(this.startScenario).then(() => {
            this._finalizeSetup();
        });
    }

    _finalizeSetup() {
        this.isSceneFullyReady = true;
        // ★ クリックハンドラをプロパティに保存
        this.onClickHandler = () => { if (this.scenarioManager) this.scenarioManager.onClick(); };
        this.input.on('pointerdown', this.onClickHandler);
        
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
shutdown() {
        console.log("[NovelOverlayScene] shutdown されました。");
  // --- shutdownの最後に、特別扱いをやめさせる ---
    // ★★★ 念のため、depthを元のデフォルト値に戻すよう依頼する ★★★
    // uiRegistryからデフォルト値を取得する
    const uiRegistry = this.registry.get('uiRegistry');
    const defaultDepth = uiRegistry?.message_window?.params?.depth || 10; // デフォルト値がなければ10など
    this.uiScene.setElementDepth('message_window', defaultDepth);
        // ★★★ 解決策 (B): createで行ったことを、すべて元に戻す ★★★

        // --- 1. イベントリスナーを確実に解除 ---
        if (this.onClickHandler) {
            this.input.off('pointerdown', this.onClickHandler);
            this.onClickHandler = null;
        }
const messageWindow = this.uiScene.uiElements.get('message_window');
    if (messageWindow) {
        // (A) このシーンから取り除く
        this.children.remove(messageWindow);
        // (B) UISceneに返却する
        this.uiScene.add.existing(messageWindow);
    }
        // --- 2. ScenarioManagerを停止・破棄 ---
        if (this.scenarioManager) {
            this.scenarioManager.stop();
            this.scenarioManager = null;
        }

        // --- 3. このシーンが生成したすべてのオブジェクトを破棄 ---
        // (レイヤーコンテナと、その中のキャラクターなど)
        this.children.removeAll(true);
        
        // --- 4. プロパティをリセット ---
        this.isSceneFullyReady = false;
        this.layer = {};
        this.characters = {};

        // ★★★ このshutdownは、[overlay_end]ハンドラから「明示的に」呼ばれる ★★★
        // したがって、ここでイベントを発行する必要はない。
    }
}