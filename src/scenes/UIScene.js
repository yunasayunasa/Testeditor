import { uiRegistry, sceneUiVisibility } from '../ui/index.js';

export default class UIScene extends Phaser.Scene {
    
    constructor() {
        super({ key: 'UIScene', active: false });
        this.uiElements = new Map();
        this.isPanelOpen = false;
        // ★ this.menuButton や this.panel プロパティは削除しても良いが、互換性のために残してもOK
    }

  // src/scenes/UIScene.js (修正後のコード)

      // createメソッドは非同期である必要はない
      async create() {
        console.log("UIScene: Data-Driven Initialization Started");
        this.scene.bringToTop();

        try {
            // ステップ1: UIの構築を待つ
            const layoutData = this.cache.json.get(this.scene.key);
            await this.buildUiFromLayout(layoutData);
            console.log("UIScene: UI build complete.");

            // ステップ2: 連携設定を行う
            const systemScene = this.scene.get('SystemScene');
            if (systemScene) {
                systemScene.events.on('transition-complete', this.onSceneTransition, this);
                console.log("UIScene: SystemSceneとの連携を設定しました。");
            } else {
                console.warn("UIScene: SystemSceneが見つかりませんでした。");
            }

            // ステップ3: すべての準備が完了してから、成功を通知する
            console.log("UIScene: Finalizing setup and emitting scene-ready.");
            this.events.emit('scene-ready');

        } catch (err) {
            // どこかでエラーが起きれば、必ずここに来る
            console.error("UIScene: create処理中にエラーが発生しました。", err);
            // (オプション) エラーが発生したことを明確に示すために、エラーメッセージを画面に表示するなど
            this.add.text(this.scale.width / 2, this.scale.height / 2, 'UIScene FAILED TO INITIALIZE', { color: 'red', fontSize: '32px' }).setOrigin(0.5);
        }
    }

   // src/scenes/UIScene.js

// ... (他のメソッドやimportは変更なし) ...

    /**
     * UIをレイアウトデータに基づいて構築する (JSONレイアウト対応・最終確定版)
     * ★★★ 以下のメソッドで、デバッグ用の buildUiFromLayout を完全に置き換えてください ★★★
     */
    async buildUiFromLayout(layoutData) {
        console.log("[UIScene] Starting UI build with FULL data-driven routine.");

        const uiRegistry = this.registry.get('uiRegistry');
        if (!uiRegistry) {
            console.error('[UIScene] CRITICAL: uiRegistry not found in game registry.');
            return;
        }

        const stateManager = this.registry.get('stateManager');

        // uiRegistryの全てのキーをループ処理する
        for (const name in uiRegistry) {
            try {
                const definition = uiRegistry[name];
                
                // 1. JSONレイアウトから、このUI要素に対応する定義を探す (なければ空オブジェクト)
                const layout = (layoutData && layoutData.objects) 
                    ? layoutData.objects.find(obj => obj.name === name) || {}
                    : {};
                
                // 2. registryの定義と、JSONの定義をマージする (JSONが優先される)
                const params = { ...definition.params, ...layout, name, stateManager };

                // 3. main.jsで前処理された 'component' プロパティを使ってクラスを取得
                const UiComponentClass = definition.component;

                if (UiComponentClass) {
                    const uiElement = new UiComponentClass(this, params);
                    // 4. マージ済みの最終的なparamsを使って、UI要素を登録・設定する
                    this.registerUiElement(name, uiElement, params);
                    console.log(`[UIScene] Successfully created and configured '${name}'.`);
                } else {
                    console.warn(`[UIScene] UI definition for '${name}' is missing a 'component' class.`);
                }
            } catch (e) {
                console.error(`[UIScene] FAILED to create UI element '${name}'.`, e);
            }
        }
    // --- ステージ2：エディタで自由に追加されたUIを復元 ---
        for (const layout of layoutObjects) {
            // ★ uiRegistryにない、かつ まだ生成されていないオブジェクトだけを対象
            if (!uiRegistry[layout.name] && !this.uiElements.has(layout.name)) {
                try {
                    console.log(`[UIScene] Restoring custom UI element: '${layout.name}'`);
                    
                    // ▼▼▼【ここが修正箇所です】▼▼▼
                    // ★★★ UIScene自身が持つ、新しいヘルパーメソッドを呼び出す ★★★
                    const newUiElement = this.createUiFromLayout(layout);
                    
                    if (newUiElement) {
                        // ★ 登録処理は、既存のregisterUiElementに任せるのが安全
                        this.registerUiElement(layout.name, newUiElement, layout);
                    }
                    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
                } catch(e) {
                    console.error(`[UIScene] FAILED to restore custom UI element '${layout.name}'.`, e);
                }
            }
        }
        
        
         const startButton = this.uiElements.get('start_button');
    if (startButton) {
        // start_buttonに、一度だけ実行されるクリックリスナーを設定
       startButton.once('button_pressed', () => {
            // ★ システムに、時間の再開を「依頼」する
            this.scene.get('SystemScene').events.emit('request-time-resume');
            startButton.setVisible(false);
        });
    }
}

// ... (registerUiElementは、当たり判定を与える「究極の解決策」版のままでOKです) ...
    /**
     * ★★★ 以下のメソッドで、既存の registerUiElement を完全に置き換えてください ★★★
     * (setSize/setInteractiveを安全に呼び出す最終確定版)
     */
    /**
     * UI要素を登録し、インタラクティブ化する (最終確定・完成版)
     * ★★★ 以下のメソッドで、既存の registerUiElement を完全に置き換えてください ★★★
     */
   
/**
 * UI要素を登録し、インタラクティブ化する (最終確定・完成版)
 * これまでの registerUiElement を、このメソッドで完全に置き換えてください。
 */
registerUiElement(name, element, params) {
    element.name = name;
    this.add.existing(element);
    this.uiElements.set(name, element);

    if (params.x !== undefined) element.x = params.x;
    if (params.y !== undefined) element.y = params.y;
    if (params.depth !== undefined) element.setDepth(params.depth);
      // ▼▼▼ ログ爆弾 No.1 ▼▼▼
        if (name === 'message_window') {
            console.log(`%c[LOG BOMB 1] UIScene.registerUiElement: 'message_window' の初期depthを ${params.depth} に設定しました。`, 'color: yellow; font-size: 1.2em;');
        }
    if (params.group) element.setData('group', params.group);

    // --- 当たり判定 (Hit Area) の設定 ---
    let hitArea = null;
    let hitAreaCallback = null;

    // UI要素の当たり判定サイズを決定する
    // 優先順位: 1. params -> 2. element自身のサイズ -> 3. デフォルトサイズ
    const width = params.width || (element.width > 1 ? element.width : 200);
    const height = params.height || (element.height > 1 ? element.height : 100);
    
    // 当たり判定の領域と形状を設定
    element.setSize(width, height);
    hitArea = new Phaser.Geom.Rectangle(0, 0, width, height);
    // Containerの場合、当たり判定の中心を左上に合わせる
    hitArea.centerX = width / 2;
    hitArea.centerY = height / 2;
    hitAreaCallback = Phaser.Geom.Rectangle.Contains;

    // --- インタラクティブ化とエディタ登録 ---
    // ▼▼▼【ここが修正の核心です】▼▼▼
    
    // 1. まず、当たり判定を引数にして setInteractive を呼び出す
    element.setInteractive(hitArea, hitAreaCallback);

    // 2. 次に、Phaserの入力システムにドラッグ可能であることを伝える
    this.input.setDraggable(element);

    // 3. 最後に、完全に操作可能になったオブジェクトをエディタプラグインに登録する
    const editor = this.plugins.get('EditorPlugin');
    if (editor && editor.isEnabled) {
        editor.makeEditable(element, this);
    }
    
    // (任意) デバッグ用に当たり判定を可視化する
    // const debugRect = this.add.graphics().lineStyle(2, 0x00ff00).strokeRect(0, 0, width, height);
    // if (element instanceof Phaser.GameObjects.Container) {
    //     element.add(debugRect);
    // }
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
}
    onSceneTransition(newSceneKey) {
        const visibleGroups = sceneUiVisibility[newSceneKey] || [];
        for (const [name, uiElement] of this.uiElements.entries()) {
            const definition = uiRegistry[name];
            if (definition) {
                const shouldBeVisible = definition.groups.some(group => visibleGroups.includes(group));
                uiElement.setVisible(shouldBeVisible);
            }
        }
    }
     /**
     * ★★★ 新規追加 ★★★
     * 指定されたUI要素のdepth値を外部から設定するための公式な窓口
     * @param {string} key - 'message_window' などのuiElementsのキー
     * @param {number} depth - 新しいdepth値
     */
    setElementDepth(key, depth) {
        const element = this.uiElements.get(key);
        if (element) {
            element.setDepth(depth);
            console.log(`[UIScene] Element '${key}' depth set to ${depth}`);
        } else {
            console.warn(`[UIScene] setElementDepth: Element with key '${key}' not found.`);
        }
    }
    
// src/scenes/UIScene.js

    // ... onSceneTransition メソッドなどの後に追加 ...

    /**
     * StateManagerからの変数変更通知を受け取り、
     * "監視" を登録しているUI要素に更新を自動的に委譲する。
     * 存在しないメソッド呼び出しによるTypeErrorを防ぎ、データ駆動の連携を完成させる。
     * @param {string} key - 変更された変数のキー (例: 'player_hp')
     * @param {*} value - 新しい値 (このメソッド内では直接使わないが、将来のために受け取っておく)
     */
    updateHud(key, value) {
        // デバッグログ：GameSceneからの呼び出しが成功したことを確認
        // console.log(`[UIScene.updateHud] Received update for key: ${key}`);

        const uiRegistry = this.registry.get('uiRegistry'); // uiRegistryをどこかから取得する必要があるかもしれません
        const stateManager = this.registry.get('stateManager');

        if (!uiRegistry || !stateManager) {
            console.error('[UIScene.updateHud] uiRegistry or stateManager is not available.');
            return;
        }

        // 変更されたキー(key)を 'watch' しているUI要素をすべて探す
        for (const [name, uiElement] of this.uiElements.entries()) {
            const definition = uiRegistry[name];

            // 1. UI定義が存在し、'watch'配列が定義されているかチェック
            // 2. 'watch'配列に、変更があったキー(key)が含まれているかチェック
            if (definition && definition.watch && definition.watch.includes(key)) {
                
                // 更新処理をUI要素自身に丸投げする
                // UI要素が 'updateValue' という標準メソッドを持っていることを規約とする
                if (typeof uiElement.updateValue === 'function') {
                    // StateManagerの最新の状態(f)を丸ごと渡す
                    uiElement.updateValue(stateManager.f);
                } else {
                    // 'watch'しているのに更新メソッドがない場合は警告を出す
                    console.warn(`UI Element '${name}' is watching '${key}' but does not have an updateValue() method.`);
                }
            }
        }
    }

    
     
   // in UIScene.js

    // ★★★ GameSceneからコピーした applyProperties は、複雑すぎるので削除します ★★★
    // applyProperties(gameObject, layout) { ... } // ← これを削除

    /**
     * ★★★ 新規メソッド ★★★
     * JSONのレイアウト情報だけを元に、基本的なUIオブジェクトを生成する。
     * @param {object} layout - JSONから読み込んだ単一のオブジェクト定義
     * @returns {Phaser.GameObjects.GameObject | null}
     */
    createUiFromLayout(layout) {
        if (!layout.type) return null;

        // --- タイプに応じて、適切なオブジェクトを生成して返す ---
        if (layout.type === 'Text') {
            return this.add.text(0, 0, layout.text, layout.style);
        }
        
        // ★ ここに、ButtonやBarの復元ロジックを追加していく
        // 例: Buttonクラスが 'label' をパラメータとして受け取る場合
        if (layout.type === 'Button') { 
            // uiRegistryからButtonクラスの定義を探す必要がある
            const uiRegistry = this.registry.get('uiRegistry');
            // 'button'というキーを汎用ボタンと仮定
            const definition = Object.values(uiRegistry).find(def => def.component.name === 'Button');
            if (definition) {
                const ButtonClass = definition.component;
                return new ButtonClass(this, { label: layout.label });
            }
        }
        
        // ... 他のUIタイプの復元ロジック ...

        return null;
    }
  
   /**
     * 指定された名前のパネルUI要素の表示/非表示を切り替える (Depth制御付き)
     * @param {string} panelName - uiElementsマップに登録されたパネルの名前
     */
    togglePanelByName(panelName) {
        const panelToToggle = this.uiElements.get(panelName);
        if (!panelToToggle) {
            console.error(`togglePanelByName: Panel with name '${panelName}' not found.`);
            return;
        }

        this.isPanelOpen = !this.isPanelOpen;

        const gameHeight = this.scale.height;
        const panelHeight = panelToToggle.height || 120;
        const targetY = this.isPanelOpen 
            ? gameHeight - (panelHeight / 2) 
            : gameHeight + (panelHeight / 2);

       
        if (this.isPanelOpen) {
            // パネルを開くとき：
            // depthを非常に大きな値に設定し、強制的に最前面に持ってくる
            panelToToggle.setDepth(10000); 
            console.log(`[UIScene] Bringing '${panelName}' to front with depth 100.`);
        }
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        this.tweens.add({
            targets: panelToToggle,
            y: targetY,
            duration: 300,
            ease: 'Cubic.easeInOut',
            onComplete: () => {
                if (!this.isPanelOpen) {
                    // パネルを閉じた後：
                    // depthを元に戻すか、低い値に設定する（任意）
                    // これにより、他のUI要素との予期せぬ競合を防ぐ
                    panelToToggle.setDepth(50); // 例えば、通常のUIよりは手前だが、最前面ではない値
                    console.log(`[UIScene] Resetting '${panelName}' depth to 50.`);
                }
            }
        });
    }
    /*togglePanel() {
        this.isPanelOpen = !this.isPanelOpen;
        const targetY = this.isPanelOpen ? 720 - 60 : 720 + 120;
        this.tweens.add({
            targets: this.panel,
            y: targetY,
            duration: 300,
            ease: 'Cubic.easeInOut'
        });
    }*/

    openScene(sceneKey, data = {}) {
        this.scene.pause('GameScene');
        // Config, Backlog, SaveLoadシーンを開くときは、UI自身も止める
      /*  if (['ConfigScene', 'BacklogScene', 'SaveLoadScene'].includes(sceneKey)) {
            this.scene.pause();
        }*/
        this.scene.launch(sceneKey, data);
    }
    
    toggleGameMode(mode) {
        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.scenarioManager) {
            const currentMode = gameScene.scenarioManager.mode;
            const newMode = currentMode === mode ? 'normal' : mode;
            gameScene.scenarioManager.setMode(newMode);
        }
    }
  setVisible(isVisible) {
        console.log(`UIScene: setVisible(${isVisible}) が呼ばれました。`);
        // UIScene内の全ての表示オブジェクトの可視性を切り替える
        if (this.menuButton) this.menuButton.setVisible(isVisible);
        if (this.panel) this.panel.setVisible(isVisible); 
        
        // パネルが開いている状態でも、パネルを非表示にする
        if (!isVisible && this.isPanelOpen) {
            this.isPanelOpen = false; // 状態をリセット
            // Tweenなしで即座に隠す
            if (this.panel) this.panel.y = this.scale.height + 120; 
        }
    }
      /**
     * メッセージウィンドウを画面外へ隠す
     * @param {number} time - アニメーション時間(ms)
     * @returns {Promise<void>} アニメーション完了時に解決されるPromise
     */
    // showMessageWindow と hideMessageWindow を、これで置き換えてください

    hideMessageWindow(time = 0) { // アニメーションはオプションにする
        const messageWindow = this.uiElements.get('message_window');
        if (messageWindow) {
            // 即座に隠す
            messageWindow.y = this.scale.height + (messageWindow.height / 2);
        }
    }

    showMessageWindow(time = 0) {
        this.scene.bringToTop();
        const messageWindow = this.uiElements.get('message_window');
        const layoutData = this.cache.json.get('UIScene');
        if (messageWindow && layoutData) {
            const windowLayout = layoutData.objects.find(obj => obj.name === 'message_window');
            if (windowLayout) {
                // 即座に表示位置に戻す
                messageWindow.y = windowLayout.y;
            }
        }
    }

     /**
     * ★★★ 最終FIX版 ★★★
     * エディタからの要求に応じて、新しいUIコンポーネントを生成・追加する
     * @param {string} registryKey - uiRegistryのキー ('menu_button', 'player_hp_bar'など)
     * @param {string} newName - 新しいUIオブジェクトに付ける名前
     */
    addUiComponentFromEditor(registryKey, newName) {
        // ▼▼▼【ここが核心の修正です】▼▼▼
        // --------------------------------------------------------------------
        // テキストの場合は、これまで通り専用メソッドを呼び出す
        if (registryKey === 'Text') {
            return this.addTextUiFromEditor(newName);
        }

        const uiRegistry = this.registry.get('uiRegistry');
        const stateManager = this.registry.get('stateManager');
        if (!uiRegistry || !stateManager) return null;

        // --- 1. 指定されたキーで、uiRegistryから「設計図」を直接取得 ---
        const definition = uiRegistry[registryKey];

        if (!definition || !definition.component) {
            console.error(`[UIScene] UI definition for key '${registryKey}' not found in uiRegistry.`);
            return null;
        }

        // --- 2. デフォルトのパラメータを準備 ---
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        // ★★★ definition.params を最優先で使う ★★★
        const params = {
            ...definition.params,
            x: centerX,
            y: centerY,
            name: newName,
            stateManager: stateManager
        };

        // --- 3. クラスから新しいインスタンスを生成 ---
        const UiComponentClass = definition.component;
        const newUiElement = new UiComponentClass(this, params);

        // --- 4. シーンに登録し、編集可能にする ---
        this.registerUiElement(newName, newUiElement, params);
        
        console.log(`[UIScene] UI Component '${newName}' from registry key '${registryKey}' added.`);

        return newUiElement;
        // --------------------------------------------------------------------
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    }
     /**
     * ★★★ 新規メソッド ★★★
     * エディタから、新しいテキストUIオブジェクトを生成する
     */
    addTextUiFromEditor(newName) {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        
        // BaseGameSceneのロジックを参考に、Phaserの標準Textオブジェクトを生成
        const textObject = this.add.text(centerX, centerY, 'New Text', { 
            fontSize: '32px', 
            fill: '#ffffff' 
        }).setOrigin(0.5);

        // registerUiElement を使って、共通のセットアップを行う
        this.registerUiElement(newName, textObject, { name: newName, x: centerX, y: centerY });

        return textObject;
    }
    
     shutdown() {
        const systemScene = this.scene.get('SystemScene');
        if (systemScene) {
            systemScene.events.off('transition-complete', this.onSceneTransition, this);
        }
    }
}