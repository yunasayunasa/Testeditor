export default class EditorUI {
    constructor(game, editorPlugin) {
        this.game = game;
        this.plugin = editorPlugin;

        const currentURL = window.location.href;
        if (!currentURL.includes('?debug=true') && !currentURL.includes('&debug=true')) return;

        // --- プロパティの初期化 ---
        this.selectedAssetKey = null;
        this.selectedAssetType = null;
        this.objectCounters = {};
        this.currentEditorMode = 'select';
        this.currentAssetTab = 'image';
        
         //レイヤープロパティ
        
   

   this.layers = [
            { name: 'Foreground', visible: true, locked: false },
            { name: 'Gameplay', visible: true, locked: false },
            { name: 'Background', visible: true, locked: false },
        ];
 this.activeLayerName = 'Gameplay';
        // --- DOM要素の参照 ---
        this.getDomElements();

        // --- UIの初期表示設定 ---
        if (this.editorPanel) this.editorPanel.style.display = 'flex';
        if (this.assetBrowserPanel) this.assetBrowserPanel.style.display = 'flex';
        
        // --- UI要素の生成とリスナー設定 ---
        this.createPauseToggle();
        this.createHelpButton();
        this.initializeEventListeners();
        this.populateAssetBrowser();

        

    }
    
    // =================================================================
    // ヘルパーメソッド群
    // =================================================================
   /**
     * EditorPluginの準備が完了したときに呼ばれる
     */
    onPluginReady() {
        this.buildLayerPanel(); // ★ ここで初めてレイヤーパネルを構築
        // EditorPluginに初期レイヤー状態を渡す
        this.plugin.updateLayerStates(this.layers);
    }
    getDomElements() {
        this.editorPanel = document.getElementById('editor-panel');
        this.assetBrowserPanel = document.getElementById('asset-browser');
        this.assetListContainer = document.getElementById('asset-list');
        this.assetTabContainer = document.getElementById('asset-tabs');
        this.cameraControls = document.getElementById('camera-controls');
        this.zoomInBtn = document.getElementById('camera-zoom-in');
        this.zoomOutBtn = document.getElementById('camera-zoom-out');
        this.panUpBtn = document.getElementById('camera-pan-up');
        this.panDownBtn = document.getElementById('camera-pan-down');
        this.panLeftBtn = document.getElementById('camera-pan-left');
        this.panRightBtn = document.getElementById('camera-pan-right');
        this.resetBtn = document.getElementById('camera-reset');
        this.selectModeBtn = document.getElementById('select-mode-btn');
        this.tilemapModeBtn = document.getElementById('tilemap-mode-btn');
        this.modeToggle = document.getElementById('mode-toggle-checkbox');
        this.modeLabel = document.getElementById('mode-label');
        this.helpModal = document.getElementById('help-modal-overlay');
        this.helpModalContent = document.getElementById('help-modal-content');
       this.layerListContainer = document.getElementById('layer-list');
       this.eventEditorOverlay = document.getElementById('event-editor-overlay');
        this.eventEditorTitle = document.getElementById('event-editor-title');
        this.vslNodeList = document.getElementById('vsl-node-list');
    }

  

    getActiveGameScene() {
        return this.plugin?.getActiveGameScene();
    }

    // =================================================================
    // イベントリスナー初期化
    // =================================================================
// in EditorUI.js

   
  /**
     * ★★★ 最終FIX版 ★★★
     * すべてのイベントリスナーを、標準のaddEventListenerで一度だけ登録する
     */
    initializeEventListeners() {
        // --- UIボタンのリスナー ---
        document.getElementById('add-asset-button')?.addEventListener('click', () => this.onAddButtonClicked());
        document.getElementById('add-text-button')?.addEventListener('click', () => this.onAddTextClicked()); // ★ 登録はここに一本化
        document.getElementById('select-mode-btn')?.addEventListener('click', () => this.setEditorMode('select'));
        document.getElementById('tilemap-mode-btn')?.addEventListener('click', () => this.setEditorMode('tilemap'));
        document.getElementById('add-layer-btn')?.addEventListener('click', () => this.addNewLayer());
        document.getElementById('event-editor-close-btn')?.addEventListener('click', () => this.closeEventEditor());
        // --- レイヤーリスト（イベント委譲） ---
        const layerListContainer = document.getElementById('layer-list');
        if (layerListContainer) {
            layerListContainer.addEventListener('click', (event) => {
                const target = event.target;
                const layerItem = target.closest('.layer-item');
                if (!layerItem) return;
                const layerName = layerItem.dataset.layerName;
                if (!layerName) return;

                if (target.classList.contains('layer-visibility-btn')) {
                    this.toggleLayerVisibility(layerName);
                } else if (target.classList.contains('layer-lock-btn')) {
                    this.toggleLayerLock(layerName);
                } else if (target.classList.contains('layer-active-indicator')) {
                    this.setActiveLayer(layerName);
                } else {
                    this.plugin.selectLayer(this.layers.find(l => l.name === layerName));
                }
            });
        }

        // --- カメラコントロール ---
        document.getElementById('camera-zoom-in')?.addEventListener('click', () => this.plugin.zoomCamera(0.2));
        document.getElementById('camera-zoom-out')?.addEventListener('click', () => this.plugin.zoomCamera(-0.2));
        document.getElementById('camera-reset')?.addEventListener('click', () => this.plugin.resetCamera());
        this.setupPanButton(document.getElementById('camera-pan-up'), 0, -10);
        this.setupPanButton(document.getElementById('camera-pan-down'), 0, 10);
        this.setupPanButton(document.getElementById('camera-pan-left'), -10, 0);
        this.setupPanButton(document.getElementById('camera-pan-right'), 10, 0);

        // --- プレイモード切替 ---
        const modeToggle = document.getElementById('mode-toggle-checkbox');
        if (modeToggle) {
            modeToggle.addEventListener('change', (event) => {
                this.plugin.currentMode = event.target.checked ? 'play' : 'select';
                document.getElementById('mode-label').textContent = event.target.checked ? 'Play Mode' : 'Select Mode';
            });
        }
        
        // --- ヘルプモーダル ---
        document.getElementById('help-modal-close-btn')?.addEventListener('click', () => this.closeHelpModal());
        // createHelpButton内でリスナーを設定
        this.createHelpButton();
        
        // ★ createPauseToggleもリスナーを設定するので、ここで呼ぶ
        this.createPauseToggle();
    }
    
    // =================================================================
    // UI構築・更新メソッド群
    // =================================================================
      /**
     * ★★★ これが不足していたメソッドです ★★★
     * SystemSceneから呼び出され、UIとプラグインの初期連携を開始する
     */
    start() {
        // この時点では、this.plugin が確実に存在し、
        // plugin側もthis.editorUIを認識していることが保証されています。
        
        // 1. プラグインに、EditorUIが持つ初期レイヤー状態を通知します
        this.plugin.updateLayerStates(this.layers);
        
        // 2. プラグインの状態が整ったので、初めてレイヤーパネルを構築します
        this.buildLayerPanel();
    }
    setEditorMode(mode) {
        if (this.currentEditorMode === mode) return;
        this.currentEditorMode = mode;
        
        if (mode === 'tilemap') {
            document.body.classList.add('tilemap-mode');
            this.tilemapModeBtn.classList.add('active');
            this.selectModeBtn.classList.remove('active');
            this.initTilesetPanel();
            this.createTileMarker();
        } else { // 'select' mode
            document.body.classList.remove('tilemap-mode');
            this.selectModeBtn.classList.add('active');
            this.tilemapModeBtn.classList.remove('active');
            this.destroyTileMarker();
        }
    }
/**
     * ★★★ 復活させるメソッド ★★★
     * EditorPluginからの合図で、Phaserのグローバル入力イベントのリッスンを開始する。
     * これが最も安定した方法。
     */
    startListeningToGameInput() {
        if (!this.game || !this.game.input) {
            console.error("[EditorUI] Cannot start listening: Game or input system not available.");
            return;
        }
        
        // --- 既存のリスナーを一度クリア ---
        this.game.input.off('pointermove', this.onPointerMove, this);
        this.game.input.off('pointerdown', this.onPointerDown, this);

        // --- 新しいリスナーを登録 ---
        console.log("[EditorUI] Attaching Phaser global input listeners.");
        this.game.input.on('pointermove', this.onPointerMove, this);
        this.game.input.on('pointerdown', this.onPointerDown, this);
    }
 // ▼▼▼ この新しいメソッドをクラス内に追加 ▼▼▼
  
 
 
 
    /**
     * ★★★ 新規メソッド ★★★
     * Phaserのポインターイベントを捌くための統合ハンドラ
     * @param {Phaser.Input.Pointer} pointer 
     */
    onPointerMove(pointer) {
        if (this.currentEditorMode !== 'tilemap' || !this.tileMarker) return;
        
        const scene = this.getActiveGameScene();
        if (!scene) return;
        
        // ★ pointer.worldX は、カメラの位置とズームを考慮した最終的なワールド座標
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;

        const tileWidth = this.currentTileset.tileWidth;
        const tileHeight = this.currentTileset.tileHeight;

        const snappedX = Math.floor(worldX / tileWidth) * tileWidth + tileWidth / 2;
        const snappedY = Math.floor(worldY / tileHeight) * tileHeight + tileHeight / 2;
        
        this.tileMarker.setPosition(snappedX, snappedY);
    }
    
    /**
     * ★★★ 新規メソッド ★★★
     * Phaserのポインターイベントを捌くための統合ハンドラ
     * @param {Phaser.Input.Pointer} pointer 
     */
    onPointerDown(pointer) {
        // UI上でのクリックなら、Phaser側で処理させない
        if (pointer.event.target.closest('#editor-sidebar') || 
            pointer.event.target.closest('#overlay-controls') || 
            pointer.event.target.closest('#bottom-panel')) {
            return;
        }

        if (this.currentEditorMode !== 'tilemap') {
            return;
        }
        
        const scene = this.getActiveGameScene();
        if (!scene || !this.currentTileset) return;

        const worldX = pointer.worldX;
        const worldY = pointer.worldY;

        const tileWidth = this.currentTileset.tileWidth;
        const tileHeight = this.currentTileset.tileHeight;

        const tileX = Math.floor(worldX / tileWidth);
        const tileY = Math.floor(worldY / tileHeight);
        
        console.log(`[EditorUI | Phaser Event] Placing tile index ${this.selectedTileIndex} at grid (${tileX}, ${tileY})`);

        if (typeof scene.placeTile === 'function') {
            scene.placeTile(tileX, tileY, this.selectedTileIndex, this.currentTileset.key, true); // 物理ボディ付きで配置
        }
        setTimeout(() => {
            // オブジェクトのpointerdownが先に処理されるのを待つ
            if (!this.plugin.selectedObject && (!this.plugin.selectedObjects || this.plugin.selectedObjects.length === 0)) {
                this.plugin.deselectAll();
            }
        }, 0);
    
    }

   /**
     * テキスト追加ボタンがクリックされたときの処理
     */
    onAddTextClicked() {
        console.count('onAddTextClicked called');
        const targetScene = this.getActiveGameScene();
        if (!targetScene || typeof targetScene.addTextObjectFromEditor !== 'function') return;
        
        const newName = `text_${Date.now()}`;
        // ★ アクティブなレイヤー名を渡す
        const newObject = targetScene.addTextObjectFromEditor(newName, this.activeLayerName);
        
        if (newObject && this.plugin) {
            this.plugin.selectSingleObject(newObject);
        }
    }

    /**
     * ★★★ 最終FIX版 ★★★
     * 範囲描画のドラッグ操作を開始する。
     * ブラウザのデフォルトのドラッグ動作を完全に抑制する。
     */
    startRangeFillDrag(sourceObject) {
        this.rangeFillSourceObject = sourceObject;
        console.log(`[EditorUI | Final Fix] Range fill drag started.`);
        
        this.game.canvas.style.cursor = 'crosshair';

        // ▼▼▼【ここからが修正箇所】▼▼▼
        // --------------------------------------------------------------------

        // --- ドラッグ中のデフォルト動作をキャンセルするリスナー ---
        const onDragMove = (event) => {
            // マウスが動いている間、常にデフォルト動作（画像ドラッグ、テキスト選択など）を抑制する
            event.preventDefault();
        };

        // --- マウスボタンが離された時の処理 ---
        const onMouseUp = (event) => {
            console.log(`[EditorUI | Final Fix] Mouse up detected. Executing fill.`);
            
            // --- 処理の実行 ---
            const scene = this.getActiveGameScene();
            if (scene && typeof scene.fillObjectRange === 'function') {
                const canvasRect = this.game.canvas.getBoundingClientRect();
                const canvasX = event.clientX - canvasRect.left;
                const canvasY = event.clientY - canvasRect.top;
                const worldPoint = scene.cameras.main.getWorldPoint(canvasX, canvasY);
                scene.fillObjectRange(this.rangeFillSourceObject, { x: worldPoint.x, y: worldPoint.y });
            }
            
            // --- 後片付け ---
            this.game.canvas.style.cursor = 'default';
            this.rangeFillSourceObject = null;
            
            // ★重要：登録したリスナーは、必ず両方とも解除する
            window.removeEventListener('pointermove', onDragMove, true);
            window.removeEventListener('pointerup', onMouseUp, true);
        };

        // --- リスナーを登録 ---
        // ★ capture: true を指定することで、他の要素にイベントが奪われる前に処理する
        window.addEventListener('pointermove', onDragMove, true);
        window.addEventListener('pointerup', onMouseUp, true);

        // --------------------------------------------------------------------
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    }

    // startRangeFillMode, endRangeFillMode は不要になるので削除してOKです。

  
    

    populateAssetBrowser() {
        const assetList = this.game.registry.get('asset_list');
        if (!assetList || !this.assetListContainer || !this.assetTabContainer) return;

        const assetTypes = [...new Set(assetList.map(asset => (asset.type === 'spritesheet' ? 'image' : asset.type)))];
        if (!assetTypes.includes('image')) assetTypes.unshift('image');
        if (!assetTypes.includes('ui')) assetTypes.push('ui');

        this.assetTabContainer.innerHTML = '';
        assetTypes.forEach(type => {
            if (!type) return;
            const tabButton = document.createElement('div');
            tabButton.className = 'asset-tab';
            tabButton.innerText = type.charAt(0).toUpperCase() + type.slice(1) + 's';
            if (type === this.currentAssetTab) tabButton.classList.add('active');
            tabButton.addEventListener('click', () => {
                this.currentAssetTab = type;
                this.selectedAssetKey = null;
                this.selectedAssetType = null;
                this.populateAssetBrowser();
            });
            this.assetTabContainer.appendChild(tabButton);
        });

         // --- リストの中身を生成 ---
        this.assetListContainer.innerHTML = '';

        if (this.currentAssetTab === 'ui') {
            // ================================================================
            // --- ケース1：UIタブが選択されている場合 ---
            // ================================================================
            // ★ ゲームのuiRegistryから、最新の定義を直接取得する
            const uiRegistry = this.game.registry.get('uiRegistry');
            
            // ★ uiRegistryの全キーをループして、UIカタログを生成する
            for (const key in uiRegistry) {
                const definition = uiRegistry[key];
                const itemDiv = document.createElement('div');
                itemDiv.className = 'asset-item';
                itemDiv.dataset.registryKey = key; // ★ 'menu_button', 'generic_button'などを保存

                itemDiv.addEventListener('click', (e) => {
                    this.assetListContainer.querySelectorAll('.asset-item.selected').forEach(el => el.classList.remove('selected'));
                    itemDiv.classList.add('selected');
                    this.selectedAssetKey = itemDiv.dataset.registryKey;
                    this.selectedAssetType = 'ui';
                });

                // アイコン表示（簡易版）
                const iconSpan = document.createElement('span');
                iconSpan.className = 'asset-preview';
                iconSpan.innerText = '🧩';
                
                const nameSpan = document.createElement('span');
                // ★ 表示名も、registryKeyをそのまま使うのがシンプル
                nameSpan.innerText = key;

                itemDiv.append(iconSpan, nameSpan);
                this.assetListContainer.appendChild(itemDiv);
            }

            // ★ テキスト追加ボタンは専用の処理があるので、別途生成する
            const textItemDiv = document.createElement('div');
            textItemDiv.className = 'asset-item';
            textItemDiv.dataset.registryKey = 'Text'; // 特別なキー
            textItemDiv.innerHTML = `<span class="asset-preview" style="font-size: 24px; display: flex; align-items: center; justify-content: center;">T</span><span>テキスト</span>`;
            textItemDiv.addEventListener('click', () => {
                this.assetListContainer.querySelectorAll('.asset-item.selected').forEach(el => el.classList.remove('selected'));
                textItemDiv.classList.add('selected');
                this.selectedAssetKey = 'Text';
                this.selectedAssetType = 'ui';
            });
            this.assetListContainer.appendChild(textItemDiv);
        } else {
            // ================================================================
            // --- ケース2：それ以外のタブ（画像やプレハブ）の場合 ---
            // ================================================================
            document.getElementById('add-asset-button').innerText = '選択したアセットを追加'; // 日本語化
        const displayableAssets = assetList.filter(asset => {
            if (this.currentAssetTab === 'image') {
                return asset.type === 'image' || asset.type === 'spritesheet';
            }
            if (this.currentAssetTab === 'prefab') {
                // ★ typeが'prefab'または'GroupPrefab'のものを表示
                return asset.type === 'prefab' || asset.type === 'GroupPrefab'; 
            }
            return asset.type === this.currentAssetTab;
        });

        for (const asset of displayableAssets) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'asset-item';
            itemDiv.dataset.assetKey = asset.key;
            itemDiv.addEventListener('click', () => {
                this.assetListContainer.querySelectorAll('.asset-item.selected').forEach(el => el.classList.remove('selected'));
                itemDiv.classList.add('selected');
                this.selectedAssetKey = asset.key;
                this.selectedAssetType = asset.type;
            });
            
            if (asset.path) {
                const previewImg = document.createElement('img');
                previewImg.className = 'asset-preview';
                previewImg.src = asset.path;
                itemDiv.appendChild(previewImg);
            } else {
                const iconSpan = document.createElement('span');
                iconSpan.innerText = '📦';
                iconSpan.className = 'asset-preview';
                iconSpan.style.display = 'flex';
                iconSpan.style.justifyContent = 'center';
                iconSpan.style.alignItems = 'center';
                iconSpan.style.fontSize = '32px';
                itemDiv.appendChild(iconSpan);
            }
            
            const keySpan = document.createElement('span');
            keySpan.innerText = asset.key;
            itemDiv.appendChild(keySpan);
            
            if (asset.type === 'spritesheet') {
                const badge = document.createElement('span');
                badge.innerText = 'Sheet';
                badge.style.marginLeft = 'auto';
                badge.style.backgroundColor = '#3a86ff';
                badge.style.color = 'white';
                badge.style.fontSize = '10px';
                badge.style.padding = '2px 4px';
                badge.style.borderRadius = '3px';
                itemDiv.appendChild(badge);
            }
            if (asset.type === 'GroupPrefab') {
                const badge = document.createElement('span');
                badge.innerText = 'Group';
                // (バッジのスタイル設定)
                itemDiv.appendChild(badge);
            }

            this.assetListContainer.appendChild(itemDiv);
        }
    }}

   // in EditorUI.js

    /**
     * アセットブラウザの「Add Selected Asset」ボタンがクリックされたときの処理。
     * アクティブなレイヤー名をシーンに渡す。
     */
  // in EditorUI.js

    onAddButtonClicked() {
        if (!this.selectedAssetKey) {
            alert('アセットを選択してください。'); // 日本語化
            return;
        }
        
        const targetScene = this.getActiveGameScene();
        if (!targetScene) {
            alert("対象のシーンが見つかりませんでした。"); // 日本語化
            return;
        }

        // オブジェクト名のカウンター (変更なし)
        if (!this.objectCounters[this.selectedAssetKey]) {
            this.objectCounters[this.selectedAssetKey] = 1;
        } else {
            this.objectCounters[this.selectedAssetKey]++;
        }
       
        
        
          let newObject = null;
        const newName = `${this.selectedAssetKey.toLowerCase()}_${Date.now()}`;

        // ▼▼▼【ここからが核心の修正です】▼▼▼
        // --------------------------------------------------------------------
        
        // --- ケース1：UIコンポーネントを追加する場合 ---
        if (this.selectedAssetType === 'ui') {
            const uiScene = this.game.scene.getScene('UIScene');
            if (uiScene && typeof uiScene.addUiComponentFromEditor === 'function') {
                console.log(`[EditorUI] Requesting UIScene to add UI component: ${this.selectedAssetKey}`);
                // ★ UISceneの新しいメソッドを呼び出す
                newObject = uiScene.addUiComponentFromEditor(this.selectedAssetKey, newName);
            }
        } 
        
        // --- ケース2：通常のアセットを追加する場合 (既存のロジック) ---
        else {
            const targetScene = this.getActiveGameScene();
            if (!targetScene) {
                alert("対象のゲームシーンが見つかりませんでした。");
                return;
            }
        
        // アセットのタイプに応じて、シーンのメソッドを呼び出す
        if (this.selectedAssetType === 'image' || this.selectedAssetType === 'spritesheet') {
            if (typeof targetScene.addObjectFromEditor === 'function') {
                newObjectOrObjects = targetScene.addObjectFromEditor(this.selectedAssetKey, newName, this.activeLayerName);
            }
        } 
        // ▼▼▼【ここが修正箇所です】▼▼▼
        // --------------------------------------------------------------------
        // --- 'GroupPrefab' も、addPrefabFromEditor を呼び出す条件に含める ---
        else if (this.selectedAssetType === 'prefab' || this.selectedAssetType === 'GroupPrefab') {
            if (typeof targetScene.addPrefabFromEditor === 'function') {
                newObjectOrObjects = targetScene.addPrefabFromEditor(this.selectedAssetKey, newName, this.activeLayerName);
            }
        }
        // --------------------------------------------------------------------
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        
        // --- 新しく生成されたオブジェクトを選択状態にする ---
        if (newObjectOrObjects && this.plugin) {
            // ▼▼▼【ここも修正箇所です】▼▼▼
            // --------------------------------------------------------------------
            if (Array.isArray(newObjectOrObjects)) {
                // 配列が返ってきた場合（グループプレハブ）は、複数選択
                this.plugin.selectMultipleObjects(newObjectOrObjects);
            } else {
                // 単一オブジェクトが返ってきた場合は、単体選択
                this.plugin.selectSingleObject(newObjectOrObjects);
            }
            // --------------------------------------------------------------------
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        }
    }}
    

    
  
       /**
     * ★★★ 新規メソッド：ゲーム内時間の「ポーズ/再開」を制御するボタンを生成する ★★★
     */
    createPauseToggle() {
        // モード切替スイッチが置かれているコンテナを取得
        const modeControls = document.getElementById('editor-mode-controls');
        if (modeControls) {
            const pauseButton = document.createElement('button');
            pauseButton.id = 'editor-pause-btn';
            pauseButton.innerText = '⏸️ Pause'; // 初期状態は「一時停止」
            
            // --- ボタンのスタイルを定義 ---
            pauseButton.style.marginLeft = '20px';
            pauseButton.style.padding = '5px 10px';
            pauseButton.style.border = '1px solid #777';
            pauseButton.style.backgroundColor = '#555';
            pauseButton.style.color = '#eee';
            pauseButton.style.borderRadius = '5px';
            pauseButton.style.cursor = 'pointer';
            pauseButton.style.fontSize = '14px';

            // --- ボタンがクリックされた時の処理を定義 ---
            pauseButton.addEventListener('click', () => {
                // SystemSceneへの参照を取得
                const systemScene = this.game.scene.getScene('SystemScene');
                if (systemScene) {
                    // isTimeStoppedフラグを、現在の状態の逆(true/false)に設定
                    systemScene.isTimeStopped = !systemScene.isTimeStopped;

                    // ボタンの見た目を、新しい状態に合わせて更新
                    if (systemScene.isTimeStopped) {
                        // 時間が停止した場合
                        pauseButton.innerText = '▶️ Play';
                        pauseButton.style.backgroundColor = '#2a9d8f'; // 目立つ色に
                    } else {
                        // 時間が再開した場合
                        pauseButton.innerText = '⏸️ Pause';
                        pauseButton.style.backgroundColor = '#555';
                    }
                }
            });

            // 完成したボタンをDOMに追加
            modeControls.appendChild(pauseButton);
        }
    }


     /**
     * ★★★ 新規ヘルパーメソッド ★★★
     * パンボタンを押し続けている間、カメラを移動させるための設定を行う
     * @param {HTMLElement} button - 対象のボタン要素
     * @param {number} dx - X方向の移動量
     * @param {number} dy - Y方向の移動量
     */
    setupPanButton(button, dx, dy) {
        if (!button) return;

        let intervalId = null;

        const startPanning = () => {
            // 既に動いていたら何もしない
            if (intervalId) return;
            // まず一度動かす
            this.plugin.panCamera(dx, dy);
            // その後、定期的に動かす
            intervalId = setInterval(() => {
                this.plugin.panCamera(dx, dy);
            }, 50); // 50ミリ秒ごと (秒間20回)
        };

        const stopPanning = () => {
            clearInterval(intervalId);
            intervalId = null;
        };
        
        // PC向け: マウスが押されたら開始、離れたら停止
        button.addEventListener('mousedown', startPanning);
        button.addEventListener('mouseup', stopPanning);
        // ボタンエリアからマウスが外れた場合も停止
        button.addEventListener('mouseleave', stopPanning);

        // モバイル向け: タッチされたら開始、離れたら停止
        button.addEventListener('touchstart', (e) => {
            e.preventDefault(); // 画面全体のスクロールを防ぐ
            startPanning();
        });
        button.addEventListener('touchend', stopPanning);
        button.addEventListener('touchcancel', stopPanning);
    }
     // ★★★ 新規メソッド：ヘルプボタンを生成する ★★★
    
    /**
     * ヘルプボタンを生成する (移設・最終版)
     * ★★★ 以下のメソッドで、既存のものを完全に置き換えてください ★★★
     */
    // in src/editor/EditorUI.js

     createHelpButton() {
        const buttonContainer = document.querySelector('#asset-browser .panel-header-buttons');
        if (buttonContainer) {
            const helpButton = document.createElement('button');
            helpButton.innerText = '?';
            helpButton.title = 'Open Help Manual';
            helpButton.addEventListener('click', () => this.openHelpModal());
            buttonContainer.appendChild(helpButton);
        }
    }
    // ★★★ 新規メソッド：ヘルプモーダルを開く ★★★
    async openHelpModal() {
        if (!this.helpModal || !this.helpModalContent) return;
 this.game.input.enabled = false;
            console.log("[EditorUI] Phaser input disabled for Help Modal.");
        // モーダルを表示
        this.helpModal.style.display = 'flex';
        // Phaserの入力を無効化
     

        try {
            // manual.htmlの内容をフェッチ
            const response = await fetch('manual.html');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const htmlContent = await response.text();
            // 取得したHTMLをコンテンツエリアに挿入
            this.helpModalContent.innerHTML = htmlContent;
        } catch (error) {
            this.helpModalContent.innerHTML = `<p style="color: red;">Error loading help content: ${error.message}</p>`;
            console.error('Failed to fetch help manual:', error);
        }
    }

    // ★★★ 新規メソッド：ヘルプモーダルを閉じる ★★★
    closeHelpModal() {
        if (!this.helpModal) return;
         this.game.input.enabled = true;
            console.log("[EditorUI] Phaser input re-enabled.");
        this.helpModal.style.display = 'none';
      
    }

     
    /**
     * ★★★ レイヤーメソッド群 ★★★
     */
    
    // --- レイヤーパネルの構築と更新 ---
    
     /**
     * ★★★ イベント委譲版 ★★★
     * レイヤーパネルの構築と更新。
     * 各ボタンに識別のためのデータ属性やクラス名を設定する。
     */
    buildLayerPanel() {
        const layerListContainer = document.getElementById('layer-list');
        if (!layerListContainer) return;
        layerListContainer.innerHTML = '';

        this.layers.forEach(layer => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'layer-item';
            itemDiv.dataset.layerName = layer.name; // ★ 識別のためのデータ属性

            if (this.plugin.selectedLayer && layer.name === this.plugin.selectedLayer.name) {
                itemDiv.classList.add('active');
            }

            // --- アクティブ化インジケータ ---
            const activeIndicator = document.createElement('div');
            activeIndicator.className = 'layer-active-indicator'; // ★ 識別のためのクラス名
            // (スタイル設定はCSSで行うのが望ましい)
            if(layer.name === this.activeLayerName) {
                activeIndicator.classList.add('active');
            }
            
            // --- 表示/非表示ボタン ---
            const visibilityBtn = document.createElement('button');
            visibilityBtn.className = 'layer-control layer-visibility-btn'; // ★ 識別のためのクラス名
            visibilityBtn.innerHTML = layer.visible ? '👁️' : '—';
            
            // --- ロック/アンロックボタン ---
            const lockBtn = document.createElement('button');
            lockBtn.className = 'layer-control layer-lock-btn'; // ★ 識別のためのクラス名
            lockBtn.innerHTML = layer.locked ? '🔒' : '🔓';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'layer-name';
            nameSpan.innerText = layer.name;

            itemDiv.append(activeIndicator, visibilityBtn, lockBtn, nameSpan);
            layerListContainer.appendChild(itemDiv);
            
            // ★★★ ここでのイベントリスナー登録はすべて不要になる ★★★
        });
    }


    setActiveLayer(layerName) {
        const layer = this.layers.find(l => l.name === layerName);
        if (layer && layer.locked) return; // ロック中はアクティブ化不可
        
        this.activeLayerName = layerName;
        console.log(`Active layer set to: ${this.activeLayerName}`);
        this.buildLayerPanel();
    }

    toggleLayerVisibility(layerName) {
        const layer = this.layers.find(l => l.name === layerName);
        if (layer) {
            layer.visible = !layer.visible;
            this.buildLayerPanel();
            this.plugin.updateLayerStates(this.layers);
            this.plugin.applyLayerStatesToScene();
        }
    }

    toggleLayerLock(layerName) {
        const layer = this.layers.find(l => l.name === layerName);
        if (layer) {
            layer.locked = !layer.locked;
            if (layer.locked && this.activeLayerName === layerName) {
                // ロックしたレイヤーがアクティブだったら、別のアクティブ可能なレイヤーを探す
                const fallbackLayer = this.layers.find(l => !l.locked);
                this.activeLayerName = fallbackLayer ? fallbackLayer.name : null;
            }
            this.buildLayerPanel();
            this.plugin.updateLayerStates(this.layers);
        }
    }
    
    addNewLayer() {
        const newLayerName = prompt("Enter new layer name:", `Layer ${this.layers.length + 1}`);
        if (newLayerName && !this.layers.some(l => l.name === newLayerName)) {
            this.layers.unshift({ name: newLayerName, visible: true, locked: false });
            this.buildLayerPanel();
            this.plugin.updateLayerStates(this.layers);
        }
    }
    // in EditorUI.js
    deleteLayer(layerName) {
        const layer = this.layers.find(l => l.name === layerName);
        // デフォルトのレイヤーなど、消せないレイヤーの条件（今はなし）
        if (!layer) return;

        if (confirm(`本当にレイヤー '${layerName}' を削除しますか？\nこのレイヤー上のすべてのオブジェクトも削除されます！`)) {
             // 1. シーンから該当レイヤーのオブジェクトをすべて削除
        const scene = this.getActiveGameScene();
        if (scene) {
            // ★ editableObjects は Map<string, Set> なので、まずSetを取得
            const sceneObjects = this.plugin.editableObjects.get(scene.scene.key);
            if (sceneObjects) {
                // ★ SetをArrayに変換してからループ
                const objectsToDelete = Array.from(sceneObjects).filter(obj => obj.getData('layer') === layerName);
                
                objectsToDelete.forEach(obj => {
                    sceneObjects.delete(obj); // Setからも削除
                    obj.destroy();
                });
            }
        }

            // 2. this.layers 配列から削除
            this.layers = this.layers.filter(l => l.name !== layerName);
            
            // 3. 選択状態を解除
            this.plugin.deselectAll(); // これが updatePropertyPanel と buildLayerPanel を呼ぶ
        }
    }
     /**
     * ★★★ 新規メソッド ★★★
     * シーンのJSONデータから読み込んだレイヤー構成で、UIの状態を上書きする
     * @param {Array<object>} layersData - 保存されていたレイヤー情報の配列
     */
    setLayers(layersData) {
        if (!layersData || layersData.length === 0) {
            // もしJSONにlayersがなければ、デフォルトのレイヤー構成を使う
            this.layers = [
                { name: 'Gameplay', visible: true, locked: false },
                // ... 他のデフォルトレイヤー
            ];
        } else {
            // JSONのデータで上書き
            this.layers = layersData;
        }

        // アクティブレイヤーがもし存在しない名前になっていたら、安全なものにフォールバック
        const activeLayerExists = this.layers.some(l => l.name === this.activeLayerName);
        if (!activeLayerExists) {
            const firstUnlockedLayer = this.layers.find(l => !l.locked);
            this.activeLayerName = firstUnlockedLayer ? firstUnlockedLayer.name : (this.layers[0] ? this.layers[0].name : null);
        }
        
        // 最新の状態をプラグインに通知
        this.plugin.updateLayerStates(this.layers);
        
        // UIを再描画
        this.buildLayerPanel();
    }
//レイヤー系ここまで
  /**
     * ★★★ 新規メソッド ★★★
     * イベントエディタを開き、その中身を構築する
     * @param {Phaser.GameObjects.GameObject} selectedObject
     */
    openEventEditor(selectedObject) {
        if (!this.eventEditorOverlay || !selectedObject) return;
// ★★★ モーダルを開く前に、Phaserの入力を無効化する ★★★
        this.game.input.enabled = false;
        console.log("[EditorUI] Phaser input disabled for Event Editor.");
        this.editingObject = selectedObject; // 編集対象を保持

        if (this.eventEditorTitle) {
            this.eventEditorTitle.innerText = `イベント編集: ${this.editingObject.name}`;
        }
        
        // ★ ツールバーとキャンバス（まだ空）を構築するメソッドを呼び出す
        this.populateVslToolbar();
        // this.populateVslCanvas(); // ← これは次のステップ

        this.eventEditorOverlay.style.display = 'flex';
    }

    /**
     * ★★★ 新規メソッド ★★★
     * イベントエディタを閉じる
     */
    closeEventEditor() {
        if (!this.eventEditorOverlay) return;
        this.eventEditorOverlay.style.display = 'none';
        this.editingObject = null;
        this.game.input.enabled = true;
        console.log("[EditorUI] Phaser input re-enabled.");
        if(this.plugin) {
            this.plugin.pluginManager.game.input.enabled = true;
        }
    }
    
    /**
     * ★★★ 新規メソッド (旧 populateEventEditor の進化形) ★★★
     * VSLツールバーのノードリストを生成する
     */
    populateVslToolbar() {
        if (!this.vslNodeList) return;
        this.vslNodeList.innerHTML = '';

        const eventTagHandlers = this.game.registry.get('eventTagHandlers'); 
        
        if (eventTagHandlers) {
            for (const tagName in eventTagHandlers) {
                const button = document.createElement('button');
                button.className = 'node-add-button';
                button.innerText = `[${tagName}]`;
                
                button.addEventListener('click', () => {
                    console.log(`(TODO) Add node: ${tagName}`);
                });
                
                this.vslNodeList.appendChild(button);
            }
        } else {
            this.vslNodeList.innerHTML = '<p>Event Handlers not found.</p>';
        }
    }
     // src/editor/EditorUI.js

    /**
     * ★★★ 本実装に置き換え ★★★
     */
    addNodeToEventData(tagName) {
        if (!this.editingObject) return;
        
        const events = this.editingObject.getData('events');
        if (!events || events.length === 0) return;
        const targetEvent = events[0]; // とりあえず最初のイベントを対象とする

        const newNode = {
            id: `node_${Date.now()}`,
            type: tagName,
            params: {},
            x: 50,
            y: 50
        };
        
        targetEvent.nodes.push(newNode);
        this.editingObject.setData('events', events);
        
        // ★ キャンバスを再描画して、追加したノードを表示する
        this.populateVslCanvas();
    }

    /**
     * ★★★ 本実装に置き換え ★★★
     */
    populateVslCanvas() {
        if (!this.vslCanvas || !this.editingObject) return;
        this.vslCanvas.innerHTML = ''; // キャンバスをクリア

        const events = this.editingObject.getData('events');
        if (!events || events.length === 0) return;
        const targetEvent = events[0];
        
        if (targetEvent.nodes) {
            targetEvent.nodes.forEach(nodeData => {
                const nodeElement = document.createElement('div');
                nodeElement.className = 'vsl-node'; // CSSでスタイリング
                nodeElement.style.left = `${nodeData.x}px`;
                nodeElement.style.top = `${nodeData.y}px`;
                nodeElement.dataset.nodeId = nodeData.id;

                nodeElement.innerHTML = `<strong>[${nodeData.type}]</strong>`;
                
                this.vslCanvas.appendChild(nodeElement);
            });
        }
    }
}