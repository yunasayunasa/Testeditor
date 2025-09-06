import BaseNovelScene from './BaseNovelScene.js';

// rebuildScene関数は変更なし

export default class GameScene extends BaseNovelScene {
    constructor() {
        super({ key: 'GameScene' });
        this.loadSlot = null;
    }

    init(data) {
        this.charaDefs = data.charaDefs;
        this.startScenario = data.startScenario || 'test';
        this.loadSlot = data.loadSlot;
    }

    preload() { this.load.text('test', 'assets/test.ks'); }

    create() {
        // ロードモードに応じた分岐は維持
        if (this.loadSlot !== undefined) {
            // 親のcreateを呼ばずに、直接ロード処理を開始
            // (ロード処理自体がcreateの役割を果たすため)
            this.performLoad(this.loadSlot).then(() => this._finalizeSetup());
        } else {
            // 通常起動の場合は、親のcreateメソッドを呼び出す
            super.create();
            this.performSave(0);
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
        console.log(`スロット[${slot}]からのロード処理を開始します。`);
        try {
            const jsonString = localStorage.getItem(`save_data_${slot}`);
            if (!jsonString) {
                console.error(`スロット[${slot}]のセーブデータが見つかりません。`);
                return;
            }
            const loadedState = JSON.parse(jsonString);
            this.stateManager.setState(loadedState);

            if (returnParams) {
                console.log("復帰パラメータを反映します:", returnParams);
                for (const key in returnParams) {
                    const value = returnParams[key];
                    let evalExp;

                    if (typeof value === 'string') {
                        evalExp = `${key} = \`${value.replace(/`/g, '\\`')}\``; 
                    } else if (typeof value === 'number' || typeof value === 'boolean') {
                        evalExp = `${key} = ${value}`;
                    } else if (typeof value === 'object' && value !== null) {
                        try {
                            const stringifiedValue = JSON.stringify(value).replace(/`/g, '\\`'); 
                            evalExp = `${key} = JSON.parse(\`${stringifiedValue}\`)`;
                        } catch (e) {
                            console.warn(`[GameScene] returnParamsでJSONシリアライズできないオブジェクトが検出されました。スキップします： ${key} =`, value, e);
                            continue; 
                        }
                    } else {
                        console.warn(`[GameScene] 未知の型のreturnParams値が検出されました。スキップします： ${key} =`, value);
                        continue; 
                    }

                    this.stateManager.eval(evalExp);
                }
            }

            await rebuildScene(this, loadedState, this.restoredBgmKey);
            
            this.events.emit('force-hud-update');

            if (loadedState.scenario.isWaitingClick || loadedState.scenario.isWaitingChoice) {
                console.log("ロード完了: 待機状態のため、ユーザーの入力を待ちます。");
            } else {
                console.log("ロード完了: 次の行からシナリオを再開します。");
                this.time.delayedCall(10, () => this.scenarioManager.next());
            }
        } catch (e) {
            console.error(`ロード処理でエラーが発生しました。`, e);
        }
    }

    shutdown() {
        if (this.input) this.input.off('pointerdown');
    }
}

async function rebuildScene(scene, loadedState, restoredBgmKey) {
    console.log("--- 世界の再構築を開始 ---", loadedState);
    const manager = scene.scenarioManager;

    // 1. 現在の表示と状態をクリア
    // scene.clearChoiceButtons(); // clearChoiceButtonsはGameSceneのメソッド
    scene.layer.background.removeAll(true);
    scene.layer.character.removeAll(true);
    scene.characters = {};
    manager.messageWindow.reset();
    scene.cameras.main.resetFX();

    // 2. シナリオの論理的な状態を復元
    await manager.loadScenario(loadedState.scenario.fileName);
    manager.currentLine = loadedState.scenario.line;
    manager.ifStack = loadedState.scenario.ifStack || [];
    manager.callStack = loadedState.scenario.callStack || [];
    manager.isWaitingClick = loadedState.scenario.isWaitingClick;
    manager.isWaitingChoice = loadedState.scenario.isWaitingChoice;

    // 3. 背景を復元
    if (loadedState.layers.background) {
        const bg = scene.add.image(scene.scale.width / 2, scene.scale.height / 2, loadedState.layers.background);
        bg.setDisplaySize(scene.scale.width, scene.scale.height);
        scene.layer.background.add(bg);
    }
    
    // 4. キャラクターを復元
    if (loadedState.layers.characters) {
        for (const name in loadedState.layers.characters) {
            const charaData = loadedState.layers.characters[name];
            const chara = scene.add.image(charaData.x, charaData.y, charaData.storage);
            chara.setScale(charaData.scaleX, charaData.scaleY).setAlpha(charaData.alpha).setFlipX(charaData.flipX).setTint(charaData.tint);
            scene.layer.character.add(chara);
            scene.characters[name] = chara;
        }
    }

    // 5. BGMを復元
    const targetBgmKey = restoredBgmKey || loadedState.sound.bgm;
    if (targetBgmKey) {
        manager.soundManager.playBgm(targetBgmKey);
    } else {
        manager.soundManager.stopBgm();
    }

    // 6. メッセージウィンドウと選択肢を復元
    if (loadedState.scenario.isWaitingClick) {
        await manager.messageWindow.setText(loadedState.scenario.currentText, false, loadedState.scenario.speakerName);
        manager.messageWindow.showNextArrow();
    }
    // if (loadedState.scenario.isWaitingChoice) { ...選択肢の復元処理... }
    
    console.log("--- 世界の再構築完了 ---");
}