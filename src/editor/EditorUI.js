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
        
         //ノードプロパティ
        this.activeEventId = null; // ★ 現在編集中のイベントの「ID」を保持する
        this.selectedNodeData = null;
        this.connectionState = {
            isActive: false,      // 接続モード中か？
            fromNodeId: null,     // 接続元のノードID
            previewLine: null   // プレビュー用の線（SVG要素）
        };
        this.vslMode = 'select'; // 'select' or 'pan'
        this.panState = {
            isPanning: false, // パンモード中か？
            startX: 0,
            startY: 0
        };
   //レイヤー

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
        this.vslCanvas = document.getElementById('vsl-canvas');
        this.vslTabs = document.getElementById('vsl-tabs');
        this.smEditorOverlay = document.getElementById('sm-editor-overlay');
    }

  

    getActiveGameScene() {
        return this.plugin?.getActiveGameScene();
    }

    // =================================================================
    // イベントリスナー初期化
    // =================================================================
// in EditorUI.js

   
  // src/editor/EditorUI.js

    initializeEventListeners() {
        // --- UIボタンのリスナー ---
       document.getElementById('add-asset-button')?.addEventListener('click', this.onAddButtonClicked);
    document.getElementById('add-text-button')?.addEventListener('click', this.onAddTextClicked);
    document.getElementById('select-mode-btn')?.addEventListener('click', () => this.setEditorMode('select'));
    document.getElementById('tilemap-mode-btn')?.addEventListener('click', () => this.setEditorMode('tilemap'));
    document.getElementById('add-layer-btn')?.addEventListener('click', this.addNewLayer);
    document.getElementById('event-editor-close-btn')?.addEventListener('click', this.closeEventEditor);
    document.getElementById('sm-editor-close-btn')?.addEventListener('click', this.closeStateMachineEditor);
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
        } // ★★★ layerListContainerのif文は、ここで終わりです ★★★


        // ▼▼▼【ここからが、VSLノード関連のイベント処理です】▼▼▼
        // --------------------------------------------------------------------

        // --- VSLモード切替ボタン ---
        const selectBtn = document.getElementById('vsl-select-mode-btn');
        if (selectBtn) {
            selectBtn.addEventListener('click', () => this.setVslMode('select'));
        }
        const panBtn = document.getElementById('vsl-pan-mode-btn');
        if (panBtn) {
            panBtn.addEventListener('click', () => this.setVslMode('pan'));
        }
        
        // --- VSLキャンバス (イベント委譲の親) ---
        const canvasWrapper = document.getElementById('vsl-canvas-wrapper');
        if (canvasWrapper) {
            canvasWrapper.addEventListener('pointerdown', (event) => {
                if (this.vslMode === 'pan') {
                    // (パンモードの処理)
                    return; 
                }
                const pinElement = event.target.closest('[data-pin-type]');
                if (pinElement) {
                    event.stopPropagation();
                    this.onPinClicked(pinElement);
                    return;
                }
            });
        }
        // --------------------------------------------------------------------
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

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
                // ▼▼▼【ここを、新しいメソッドを呼び出すように変更】▼▼▼
                const newMode = event.target.checked ? 'play' : 'select';
                this.setGlobalEditorMode(newMode);
                // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
            });
        }
        
        // --- ヘルプモーダル ---
        document.getElementById('help-modal-close-btn')?.addEventListener('click', () => this.closeHelpModal());
        this.createHelpButton();
        
        this.createPauseToggle();
    }
     /**
     * ★★★ 新規メソッド ★★★
     * エディタ全体のグローバルなモードを設定し、UIとプラグインの状態を同期させる
     * @param {'select' | 'play'} mode
     */
    setGlobalEditorMode(mode) {
        if (this.plugin.currentMode === mode) return;

        // --- 1. プラグインの状態を更新 ---
        this.plugin.currentMode = mode;
        this.game.registry.set('editor_mode', mode);
        // --- 2. UIの見た目を更新 ---
        const modeToggle = document.getElementById('mode-toggle-checkbox');
        const modeLabel = document.getElementById('mode-label');
        if (modeToggle) {
            modeToggle.checked = (mode === 'play');
        }
        if (modeLabel) {
            modeLabel.textContent = (mode === 'play') ? 'Play Mode' : 'Select Mode';
        }
        
        console.log(`[EditorUI] Global mode changed to: ${mode}`);
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
// src/editor/EditorUI.js

    onAddButtonClicked = () => {
        if (!this.selectedAssetKey) {
            alert('アセットを選択してください。');
            return;
        }

        // ▼▼▼【変更点 1: targetSceneの取得を一度だけにする】▼▼▼
        const targetScene = (this.selectedAssetType === 'ui')
            ? this.game.scene.getScene('UIScene')
            : this.getActiveGameScene();

        if (!targetScene) {
            alert("対象のシーンが見つかりませんでした。");
            return;
        }

        const newName = `${this.selectedAssetKey.toLowerCase()}_${Date.now()}`;
        
        // ▼▼▼【変更点 2: 変数宣言を関数の先頭に移動】▼▼▼
        let newObjectOrObjects = null;

        // --- オブジェクトの生成 ---
        if (this.selectedAssetType === 'ui') {
            if (typeof targetScene.addUiComponentFromEditor === 'function') {
                newObjectOrObjects = targetScene.addUiComponentFromEditor(this.selectedAssetKey, newName);
            }
        } 
        else if ((this.selectedAssetType === 'image' || this.selectedAssetType === 'spritesheet') && typeof targetScene.addObjectFromEditor === 'function') {
            newObjectOrObjects = targetScene.addObjectFromEditor(this.selectedAssetKey, newName, this.activeLayerName);
        } 
        else if ((this.selectedAssetType === 'prefab' || this.selectedAssetType === 'GroupPrefab') && typeof targetScene.addPrefabFromEditor === 'function') {
            newObjectOrObjects = targetScene.addPrefabFromEditor(this.selectedAssetKey, newName, this.activeLayerName);
        }

        // ▼▼▼【変更点 3: オブジェクト選択処理を、if/elseの外に移動】▼▼▼
        // --- 新しく生成されたオブジェクトを選択状態にする ---
        if (newObjectOrObjects && this.plugin) {
            if (Array.isArray(newObjectOrObjects)) {
                // 配列が返ってきた場合（グループプレハブ）は、複数選択
                this.plugin.selectMultipleObjects(newObjectOrObjects);
            } else {
                // 単一オブジェクトが返ってきた場合は、単体選択
                this.plugin.selectSingleObject(newObjectOrObjects);
            }
        }
    }

    
  
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
    
   addNewLayer = () => {
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
        /**
     * ★★★ 再描画問題 - 最終FIX版 ★★★
     * イベントエディタを開き、その中身を「選択されたオブジェクトのデータで」構築する
     * @param {Phaser.GameObjects.GameObject} selectedObject - 編集対象のオブジェクト
     */
   openEventEditor(selectedObject) {
        if (!this.eventEditorOverlay || !selectedObject) return;
        this.game.input.enabled = false;
        
        this.editingObject = selectedObject;
        
        if (this.eventEditorTitle) {
            this.eventEditorTitle.innerText = `イベント編集: ${this.editingObject.name}`;
        }
        
        // ★★★ タブUIを構築する新しいメソッドを呼び出す ★★★
        this.buildVslTabs();
        
        // ★★★ 最初に表示するイベントを決定する ★★★
        const events = this.editingObject.getData('events') || [];
        if (events.length > 0) {
            // 最初のイベントをアクティブにする
            this.setActiveVslEvent(events[0].id);
        } else {
            // イベントがなければ、すべてを空にする
            this.setActiveVslEvent(null);
        }

        this.eventEditorOverlay.style.display = 'flex';
    }

 // in src/editor/EditorUI.js

    /**
     * ★★★ コピー/ペースト機能付き - 完成版 ★★★
     * イベントグラフを切り替えるためのタブUIを構築する
     */
    buildVslTabs() {
        if (!this.vslTabs) return;
        this.vslTabs.innerHTML = '';
        
        const events = this.editingObject.getData('events') || [];
        events.forEach(eventData => {
            const tabButton = document.createElement('button');
            tabButton.className = 'vsl-tab-button';
            tabButton.innerText = eventData.trigger || 'Event';
            
            if (this.activeEventId === eventData.id) {
                tabButton.classList.add('active');
            }

            tabButton.addEventListener('click', () => this.setActiveVslEvent(eventData.id));
            this.vslTabs.appendChild(tabButton);
        });

        // --- 「イベントを追加」ボタン ---
        const addButton = document.createElement('button');
        addButton.className = 'vsl-add-event-button';
        addButton.innerText = '+';
        addButton.title = '新しいイベントを追加';
        addButton.addEventListener('click', () => {
            // ★★★ この処理もここで実装 ★★★
            const currentEvents = this.editingObject.getData('events') || [];
            const newEvent = {
                id: `event_${Date.now()}`,
                trigger: 'onClick', // デフォルトトリガー
                nodes: [],
                connections: []
            };
            currentEvents.push(newEvent);
            this.editingObject.setData('events', currentEvents);
            
            this.buildVslTabs(); // タブUIを再描画
            this.setActiveVslEvent(newEvent.id); // 作成した新しいイベントをアクティブにする
        });
        this.vslTabs.appendChild(addButton);

        const systemScene = this.game.scene.getScene('SystemScene');

        // --- 「コピー」ボタン ---
        if (this.activeEventId && this.activeEventData) {
            const copyButton = document.createElement('button');
            copyButton.className = 'vsl-tool-button';
            copyButton.innerText = '📋';
            copyButton.title = 'このイベントをコピー';
            copyButton.addEventListener('click', () => {
                // ▼▼▼【ここからがコピー処理】▼▼▼
                const clonedData = this.cloneEventDataWithNewIds(this.activeEventData);
                systemScene.eventClipboard = clonedData;
                console.log("Copied event to clipboard:", systemScene.eventClipboard);
                // 貼り付けボタンを即座に表示するために、タブUIを再描画
                this.buildVslTabs();
                // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
            });
            this.vslTabs.appendChild(copyButton);
        }
        
        // --- 「貼り付け」ボタン ---
        if (systemScene && systemScene.eventClipboard) {
            const pasteButton = document.createElement('button');
            pasteButton.className = 'vsl-tool-button';
            pasteButton.innerText = '📄';
            pasteButton.title = 'コピーしたイベントを貼り付け';
            pasteButton.addEventListener('click', () => {
                // ▼▼▼【ここからが貼り付け処理】▼▼▼
                const dataToPaste = this.cloneEventDataWithNewIds(systemScene.eventClipboard);
                const currentEvents = this.editingObject.getData('events') || [];
                currentEvents.push(dataToPaste);
                this.editingObject.setData('events', currentEvents);

                this.buildVslTabs();
                this.setActiveVslEvent(dataToPaste.id); // 貼り付けたイベントをアクティブにする
                // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
            });
            this.vslTabs.appendChild(pasteButton);
        }
    }
    
    /**
     * ★★★ 新規メソッド ★★★
     * 指定されたIDのイベントグラフを、アクティブにして表示する
     * @param {string | null} eventId - アクティブにするイベントのID
     */
   // src/editor/EditorUI.js

    /**
     * ★★★ 最終FIX版 ★★★
     * 指定されたIDのイベントグラフを、アクティブにして表示する
     * @param {string | null} eventId - アクティブにするイベントのID
     */
    setActiveVslEvent(eventId) {
        this.activeEventId = eventId;
        
        // --- 1. 新しいアクティブイベントのデータを検索 ---
        const events = this.editingObject.getData('events') || [];
        this.activeEventData = events.find(e => e.id === eventId) || null;
        
        // --- 2. すべての関連UIを、新しいデータで再描画 ---
        //    (populateVslTriggerEditorは、まだないのでコメントアウト)
        
        // ▼▼▼【ここが、エラーを解決する修正です】▼▼▼
        // --------------------------------------------------------------------
        // ★★★ populateVslToolbarにも、見つけたactiveEventDataを渡す ★★★
        this.populateVslToolbar(this.activeEventData);
        // --------------------------------------------------------------------
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        
        this.populateVslCanvas(this.activeEventData); 
         this.populateVslTriggerEditor(this.activeEventData); // ← 将来これは復活させる

        // --- 3. 最後に、タブの見た目を更新 ---
        this.buildVslTabs();
    }

    /**
     * ★★★ 新規メソッド ★★★
     * イベントエディタを閉じる
     */
closeEventEditor = () => {
        if (!this.eventEditorOverlay) return;
        this.eventEditorOverlay.style.display = 'none';
        this.editingObject = null;
        this.game.input.enabled = true;
        console.log("[EditorUI] Phaser input re-enabled.");
        if(this.plugin) {
            this.plugin.pluginManager.game.input.enabled = true;
        }
    }
    
   // in src/editor/EditorUI.js

    /**
     * ★★★ アルファベット順ソート機能付き - 最終版 ★★★
     * VSLツールバーのノードリストを生成する
     * @param {object | null} activeEvent - 現在アクティブなイベントのデータ
     */
    populateVslToolbar(activeEvent) {
        if (!this.vslNodeList) return;
        this.vslNodeList.innerHTML = '';
        
        if (!activeEvent) return;

        const eventTagHandlers = this.game.registry.get('eventTagHandlers'); 
        
        if (eventTagHandlers) {
            // ▼▼▼【ここが修正の核心です】▼▼▼
            // --------------------------------------------------------------------

            // 1. オブジェクトからキー（タグ名）の配列を取得する
            const tagNames = Object.keys(eventTagHandlers);

            // 2. 配列をアルファベット順にソートする
            tagNames.sort();

            // 3. ソート済みの配列を使ってループ処理を行う
            for (const tagName of tagNames) {
            // --------------------------------------------------------------------
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
            
                const button = document.createElement('button');
                button.className = 'node-add-button';
                button.innerText = `[${tagName}]`;
                
                button.addEventListener('click', () => {
                    this.addNodeToEventData(tagName, activeEvent);
                });
                
                this.vslNodeList.appendChild(button);
            }
        } else {
            this.vslNodeList.innerHTML = '<p>Event Handlers not found.</p>';
        }
    }

    /**
     * ★★★ マルチトリガー対応版 - 最終FIX ★★★
     * @param {string} tagName - 追加するノードのタイプ
     * @param {object} targetEvent - 追加先のイベントグラフのデータ
     */
   // in src/editor/EditorUI.js

  /**
 * ★★★ 既存の addNodeToEventData を、この内容に置き換える ★★★
 * 引数で渡されたイベントデータにノードを追加する
 * @param {string} tagName - 追加するノードのタイプ
 * @param {object} targetEventData - 追加先のVSLデータ
 */
addNodeToEventData(tagName, targetEventData) {
    if (!this.editingObject || !targetEventData) return;
    
    // --- ノードデータの生成 (ここは共通) ---
    const existingNodeCount = targetEventData.nodes.length;
    const newNode = {
        id: `node_${Date.now()}`, type: tagName, params: {},
        x: 50, y: 50 + (existingNodeCount * 80)
    };
    
    const eventTagHandlers = this.game.registry.get('eventTagHandlers');
    const handler = eventTagHandlers?.[tagName];
    if (handler?.define?.params) {
        handler.define.params.forEach(paramDef => {
            if (paramDef.defaultValue !== undefined) {
                newNode.params[paramDef.key] = paramDef.defaultValue;
            }
        });
    }
    
    targetEventData.nodes.push(newNode);
    
    // ▼▼▼【ここが修正の核心】▼▼▼
    const isSmEditor = this.smEditorOverlay.style.display === 'flex';
    if (isSmEditor) {
        // ステートマシンエディタの場合: stateMachineデータを丸ごと保存
        this.editingObject.setData('stateMachine', this.stateMachineData);
        // UIを再描画
        this.displayActiveVslEditor();
    } else {
        // イベントエディタの場合: eventsデータを丸ごと保存
        const allEvents = this.editingObject.getData('events');
        this.editingObject.setData('events', allEvents);
        // UIを再描画
        this.setActiveVslEvent(this.activeEventId);
    }
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
}

   /**
     * ★★★ 新規メソッド ★★★
     * VSLトリガー編集UIを構築・再描画する
     * @param {object | null} activeEvent - 現在アクティブなイベントのデータ
     */
    populateVslTriggerEditor(activeEvent) {
        const select = document.getElementById('vsl-trigger-select');
        const contextContainer = document.getElementById('vsl-trigger-context');
        if (!select || !contextContainer || !this.editingObject) return;

        // --- イベントが選択されていない場合は、UIを隠すか無効化する ---
        if (!activeEvent) {
            select.innerHTML = '';
            contextContainer.innerHTML = '';
            return;
        }

        // --- 1. ドロップダウンの中身を生成 ---
        select.innerHTML = '';
        const availableTriggers = ['onClick', 'onReady', 'onCollide_Start', 'onStomp', 'onHit', 'onOverlap_Start', 'onOverlap_End'];
        availableTriggers.forEach(triggerName => {
            const option = document.createElement('option');
            option.value = triggerName;
            option.innerText = triggerName;
            if (triggerName === activeEvent.trigger) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        // --- 2. ドロップダウンが変更されたときの処理 ---
        select.onchange = () => {
            activeEvent.trigger = select.value;
            delete activeEvent.targetGroup; // 不要なコンテキスト情報を削除
            
            const allEvents = this.editingObject.getData('events');
            this.editingObject.setData('events', allEvents);
            
            // ★ 変更をUIに反映するために、タブとトリガーUIを再描画
            this.buildVslTabs(); 
            this.populateVslTriggerEditor(activeEvent);
        };

        // --- 3. コンテキスト入力欄（相手のグループなど）を生成 ---
        contextContainer.innerHTML = '';
        if (['onCollide_Start', 'onStomp', 'onHit', 'onOverlap_Start', 'onOverlap_End'].includes(activeEvent.trigger)) {
            const label = document.createElement('label');
            label.innerText = '相手のグループ: ';
            const input = document.createElement('input');
            input.type = 'text';
            input.value = activeEvent.targetGroup || '';
            input.onchange = () => {
                activeEvent.targetGroup = input.value;
                const allEvents = this.editingObject.getData('events');
                this.editingObject.setData('events', allEvents);
            };
            contextContainer.append(label, input);
        }
    }


    buildNodeContent(nodeElement, nodeData) {
        nodeElement.innerHTML = ''; // クリア

        const eventTagHandlers = this.game.registry.get('eventTagHandlers');
        const handler = eventTagHandlers ? eventTagHandlers[nodeData.type] : null;
        const pinDefine = handler?.define?.pins;

        // --- 列1: 入力ピン ---
        const inputsContainer = document.createElement('div');
        inputsContainer.className = 'vsl-pins-container inputs';
        
        const inputPins = pinDefine?.inputs || [{ name: 'input' }];
        inputPins.forEach(pinDef => {
            const pinWrapper = document.createElement('div');
            pinWrapper.className = 'vsl-pin-wrapper';
            
            const pinElement = document.createElement('div');
            pinElement.className = 'vsl-node-pin input';
            pinElement.dataset.pinType = 'input';
            pinElement.dataset.pinName = pinDef.name;
            
            const pinLabel = document.createElement('span');
            pinLabel.className = 'pin-label';
            if (pinDef.label) pinLabel.innerText = pinDef.label;
            
            pinWrapper.append(pinElement, pinLabel);
            inputsContainer.appendChild(pinWrapper);
        });
        nodeElement.appendChild(inputsContainer);

        // --- 列2: 中央コンテンツ ---
        const centerContent = document.createElement('div');
        centerContent.className = 'vsl-node-content';
        
        const title = document.createElement('strong');
        title.innerText = `[${nodeData.type}]`;
        
        const paramsContainer = document.createElement('div');
        paramsContainer.className = 'node-params';
        
        if (handler && handler.define && Array.isArray(handler.define.params)) {
            handler.define.params.forEach(paramDef => {
                if (paramDef.type === 'asset_key') {
                    this.createNodeAssetSelectInput(paramsContainer, nodeData, paramDef.key, paramDef.label, paramDef);
                } else if (paramDef.type === 'select') {
                    this.createNodeSelectInput(paramsContainer, nodeData, paramDef.key, paramDef.label, paramDef.defaultValue, paramDef.options);
                } else if (paramDef.type === 'number') {
                    this.createNodeNumberInput(paramsContainer, nodeData, paramDef.key, paramDef.label, paramDef.defaultValue);
                } else {
                    this.createNodeTextInput(paramsContainer, nodeData, paramDef.key, paramDef.label, paramDef.defaultValue);
                }
            });
        }
        
        this.createNodePositionInput(paramsContainer, nodeData, 'x');
        this.createNodePositionInput(paramsContainer, nodeData, 'y');
        
        const deleteButton = document.createElement('button');
        deleteButton.innerText = '削除';
        deleteButton.className = 'node-delete-button';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`ノード [${nodeData.type}] を削除しますか？`)) {
                this.deleteNode(nodeData.id);
            }
        });

        centerContent.append(title, paramsContainer, deleteButton);
        nodeElement.appendChild(centerContent);

        // --- 列3: 出力ピン ---
        const outputsContainer = document.createElement('div');
        outputsContainer.className = 'vsl-pins-container outputs';

        const outputPins = pinDefine?.outputs || [{ name: 'output' }];
        outputPins.forEach(pinDef => {
            const pinWrapper = document.createElement('div');
            pinWrapper.className = 'vsl-pin-wrapper';

            const pinElement = document.createElement('div');
            pinElement.className = 'vsl-node-pin output';
            pinElement.dataset.pinType = 'output';
            pinElement.dataset.pinName = pinDef.name;

            const pinLabel = document.createElement('span');
            pinLabel.className = 'pin-label';
            if (pinDef.label) pinLabel.innerText = pinDef.label;

            pinWrapper.append(pinLabel, pinElement); // ラベルが先
            outputsContainer.appendChild(pinWrapper);
        });
        nodeElement.appendChild(outputsContainer);
    }
   
   
/**
 * ★★★ 既存の createNodePositionInput を、この内容に置き換える ★★★
 * ノードのX/Y座標を編集するUIを生成する (スライダー付き)
 */
createNodePositionInput(container, nodeData, key) {
    this.createNodeSliderInput(
        container,
        key.toUpperCase(),
        Math.round(nodeData[key]),
        0, 4000, 1,
        (value) => {
            if (!this.plugin) return;

            // ▼▼▼【ここが修正の核心】▼▼▼
            const isSmEditor = this.smEditorOverlay.style.display === 'flex';
            if (isSmEditor) {
                // ステートマシンエディタの場合、新しい専用メソッドを呼ぶ
                this.plugin.updateStateMachineNodeParam(nodeData, key, value, true);
            } else {
                // イベントエディタの場合、既存のメソッドを呼ぶ
                this.plugin.updateNodeParam(nodeData, key, value, true);
            }
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        }
    );
}

 
    /**
     * ★★★ A案＋ピン接続 - 完成版 ★★★
     * VSLキャンバスでポインターが押されたときの処理
     * @param {PointerEvent} downEvent - pointerdownイベントオブジェクト
     */
    onVslCanvasPointerDown(downEvent) {
        // --- 1. パンモードの場合は、パン処理を開始して、ここで終了 ---
        if (this.vslMode === 'pan') {
            downEvent.preventDefault();
            const canvasWrapper = document.getElementById('vsl-canvas-wrapper');
            const startScrollX = canvasWrapper.scrollLeft;
            const startScrollY = canvasWrapper.scrollTop;
            const startClientX = downEvent.clientX;
            const startClientY = downEvent.clientY;
            
            const onPanMove = (moveEvent) => {
                moveEvent.preventDefault();
                const dx = moveEvent.clientX - startClientX;
                const dy = moveEvent.clientY - startClientY;
                canvasWrapper.scrollLeft = startScrollX - dx;
                canvasWrapper.scrollTop = startScrollY - dy;
            };

            const onPanUp = () => {
                window.removeEventListener('pointermove', onPanMove);
                window.removeEventListener('pointerup', onPanUp);
            };

            window.addEventListener('pointermove', onPanMove);
            window.addEventListener('pointerup', onPanUp);
            return; 
        }

        // --- 2. セレクトモードの処理 ---
        
        // ★★★ 修正点: 未定義の`event`ではなく、引数の`downEvent`を使う ★★★
        const pinElement = downEvent.target.closest('[data-pin-type]');
        const nodeElement = downEvent.target.closest('[data-is-node="true"]');
        
        // 入力欄のクリックは何もしない
        if (downEvent.target.tagName === 'INPUT') {
            return;
        }

        // --- ケースA: ピンがクリックされた場合 (接続処理) ---
        if (pinElement) {
            downEvent.stopPropagation();
            this.onPinClicked(pinElement);
        } 
        // --- ケースB: ノードがクリックされた場合 (選択処理) ---
        else if (nodeElement) {
            const nodeId = nodeElement.dataset.nodeId;
            const events = this.editingObject.getData('events');
            const nodeData = events[0].nodes.find(n => n.id === nodeId);
            if (nodeData) {
                // selectNodeはサイドバーを更新するので、もう不要
                // this.selectNode(nodeData); 
            }
        } 
        // --- ケースC: 何もない場所がクリックされた場合 (選択解除) ---
        else {
            // deselectNodeはサイドバーを更新するので、もう不要
            // this.deselectNode();
        }
    }
/**
     * ★★★ 新規メソッド ★★★
     * ノード接続モードを開始する
     */
    startConnection(fromNodeId, event) {
        this.connectionState.isActive = true;
        this.connectionState.fromNodeId = fromNodeId;
        
        // SVGでプレビュー用の線を描画する準備
        // (このSVGのセットアップは少し複雑なので、まずはロジックを完成させる)
        console.log(`Connection started from node: ${fromNodeId}`);
    }
  
   /**
 * ★★★ 復活させるメソッド (A案仕様) ★★★
 * VSLノードを選択し、プロパティパネルの更新をプラグインに依頼する
 */
selectNode(nodeData) {
    this.selectedNodeData = nodeData;
    console.log("Selected node:", nodeData);

    // ★ EditorPluginに、プロパティパネルを「ノード編集モード」で更新するよう依頼
    if (this.plugin) {
        this.plugin.updatePropertyPanelForNode(nodeData);
    }
    
    // 選択されたノードの見た目を変える (CSSで .vsl-node.selected を定義)
    this.vslCanvas.querySelectorAll('.vsl-node.selected').forEach(el => el.classList.remove('selected'));
    const el = this.vslCanvas.querySelector(`[data-node-id="${nodeData.id}"]`);
    if (el) el.classList.add('selected');
}

/**
 * ★★★ 復活させるメソッド (A案仕様) ★★★
 * VSLノードの選択を解除する
 */
deselectNode() {
    if (!this.selectedNodeData) return;
    this.selectedNodeData = null;

    if (this.plugin) {
        // ★ プロパティパネルを、通常の「オブジェクト編集モード」に戻すよう依頼
        this.plugin.selectSingleObject(this.editingObject);
    }

    this.vslCanvas.querySelectorAll('.vsl-node.selected').forEach(el => el.classList.remove('selected'));
}
  
    
 // in EditorUI.js

/**
 * ★★★ データ欠損防止策を施した最終版 ★★★
 * ノード内に、パラメータを編集するためのテキスト入力欄を1行生成する
 */
// in EditorUI.js

/**
 * ★★★ イベントを 'input' に変更した最終版 ★★★
 * ノード内に、パラメータを編集するためのテキスト入力欄を1行生成する
 */
createNodeTextInput(container, nodeData, paramKey, label, defaultValue) {
    const row = document.createElement('div');
    row.className = 'node-param-row';
    const labelEl = document.createElement('label');
    labelEl.innerText = `${label}: `;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = nodeData.params?.[paramKey] ?? defaultValue ?? '';
    
    // ▼▼▼ イベントを 'change' から 'input' に変更 ▼▼▼
    input.addEventListener('input', () => {
        if (!this.plugin) return;
        const isSmEditor = this.smEditorOverlay.style.display === 'flex';
        if (isSmEditor) {
            this.plugin.updateStateMachineNodeParam(nodeData, paramKey, input.value, false);
        } else {
            this.plugin.updateNodeParam(nodeData, paramKey, input.value, false);
        }
    });
    
    row.append(labelEl, input);
    container.appendChild(row);
}

/**
 * ★★★ イベントを 'input' に変更した最終版 ★★★
 * ノード内に、パラメータを編集するための「数値」入力欄を1行生成する
 */
createNodeNumberInput(container, nodeData, paramKey, label, defaultValue) {
    const row = document.createElement('div');
    row.className = 'node-param-row';
    const labelEl = document.createElement('label');
    labelEl.innerText = `${label}: `;
    const input = document.createElement('input');
    input.type = 'number';
    input.value = nodeData.params?.[paramKey] ?? defaultValue ?? 0;
    
    // ▼▼▼ イベントを 'change' から 'input' に変更 ▼▼▼
    input.addEventListener('input', () => {
        if (!this.plugin) return;
        const value = parseFloat(input.value);
        const isSmEditor = this.smEditorOverlay.style.display === 'flex';
        // isNaNチェックを追加して、不正な入力でデータが壊れるのを防ぐ
        if (!isNaN(value)) {
            if (isSmEditor) {
                this.plugin.updateStateMachineNodeParam(nodeData, paramKey, value, false);
            } else {
                this.plugin.updateNodeParam(nodeData, paramKey, value, false);
            }
        }
    });
    
    row.append(labelEl, input);
    container.appendChild(row);
}

/**
 * ★★★ データ欠損防止策を施した最終版 ★★★
 * ノード内に、ドロップダウン選択式の入力欄を生成する
 */
createNodeSelectInput(container, nodeData, paramKey, label, defaultValue, options) {
    const row = document.createElement('div');
    row.className = 'node-param-row';
    const labelEl = document.createElement('label');
    labelEl.innerText = `${label}: `;
    
    const select = document.createElement('select');
    // ▼▼▼【ここが最重要容疑箇所】▼▼▼
    const currentValue = nodeData.params?.[paramKey] ?? defaultValue;
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    options.forEach(optValue => {
        const option = document.createElement('option');
        option.value = optValue;
        option.innerText = optValue;
        if (currentValue == optValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    select.addEventListener('change', () => {
        if (!this.plugin) return;
        const isSmEditor = this.smEditorOverlay.style.display === 'flex';
        if (isSmEditor) {
            this.plugin.updateStateMachineNodeParam(nodeData, paramKey, select.value, false);
        } else {
            this.plugin.updateNodeParam(nodeData, paramKey, select.value, false);
        }
    });
    
    row.append(labelEl, select);
    container.appendChild(row);
}


/**
 * ★★★ データ欠損防止策を施した最終版 ★★★
 * アセット選択用のドロップダウンを生成する
 */
createNodeAssetSelectInput(container, nodeData, paramKey, label, paramDef) {
    const row = document.createElement('div');
    row.className = 'node-param-row';
    const labelEl = document.createElement('label');
    labelEl.innerText = `${label}: `;
    const select = document.createElement('select');
    
    const assetList = this.game.registry.get('asset_list') || [];
    const targetAssetType = paramDef.assetType;

    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.innerText = 'アセットを選択...';
    select.appendChild(placeholderOption);

    // ▼▼▼【ここが最重要容疑箇所】▼▼▼
    const currentValue = nodeData.params?.[paramKey] ?? paramDef.defaultValue;
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    assetList.forEach(asset => {
        let isMatch = false;
        if (targetAssetType === 'prefab') isMatch = (asset.type === 'prefab' || asset.type === 'GroupPrefab');
        else if (targetAssetType === 'image') isMatch = (asset.type === 'image' || asset.type === 'spritesheet');
        else isMatch = (asset.type === targetAssetType);
        
        if (!targetAssetType || isMatch) {
            const option = document.createElement('option');
            option.value = asset.key;
            option.innerText = `[${asset.type}] ${asset.key}`;
            if (currentValue === asset.key) {
                option.selected = true;
            }
            select.appendChild(option);
        }
    });

    select.addEventListener('change', () => {
        if (!this.plugin) return;
        const isSmEditor = this.smEditorOverlay.style.display === 'flex';
        if (isSmEditor) {
            this.plugin.updateStateMachineNodeParam(nodeData, paramKey, select.value, false);
        } else {
            this.plugin.updateNodeParam(nodeData, paramKey, select.value, false);
        }
    });
    
    row.append(labelEl, select);
    container.appendChild(row);
}
     /**
     * ★★★ 新規メソッド ★★★
     * VSLエディタの操作モードを切り替える
     * @param {'select' | 'pan'} mode - 新しいモード
     */
    setVslMode(mode) {
        if (this.vslMode === mode) return;
        this.vslMode = mode;
        console.log(`VSL mode changed to: ${mode}`);

        const selectBtn = document.getElementById('vsl-select-mode-btn');
        const panBtn = document.getElementById('vsl-pan-mode-btn');
        const canvasWrapper = document.getElementById('vsl-canvas-wrapper');

        if (mode === 'pan') {
            selectBtn.classList.remove('active');
            panBtn.classList.add('active');
            canvasWrapper.style.cursor = 'grab';
        } else { // 'select'
            panBtn.classList.remove('active');
            selectBtn.classList.add('active');
            canvasWrapper.style.cursor = 'default';
        }
    }
    // src/editor/EditorUI.js

    // ... (setVslModeメソッドなどの後)

    /**
     * ★★★ 新規追加 ★★★
     * VSLノードのピンがクリックされたときの処理
     * @param {HTMLElement} clickedPin - クリックされたピンのHTML要素
     */
 onPinClicked(clickedPin) {
    const pinType = clickedPin.dataset.pinType;
    const pinName = clickedPin.dataset.pinName;
    const parentNode = clickedPin.closest('.vsl-node');
    if (!parentNode || !parentNode.dataset.nodeId) return;
    const nodeId = parentNode.dataset.nodeId;

    if (!this.connectionState.isActive && pinType === 'output') {
        this.connectionState = {
            isActive: true, fromNodeId: nodeId, fromPinName: pinName,
            fromPinElement: clickedPin
        };
        clickedPin.classList.add('is-connecting');
    } 
    else if (this.connectionState.isActive && pinType === 'input') {
        const { fromNodeId, fromPinName } = this.connectionState;
        const toNodeId = nodeId;
        const toPinName = pinName;

        // ▼▼▼【ここが修正の核心】▼▼▼
        const isSmEditor = this.smEditorOverlay.style.display === 'flex';
        // どちらのエディタが開いているかに応じて、正しい接続作成メソッドを呼ぶ
        if (isSmEditor) {
            this.createConnection(fromNodeId, fromPinName, toNodeId, toPinName, this.activeVslData);
        } else {
            const events = this.editingObject.getData('events');
            const targetEvent = events.find(e => e.id === this.activeEventId);
            this.createConnection(fromNodeId, fromPinName, toNodeId, toPinName, targetEvent);
        }
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        if (this.connectionState.fromPinElement) {
            this.connectionState.fromPinElement.classList.remove('is-connecting');
        }
        this.connectionState = { isActive: false };
    }
    else if (this.connectionState.isActive) {
        if (this.connectionState.fromPinElement) {
            this.connectionState.fromPinElement.classList.remove('is-connecting');
        }
        this.connectionState = { isActive: false };
    }
}
 // in EditorUI.js

/**
 * ★★★ 既存の createConnection を、この内容に置き換える ★★★
 * 新しい接続をイベントデータに追加し、キャンバスを再描画する
 * @param {string} fromNodeId
 * @param {string} fromPinName
 * @param {string} toNodeId
 * @param {string} toPinName
 * @param {object} targetVslData - ★追加: 接続を追加する対象のVSLデータ
 */
createConnection(fromNodeId, fromPinName, toNodeId, toPinName, targetVslData) {
    if (!this.editingObject || !targetVslData || fromNodeId === toNodeId) return;

    if (!targetVslData.connections) {
        targetVslData.connections = [];
    }

    // 既存の接続を上書き
    targetVslData.connections = targetVslData.connections.filter(
        c => !(c.fromNode === fromNodeId && c.fromPin === fromPinName)
    );

    targetVslData.connections.push({ 
        fromNode: fromNodeId, fromPin: fromPinName, 
        toNode: toNodeId, toPin: toPinName 
    });

    // ▼▼▼【ここが修正の核心】▼▼▼
    const isSmEditor = this.smEditorOverlay.style.display === 'flex';
    if (isSmEditor) {
        this.editingObject.setData('stateMachine', this.stateMachineData);
    } else {
        const allEvents = this.editingObject.getData('events');
        this.editingObject.setData('events', allEvents);
    }
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    
    // UI再描画
    this.populateVslCanvas();
}

  // in EditorUI.js

/**
 * ★★★ 既存の drawConnections を、この内容に置き換える ★★★
 * connectionsデータに基づいて、SVGで線を描画する
 */
// in EditorUI.js

/**
 * ★★★ ベジェ曲線対応・最終FIX版 ★★★
 * connectionsデータに基づいて、SVGで滑らかな曲線を描画する。
 * イベントエディタとステートマシンエディタの両方で動作する。
 * @param {SVGElement} svgLayer - 描画対象のSVG要素
 * @param {Array<object>} nodes - ノードデータの配列
 * @param {Array<object>} connections - 接続データの配列
 */
// in EditorUI.js

/**
 * ★★★ HTML構造の差異を吸収する最終FIX版 ★★★
 * connectionsデータに基づいて、SVGで滑らかな曲線を描画する。
 */
drawConnections(svgLayer, nodes, connections) {
    const isSmEditor = this.smEditorOverlay.style.display === 'flex';
    const canvasEl = isSmEditor
        ? this.smEditorOverlay.querySelector('.sm-vsl-canvas')
        : this.vslCanvas;
    if (!canvasEl) return;

    svgLayer.innerHTML = '';
    if (!connections || connections.length === 0) return;

    connections.forEach(conn => {
        const fromNodeEl = canvasEl.querySelector(`[data-node-id="${conn.fromNode}"]`);
        const toNodeEl = canvasEl.querySelector(`[data-node-id="${conn.toNode}"]`);

        if (fromNodeEl && toNodeEl) {
            const fromPinEl = fromNodeEl.querySelector(`[data-pin-type="output"][data-pin-name="${conn.fromPin}"]`);
            const toPinEl = toNodeEl.querySelector(`[data-pin-type="input"][data-pin-name="${conn.toPin}"]`);

            if (!fromPinEl || !toPinEl) return;

            // ▼▼▼【ここからがエラー回避の修正】▼▼▼
            // 1. ノードの位置決め用ラッパー要素を取得
            //    イベントエディタとステートマシンエディタでクラス名が違う可能性を考慮
            const fromNodeWrapper = fromNodeEl.closest('.vsl-node-wrapper') || fromNodeEl.closest('.sm-vsl-node-wrapper');
            const toNodeWrapper = toNodeEl.closest('.vsl-node-wrapper') || toNodeEl.closest('.sm-vsl-node-wrapper');
            
            // 2. もしラッパーが見つからなければ、エラーを回避して次の接続へ
            if (!fromNodeWrapper || !toNodeWrapper) {
                console.warn(`[drawConnections] Could not find wrapper for node ${conn.fromNode} or ${conn.toNode}. Skipping connection.`);
                return; // forEachの次のイテレーションへ
            }
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

            const fromNodeX = fromNodeWrapper.offsetLeft;
            const fromNodeY = fromNodeWrapper.offsetTop;
            const toNodeX = toNodeWrapper.offsetLeft;
            const toNodeY = toNodeWrapper.offsetTop;

            const fromPinX = fromPinEl.offsetLeft + fromPinEl.offsetWidth / 2;
            const fromPinY = fromPinEl.offsetTop + fromPinEl.offsetHeight / 2;
            const toPinX = toPinEl.offsetLeft + toPinEl.offsetWidth / 2;
            const toPinY = toPinEl.offsetTop + toPinEl.offsetHeight / 2;
            
            const startX = fromNodeX + fromPinX;
            const startY = fromNodeY + fromPinY;
            const endX = toNodeX + toPinX;
            const endY = toNodeY + toPinY;

            const dx = Math.abs(startX - endX);
            const handleOffset = Math.max(50, dx / 2);

            const controlX1 = startX + handleOffset;
            const controlY1 = startY;
            const controlX2 = endX - handleOffset;
            const controlY2 = endY;
            
            const path = document.createElementNS('http://www.w3.0/2000/svg', 'path');
            const pathData = `M ${startX},${startY} C ${controlX1},${controlY1} ${controlX2},${controlY2} ${endX},${endY}`;
            path.setAttribute('d', pathData);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', '#888');
            path.setAttribute('stroke-width', '2');
            
            svgLayer.appendChild(path);
        }
    });
}
      /**
     * ★★★ マルチトリガー対応版 (buildNodeContentから移動) ★★★
     * 「現在アクティブな」イベントグラフから、指定されたIDのノードを削除する
     * @param {string} nodeIdToDelete - 削除するノードのID
     */
    deleteNode(nodeIdToDelete) {
        if (!this.editingObject || !this.activeEventId) return;

        const events = this.editingObject.getData('events');
        // ★ アクティブなIDを使って、編集対象のイベントグラフを見つける
        const targetEvent = events.find(e => e.id === this.activeEventId);
        if (!targetEvent) return;

        // --- 1. nodes配列から、該当するノードを削除 ---
        if (targetEvent.nodes) {
            targetEvent.nodes = targetEvent.nodes.filter(n => n.id !== nodeIdToDelete);
        }
        
        // --- 2. connections配列から、このノードに関連する接続をすべて削除 ---
        if (targetEvent.connections) {
            targetEvent.connections = targetEvent.connections.filter(c => 
                c.fromNode !== nodeIdToDelete && c.toNode !== nodeIdToDelete
            );
        }

        // --- 3. 変更を永続化 ---
        this.editingObject.setData('events', events);
        
        // --- 4. キャンバスを再描画 ---
        this.populateVslCanvas();
    }
  // in EditorUI.js

/**
 * ★★★ 既存の populateVslCanvas を、この内容で確認・修正 ★★★
 */
populateVslCanvas() {
    // どのモーダルで呼ばれても対応できるように、コンテキストを判別
    const isSmEditor = this.smEditorOverlay.style.display === 'flex';
    const canvasEl = isSmEditor
        ? this.smEditorOverlay.querySelector('.sm-vsl-canvas')
        : this.vslCanvas;
        
    if (!canvasEl) return;
    
    // --- 描画対象のデータを決定 ---
    let targetVslData;
    if (isSmEditor) {
        targetVslData = this.activeVslData;
    } else {
        const events = this.editingObject?.getData('events') || [];
        targetVslData = events.find(e => e.id === this.activeEventId);
    }
    
    // --- 描画処理 ---
    canvasEl.innerHTML = ''; 
    const svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgLayer.id = 'vsl-svg-layer'; 
    svgLayer.setAttribute('width', '4000');
    svgLayer.setAttribute('height', '4000');
    canvasEl.appendChild(svgLayer);

    if (!targetVslData) return;

    if (targetVslData.nodes) {
        targetVslData.nodes.forEach(nodeData => {
            const nodeWrapper = document.createElement('div');
            nodeWrapper.className = 'vsl-node-wrapper';
            nodeWrapper.style.left = `${nodeData.x}px`;
            nodeWrapper.style.top = `${nodeData.y}px`;

            const nodeElement = document.createElement('div');
            nodeElement.className = 'vsl-node';
            nodeElement.dataset.isNode = 'true';
            nodeElement.dataset.nodeId = nodeData.id;

            this.buildNodeContent(nodeElement, nodeData);
            
            nodeWrapper.appendChild(nodeElement);
            canvasEl.appendChild(nodeWrapper);
        });
    }
    
    // ▼▼▼【ここが重要】▼▼▼
    // DOMの配置が完了した次のフレームで線を描画することで、座標計算が正確になる
    requestAnimationFrame(() => {
        if (targetVslData && targetVslData.connections) {
            // 正しい引数で drawConnections を呼び出す
            this.drawConnections(svgLayer, targetVslData.nodes, targetVslData.connections);
        }
    });
}

    /**
     * ★★★ 新規ヘルパー (タスク1) ★★★
     * ノード内に、スライダーと数値入力を組み合わせたUIを生成する
     */
    createNodeSliderInput(container, label, initialValue, min, max, step, changeCallback) {
        const row = document.createElement('div');
        row.className = 'node-param-row node-slider-row'; // スタイリング用のクラスを追加

        const labelEl = document.createElement('label');
        labelEl.innerText = `${label}: `;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = initialValue;

        const numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.style.width = '60px'; // 幅を固定
        numberInput.value = initialValue;

        // スライダーを動かしたら、数値入力も更新
        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            numberInput.value = value;
            changeCallback(value);
        });

        // 数値入力を変更したら、スライダーも更新
        numberInput.addEventListener('change', () => {
            const value = parseFloat(numberInput.value);
            slider.value = value;
            changeCallback(value);
        });
        
        row.append(labelEl, slider, numberInput);
        container.appendChild(row);
    }

    // in src/editor/EditorUI.js

    /**
     * ★★★ 新規ヘルパー (コピー機能の核心) ★★★
     * イベントグラフのデータを安全にディープコピーし、すべてのIDを振り直す
     * @param {object} originalEventData - コピー元のイベントデータ
     * @returns {object} IDがすべて新しいものに置き換えられた、イベントデータの完全なコピー
     */
    cloneEventDataWithNewIds(originalEventData) {
        // JSONを介して、元のデータを一切変更しない完全なコピーを作成
        const clonedEvent = JSON.parse(JSON.stringify(originalEventData));

        // 1. 新しいイベントIDを生成
        clonedEvent.id = `event_${Date.now()}`;

        // 2. ノードIDの古いものと新しいものの対応表を作成
        const nodeIdMap = {};
        clonedEvent.nodes.forEach(node => {
            const oldId = node.id;
            const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            node.id = newId;
            nodeIdMap[oldId] = newId;
        });

        // 3. 接続情報(connections)が古いIDを参照しないよう、新しいIDに更新
        if (clonedEvent.connections) {
            clonedEvent.connections.forEach(connection => {
                connection.fromNode = nodeIdMap[connection.fromNode];
                connection.toNode = nodeIdMap[connection.toNode];
            });
        }
        
        return clonedEvent;
    }


    /**
     * 
     * 
     * ここからステートマシン
     */
    // in src/editor/EditorUI.js
// in EditorUI.js

// =================================================================
// ステートマシン・エディタ関連のメソッド群
// =================================================================

// =================================================================
// ステートマシン・エディタ関連のメソッド群 (フェーズ2実装版)
// =================================================================

/**
 * ステートマシン・エディタを開く
 * @param {Phaser.GameObjects.GameObject} selectedObject
 */
openStateMachineEditor = (selectedObject) => {
    if (!this.smEditorOverlay || !selectedObject) return;

    // --- モーダル表示と入力無効化 ---
    document.body.classList.add('modal-open');
    this.game.input.enabled = false;
    this.editingObject = selectedObject;
    this.smEditorOverlay.style.display = 'flex';
    
    // --- タイトルの更新 ---
    const title = this.smEditorOverlay.querySelector('#sm-editor-title');
    if (title) title.innerText = `ステートマシン編集: ${this.editingObject.name}`;

    // --- オブジェクトからデータを取得 (なければ初期化) ---
    this.stateMachineData = this.editingObject.getData('stateMachine');
    if (!this.stateMachineData) {
        this.stateMachineData = this.getInitialStateMachineData();
        this.editingObject.setData('stateMachine', this.stateMachineData);
    }
    
    // ★★★ 最初に表示する状態とフックを決定 ★★★
    this.activeStateName = this.stateMachineData.initialState;
    this.activeHookName = 'onEnter'; // デフォルトはonEnter

    // --- UIの構築とリスナー設定 ---
    this.buildStatesPanel();
    this.buildHooksTabs(); // ★追加
    this.displayActiveVslEditor(); // ★追加
    this.setupStateMachineEventListeners();
}

/**
 * ステートマシン用の初期データ構造を返す
 */
getInitialStateMachineData() {
    const defaultStateName = '待機';
    return {
        initialState: defaultStateName,
        states: {
            [defaultStateName]: {
                onEnter: { nodes: [], connections: [] },
                onUpdate: { nodes: [], connections: [] },
                onExit: { nodes: [], connections: [] }
            }
        }
    };
}

/**
 * 左ペインの「状態リスト」を構築・再描画する
 */
buildStatesPanel() {
    const statesListContainer = this.smEditorOverlay.querySelector('#sm-states-list');
    if (!statesListContainer) return;
    statesListContainer.innerHTML = '';
    const stateNames = Object.keys(this.stateMachineData.states);
    stateNames.forEach(stateName => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'sm-state-item';
        itemDiv.innerText = stateName;
        itemDiv.dataset.stateName = stateName;
        if (this.activeStateName === stateName) {
            itemDiv.classList.add('active');
        }
        statesListContainer.appendChild(itemDiv);
    });
}

/**
 * ★★★ 新規メソッド ★★★
 * 右ペイン上部の「イベントフック」のタブUIを構築・再描画する
 */
buildHooksTabs() {
    const hooksTabsContainer = this.smEditorOverlay.querySelector('#sm-hooks-tabs');
    if (!hooksTabsContainer) return;
    hooksTabsContainer.innerHTML = '';

    const hooks = [
        { key: 'onEnter', label: '実行時 (onEnter)' },
        { key: 'onUpdate', label: '更新時 (onUpdate)' },
        { key: 'onExit', label: '終了時 (onExit)' }
    ];

    hooks.forEach(hook => {
        const tabButton = document.createElement('button');
        tabButton.className = 'sm-hook-tab';
        tabButton.innerText = hook.label;
        tabButton.dataset.hookName = hook.key;
        if (this.activeHookName === hook.key) {
            tabButton.classList.add('active');
        }
        hooksTabsContainer.appendChild(tabButton);
    });
}


/**
 * ★★★ 新規メソッド (VSL連携の核心) ★★★
 * 現在選択されている状態とフックに基づいて、VSLエディタの中身を表示する
 */
displayActiveVslEditor() {
    // VSLエディタのコンテナを取得
    const vslContainer = this.smEditorOverlay.querySelector('.sm-vsl-editor-container');
    if (!vslContainer) return;
    
    // --- アクティブなVSLデータを取得 ---
    const activeState = this.stateMachineData.states[this.activeStateName];
    if (!activeState) {
        vslContainer.innerHTML = `<p>状態「${this.activeStateName}」が見つかりません。</p>`;
        return;
    }
    this.activeVslData = activeState[this.activeHookName];
    if (!this.activeVslData) {
        vslContainer.innerHTML = `<p>フック「${this.activeHookName}」のデータが見つかりません。</p>`;
        return;
    }

    // --- VSLエディタのUIを描画 ---
    // populateSmVslCanvas は populateVslToolbar と populateVslCanvas を呼び出すラッパー
    this.populateSmVslCanvas();
}
/**
 * ステートマシンエディタ内のイベントリスナーを設定・更新する
 */
setupStateMachineEventListeners() {
    // --- 古いリスナーをすべて削除 ---
    this.smEditorOverlay.querySelector('#sm-add-state-btn')?.removeEventListener('click', this._onAddNewState);
    this.smEditorOverlay.querySelector('#sm-states-list')?.removeEventListener('click', this._onStateClicked);
    this.smEditorOverlay.querySelector('#sm-hooks-tabs')?.removeEventListener('click', this._onHookTabClicked); // ★追加

    // --- 新しいリスナー関数を定義 ---
    this._onAddNewState = () => {
        const newStateName = prompt('新しい状態の名前を入力してください:', `新しい状態${Object.keys(this.stateMachineData.states).length}`);
        if (newStateName && !this.stateMachineData.states[newStateName]) {
            this.stateMachineData.states[newStateName] = { onEnter: { nodes: [], connections: [] }, onUpdate: { nodes: [], connections: [] }, onExit: { nodes: [], connections: [] }};
            this.editingObject.setData('stateMachine', this.stateMachineData);
            this.buildStatesPanel();
        } else if (newStateName) {
            alert('その名前の状態は既に使用されています。');
        }
    };

    this._onStateClicked = (event) => {
        const targetItem = event.target.closest('.sm-state-item');
        if (targetItem) {
            this.activeStateName = targetItem.dataset.stateName;
            this.buildStatesPanel();
            this.displayActiveVslEditor(); // ★VSLを更新
        }
    };

    // ★★★ 新規リスナー関数 ★★★
    this._onHookTabClicked = (event) => {
        const targetTab = event.target.closest('.sm-hook-tab');
        if (targetTab) {
            this.activeHookName = targetTab.dataset.hookName;
            this.buildHooksTabs();
            this.displayActiveVslEditor(); // ★VSLを更新
        }
    };

    // --- リスナーを登録 ---
    this.smEditorOverlay.querySelector('#sm-add-state-btn')?.addEventListener('click', this._onAddNewState);
    this.smEditorOverlay.querySelector('#sm-states-list')?.addEventListener('click', this._onStateClicked);
    this.smEditorOverlay.querySelector('#sm-hooks-tabs')?.addEventListener('click', this._onHookTabClicked); // ★追加
}


/**
 * ステートマシン・エディタを閉じる
 */
closeStateMachineEditor = () => {
    if (!this.smEditorOverlay) return;
    
    this.smEditorOverlay.style.display = 'none';
    this.game.input.enabled = true;
    document.body.classList.remove('modal-open');
    
    // --- イベントリスナーを解除 ---
    this.smEditorOverlay.querySelector('#sm-add-state-btn')?.removeEventListener('click', this._onAddNewState);
    this.smEditorOverlay.querySelector('#sm-states-list')?.removeEventListener('click', this._onStateClicked);
    this.smEditorOverlay.querySelector('#sm-hooks-tabs')?.removeEventListener('click', this._onHookTabClicked);
    
    // --- 状態をリセット ---
    this.editingObject = null;
    this.stateMachineData = null;
    this.activeStateName = null;
    this.activeHookName = null;
    this.activeVslData = null;
}


// in EditorUI.js

/**
 * ★★★ 既存の populateSmVslCanvas メソッドをこれに置き換える ★★★
 * ステートマシン用のVSLツールバーとVSLキャンバスの両方を再描画する
 */
populateSmVslCanvas = () => {
    // --- 1. ツールバーの中身を描画 ---
    // populateVslToolbar は、現在アクティブなVSLデータを見てノードリストを作る
    // ステートマシンエディタの場合、`this.activeVslData` を渡してあげる必要がある
    const toolbarList = this.smEditorOverlay.querySelector('.sm-vsl-node-list');
    if (toolbarList) {
        // ★ 既存の `populateVslToolbar` を呼び出すが、コンテナ要素を渡すように改造が必要
        //    (今回は直接実装してしまうのが手っ取り早い)
        toolbarList.innerHTML = '';
        const eventTagHandlers = this.game.registry.get('eventTagHandlers');
        if (eventTagHandlers) {
            const tagNames = Object.keys(eventTagHandlers).sort();
            for (const tagName of tagNames) {
                const button = document.createElement('button');
                button.className = 'node-add-button'; // CSSは共通クラスを使う
                button.innerText = `[${tagName}]`;
                button.addEventListener('click', () => {
                    // addNodeToEventData も activeVslData を対象にする
                    this.addNodeToEventData(tagName, this.activeVslData);
                });
                toolbarList.appendChild(button);
            }
        }
    }
    
    // --- 2. キャンバスの中身を描画 ---
    this.populateVslCanvas();
}

}