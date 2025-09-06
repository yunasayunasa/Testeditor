// src/scenes/BaseNovelScene.js (新規作成)
import ScenarioManager from '../core/ScenarioManager.js';
import { tagHandlers } from '../handlers/index.js';

export default class BaseNovelScene extends Phaser.Scene {
    constructor(config) {
        super(config);
        // プロパティの初期化
        this.scenarioManager = null; this.uiScene = null; this.soundManager = null;
        this.stateManager = null; this.layer = {}; this.charaDefs = {};
        this.characters = {}; this.isSceneFullyReady = false;
        this.choiceButtons = []; this.pendingChoices = [];
             // --- シナリオ実行の基本プロパティ ---
        this.scenarioManager = null;
        this.uiScene = null;
        this.soundManager = null;
        this.stateManager = null;
        
        // --- 表示レイヤー ---
        this.layer = {};
        this.charaDefs = {};
        this.characters = {};

        // --- 状態フラグ ---
        this.isSceneFullyReady = false;
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが全てを解決する、唯一の修正です ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // --- 選択肢機能のためのプロパティ ---
        this.choiceButtons = [];     // 表示されるボタンオブジェクトを保持する配列
        this.pendingChoices = [];    // [link]タグで定義された選択肢情報を一時的に保持する配列
        this.choiceInputBlocker = null; // クリックをブロックするための透明な矩形
        
    }

    // initとpreloadは、子クラスで個別に実装

    create(data) {
        console.log(`[${this.scene.key}] create処理を開始します。`);
        
        this.uiScene = this.scene.get('UIScene');
        this.soundManager = this.registry.get('soundManager');
        this.stateManager = this.registry.get('stateManager');

        this.layer.background = this.add.container(0, 0).setDepth(0);
        this.layer.cg = this.add.container(0, 0).setDepth(5);
        this.layer.character = this.add.container(0, 0).setDepth(10);
        
        const messageWindow = this.uiScene.uiElements.get('message_window');
        if (!messageWindow) { return; }

        this.scenarioManager = new ScenarioManager(this, messageWindow, this.stateManager, this.soundManager);
        
        for (const tagName in tagHandlers) { this.scenarioManager.registerTag(tagName, tagHandlers[tagName]); }
        
        // 子クラスで追加のタグ登録ができるように、フックメソッドを用意
        this.registerCustomTags();
 this.scenarioManager.loadScenario(this.startScenario);
        this._finalizeSetup();
    }

    registerCustomTags() {
        // 子クラスでオーバーライドするためのメソッド
    }

    _finalizeSetup() {
        this.isSceneFullyReady = true;
        this.input.on('pointerdown', () => { if (this.scenarioManager) this.scenarioManager.onClick(); });
        
        // 子クラスに応じた完了イベントを発行
        const completeEvent = this.scene.key === 'GameScene' ? 'gameScene-load-complete' : 'overlayScene-load-complete';
        this.events.emit(completeEvent);
        console.log(`[${this.scene.key}] 準備完了。${completeEvent}を発行しました。`);

        this.time.delayedCall(10, () => {
             this.scenarioManager.next();
        });
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
        console.log(`[${this.scene.key}] shutdown処理`);
        if (this.input) this.input.off('pointerdown');
        // 他のクリーンアップ処理もここに追加
    }
}