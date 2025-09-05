import ScenarioManager from '../core/ScenarioManager.js';
import { tagHandlers } from '../handlers/index.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        // プロパティの初期化
        this.scenarioManager = null; this.uiScene = null; this.soundManager = null;
        this.stateManager = null; this.layer = {}; this.charaDefs = {};
        this.characters = {}; this.isSceneFullyReady = false; this.loadSlot = null;
        this.choiceButtons = [];     // 表示されるボタンオブジェクトを保持する配列
        this.pendingChoices = [];    // [link]タグで定義された選択肢情報を保持する配列
        this.choiceInputBlocker = null; // クリックブロッカーへの参照
 
    }

    init(data) {
        this.charaDefs = data.charaDefs;
        this.startScenario = data.startScenario || 'test';
        this.loadSlot = data.loadSlot; // ロードするスロット番号を受け取る
        this.returnParams = data.returnParams || null;
    }

    preload() { this.load.text('test', 'assets/test.ks'); }

    create(data) {
        console.log("GameScene: create処理を開始します。");
        this.cameras.main.setBackgroundColor('#000000');
        
        this.uiScene = this.scene.get('UIScene');
        this.soundManager = this.registry.get('soundManager');
        this.stateManager = this.registry.get('stateManager');

        this.layer.background = this.add.container(0, 0).setDepth(0);
        this.layer.character = this.add.container(0, 0).setDepth(10);
        this.choiceInputBlocker = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height)
            .setInteractive()
            .setVisible(false)
            .setDepth(25); // メッセージウィンドウ(depth:?)より手前、選択肢ボタン(depth:30)より奥
        
        const messageWindow = this.uiScene.uiElements.get('message_window');
        if (!messageWindow) { return; }

        this.scenarioManager = new ScenarioManager(this, messageWindow, this.stateManager, this.soundManager);
        
        for (const tagName in tagHandlers) { this.scenarioManager.registerTag(tagName, tagHandlers[tagName]); }
  this.stateManager.on('f-variable-changed', this.onFVariableChanged, this);
        if (this.loadSlot !== undefined) {
            this.performLoad(this.loadSlot, this.returnParams).then(() => 
            this._finalizeSetup());
        } else {
            this.scenarioManager.loadScenario(this.startScenario);
            this._finalizeSetup();
            this.performSave(0);
            this.time.delayedCall(10, () => this.scenarioManager.next());
        }
    }

    _finalizeSetup() {
        this.isSceneFullyReady = true;
        this.input.on('pointerdown', () => { if (this.scenarioManager) this.scenarioManager.onClick(); });
        this.events.emit('gameScene-load-complete');
        console.log("GameScene: 準備完了。SystemSceneに通知しました。");
    }

     /**
     * StateManagerのf変数が変更されたときに呼び出されるリスナー
     * @param {string} key - 変更された変数のキー
     * @param {*} value - 新しい値
     */
    onFVariableChanged(key, value) {
        // シーンの準備が完全に終わっていない場合は、何もしない
        if (!this.isSceneFullyReady) return;

        // 処理をUISceneに丸投げする
        if (this.uiScene) {
            this.uiScene.updateHud(key, value);
        }
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

    performSave(slot) {
        try {
            const gameState = this.stateManager.getState(this.scenarioManager);
            const jsonString = JSON.stringify(gameState, null, 2);
            localStorage.setItem(`save_data_${slot}`, jsonString);
            console.log(`%cスロット[${slot}]にセーブしました。`, "color: limegreen;");
        } catch (e) {
            console.error(`セーブに失敗しました: スロット[${slot}]`, e);
        }
    }

    async performLoad(slot, returnParams = null) {
        console.log(`%c[performLoad] スロット[${slot}]からのロード処理を開始します。`, "color: orange;");
        try {
            const jsonString = localStorage.getItem(`save_data_${slot}`);
            if (!jsonString) {
                // ★ 早期リターン
                return console.error(`[performLoad] エラー: スロット[${slot}]のセーブデータが見つかりません。`);
            }
            
            console.log("[performLoad] セーブデータをJSONとしてパースします...");
            const loadedState = JSON.parse(jsonString);
            console.log("[performLoad] パース成功。");

            console.log("[performLoad] StateManagerに状態を復元させます...");
            this.stateManager.setState(loadedState);
            console.log("[performLoad] StateManagerの状態復元完了。");

            if (returnParams) {
                console.log("[performLoad] 復帰パラメータを反映します:", returnParams);
                for (const key in returnParams) {
                    const value = returnParams[key];
                    this.stateManager.eval(`${key} = ${JSON.stringify(value)}`);
                }
                console.log("[performLoad] 復帰パラメータの反映完了。");
            }

            console.log("[performLoad] 世界の再構築(rebuildScene)を開始します...");
            await rebuildScene(this, loadedState, this.restoredBgmKey);
            console.log("[performLoad] 世界の再構築(rebuildScene)が正常に完了しました。");
            
            this.events.emit('force-hud-update');

            if (loadedState.scenario.isWaitingClick || loadedState.scenario.isWaitingChoice) {
                console.log("[performLoad] ロード完了: 待機状態のため、ユーザーの入力を待ちます。");
            } else {
                console.log("[performLoad] ロード完了: 次の行からシナリオを再開します。");
                this.time.delayedCall(10, () => this.scenarioManager.next());
            }
        } catch (e) {
            // ★★★ エラーオブジェクト全体をログに出力する ★★★
            console.error("ロード処理でエラーが発生しました。", e);
        }
    }

    shutdown() {
        if (this.input) this.input.off('pointerdown');
    }
}

// ============================================================================
// rebuildScene ヘルパー関数 (デバッグ強化版)
// ============================================================================
async function rebuildScene(scene, loadedState, restoredBgmKey) {
    console.log("%c[rebuildScene] START", "color: cyan;", loadedState);
    const manager = scene.scenarioManager;

    try {
        console.log("[rebuildScene] 1. 表示クリア...");
        // scene.clearChoiceButtons();
        scene.layer.background.removeAll(true);
        scene.layer.character.removeAll(true);
        scene.characters = {};
        manager.messageWindow.reset();
        scene.cameras.main.resetFX();

        console.log("[rebuildScene] 2. シナリオ状態復元...");
        // ★ awaitをloadScenarioの呼び出しに移動
        const scenarioFileName = loadedState.scenario.fileName;
        console.log(`[rebuildScene]   - シナリオ[${scenarioFileName}]をロードします...`);
        await manager.loadScenario(scenarioFileName);
        console.log(`[rebuildScene]   - シナリオ[${scenarioFileName}]のロード完了。`);
        
        manager.currentLine = loadedState.scenario.line;
        manager.ifStack = loadedState.scenario.ifStack || [];
        manager.callStack = loadedState.scenario.callStack || [];
        manager.isWaitingClick = loadedState.scenario.isWaitingClick;
        manager.isWaitingChoice = loadedState.scenario.isWaitingChoice;
        console.log(`[rebuildScene]   - 復帰行: ${manager.currentLine}`);

        console.log("[rebuildScene] 3. 背景復元...");
        if (loadedState.layers.background) {
            const bg = scene.add.image(scene.scale.width / 2, scene.scale.height / 2, loadedState.layers.background);
            bg.setDisplaySize(scene.scale.width, scene.scale.height);
            scene.layer.background.add(bg);
        }
        
        console.log("[rebuildScene] 4. キャラクター復元...");
        if (loadedState.layers.characters) {
            for (const name in loadedState.layers.characters) {
                const charaData = loadedState.layers.characters[name];
                const chara = scene.add.image(charaData.x, charaData.y, charaData.storage);
                chara.setScale(charaData.scaleX, charaData.scaleY).setAlpha(charaData.alpha).setFlipX(charaData.flipX).setTint(charaData.tint);
                scene.layer.character.add(chara);
                scene.characters[name] = chara;
            }
        }

        console.log("[rebuildScene] 5. BGM復元...");
        const targetBgmKey = restoredBgmKey || loadedState.sound.bgm;
        if (targetBgmKey) {
            manager.soundManager.playBgm(targetBgmKey);
        } else {
            manager.soundManager.stopBgm();
        }

        console.log("[rebuildScene] 6. メッセージウィンドウ復元...");
        if (loadedState.scenario.isWaitingClick) {
            await manager.messageWindow.setText(loadedState.scenario.currentText, false, loadedState.scenario.speakerName);
            manager.messageWindow.showNextArrow();
        }
        
        console.log("%c[rebuildScene] END - 正常終了", "color: cyan;");

    } catch (e) {
        console.error("[rebuildScene] 世界の再構築中に致命的なエラーが発生しました。", e);
        // ★★★ エラーを再スローして、performLoadのcatchに捕獲させる ★★★
        throw e;
    }
}