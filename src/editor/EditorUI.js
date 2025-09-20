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
        document.getElementById('add-asset-button')?.addEventListener('click', () => this.onAddButtonClicked());
        document.getElementById('add-text-button')?.addEventListener('click', () => this.onAddTextClicked());
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
// src/editor/EditorUI.js

    onAddButtonClicked() {
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

 /**
     * ★★★ 新規メソッド ★★★
     * イベントグラフを切り替えるためのタブUIを構築する
     */
    buildVslTabs() {
        if (!this.vslTabs) return;
        this.vslTabs.innerHTML = '';
        
        const events = this.editingObject.getData('events') || [];
        events.forEach(eventData => {
            const tabButton = document.createElement('button');
            tabButton.className = 'vsl-tab-button';
            // ★ とりあえず、トリガー名を表示しておく
            tabButton.innerText = eventData.trigger || 'Event';
            
            // ★ もし、このタブが現在アクティブなイベントなら、'active'クラスを付ける
            if (this.activeEventId === eventData.id) {
                tabButton.classList.add('active');
            }

            tabButton.addEventListener('click', () => this.setActiveVslEvent(eventData.id));
            this.vslTabs.appendChild(tabButton);
        });

        // 「イベントを追加」ボタン
        const addButton = document.createElement('button');
        addButton.className = 'vsl-add-event-button';
        addButton.innerText = '+';
        addButton.title = '新しいイベントを追加';
        addButton.addEventListener('click', () => {
            const currentEvents = this.editingObject.getData('events') || [];
            const newEvent = {
                id: `event_${Date.now()}`,
                trigger: 'onClick',
                nodes: [],
                connections: []
            };
            currentEvents.push(newEvent);
            this.editingObject.setData('events', currentEvents);
            
            this.buildVslTabs(); // タブUIを再描画
            this.setActiveVslEvent(newEvent.id); // 作成した新しいイベントをアクティブにする
        });
        this.vslTabs.appendChild(addButton);
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
    addNodeToEventData(tagName, targetEvent) {
        if (!this.editingObject || !targetEvent) return;
        
        // --- 既存のロジックは、このtargetEventを直接使う ---
        const existingNodeCount = targetEvent.nodes.length;
        const newX = 50;
        const newY = 150 + (existingNodeCount * 80);

        const newNode = {
            id: `node_${Date.now()}`,
            type: tagName,
            params: {},
            x: newX,
            y: newY
        };
        
        targetEvent.nodes.push(newNode);
        
        // ★★★ 全体のevents配列を、ここで改めて取得して保存するのが最も安全 ★★★
        const allEvents = this.editingObject.getData('events');
        this.editingObject.setData('events', allEvents);
        
        // ★ 再描画は、setActiveVslEventに任せる
        // これにより、ツールバー、キャンバス、タブのすべてが確実に同期される
        this.setActiveVslEvent(targetEvent.id);
        // this.populateVslCanvas(targetEvent); // ← これをやめる
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

    /**
     * ★★★ 最終FIX版 (線描画機能付き) ★★★
     * 現在のイベントデータに基づいて、VSLキャンバスにノードと接続線を描画する
     */
    /**
     * ★★★ 引数を受け取るように修正 ★★★
     * 指定されたオブジェクトのイベントデータに基づいて、VSLキャンバスを描画する
     * @param {Phaser.GameObjects.GameObject} targetObject - 描画対象のオブジェクト
     */
   populateVslCanvas() {
    if (!this.vslCanvas || !this.editingObject) return;
    this.vslCanvas.innerHTML = ''; // クリア

    // ★ アクティブなイベントデータを見つける
    const events = this.editingObject.getData('events') || [];
    const targetEvent = events.find(e => e.id === this.activeEventId);

    if (!targetEvent) return; // アクティブなイベントがなければ終了
    
        
        // --- 1. キャンバスとSVGレイヤーをクリア ---
        this.vslCanvas.innerHTML = '';
        const svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgLayer.id = 'vsl-svg-layer';
        svgLayer.setAttribute('width', '2000');
        svgLayer.setAttribute('height', '2000');
        this.vslCanvas.appendChild(svgLayer);

        // --- 2. 「引数で渡された」オブジェクトから、最新のイベントデータを取得 ---
      
        if (!events || !events[0]) return;
      
        // --- 3. ノードを描画 ---
        if (targetEvent.nodes) {
            
            targetEvent.nodes.forEach(nodeData => {
                const nodeElement = document.createElement('div');
                nodeElement.className = 'vsl-node';
                nodeElement.style.left = `${nodeData.x}px`;
                nodeElement.style.top = `${nodeData.y}px`;
                nodeElement.dataset.isNode = 'true'; // isNode属性を追加
                nodeElement.dataset.nodeId = nodeData.id;

                this.buildNodeContent(nodeElement, nodeData);
                
                this.vslCanvas.appendChild(nodeElement);
            });
        }
        
            // --- 4. 接続線を描画 ---
        if (targetEvent.connections) {
            this.drawConnections(svgLayer, targetEvent.nodes, targetEvent.connections);
        }
    }

    /**
     * ★★★ 新規追加 (線描画ヘルパー) ★★★
     * connectionsデータに基づいて、SVGで線を描画する
     */
    drawConnections(svgLayer, nodes, connections) {
        connections.forEach(conn => {
            const fromNode = nodes.find(n => n.id === conn.fromNode);
            const toNode = nodes.find(n => n.id === conn.toNode);

            if (fromNode && toNode) {
                // ノードの幅と高さを、CSSで定義した固定値とする (例: 幅150px, 高さ50px)
                const nodeWidth = 150;
                const nodeHeight = 50;

                // 接続元のピンの座標 (右側の中央)
                const fromX = fromNode.x + nodeWidth;
                const fromY = fromNode.y + (nodeHeight / 2);

                // 接続先のピンの座標 (左側の中央)
                const toX = toNode.x;
                const toY = toNode.y + (nodeHeight / 2);

                // SVGの線(line)要素を生成
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', fromX);
                line.setAttribute('y1', fromY);
                line.setAttribute('x2', toX);
                line.setAttribute('y2', toY);
                line.setAttribute('stroke', '#aaa'); // 線の色
                line.setAttribute('stroke-width', '2'); // 線の太さ
                
                svgLayer.appendChild(line);
            }
        });
    }
    buildNodeContent(nodeElement, nodeData) {
        nodeElement.innerHTML = '';

        const title = document.createElement('strong');
        title.innerText = `[${nodeData.type}]`;
         // ▼▼▼ ピンの生成 ▼▼▼
        const inputPin = document.createElement('div');
        inputPin.className = 'vsl-node-pin input';
        inputPin.dataset.pinType = 'input';

        const outputPin = document.createElement('div');
        outputPin.className = 'vsl-node-pin output';
        outputPin.dataset.pinType = 'output';
        const paramsContainer = document.createElement('div');
        paramsContainer.className = 'node-params';
        
        // ▼▼▼【ここが、最後の仕上げです】▼▼▼
        // --------------------------------------------------------------------

        // 1. ハンドラのリストを取得
        const eventTagHandlers = this.game.registry.get('eventTagHandlers');
        // 2. このノードに対応するハンドラ関数を見つける
        const handler = eventTagHandlers ? eventTagHandlers[nodeData.type] : null;

        // 3. もし、ハンドラに'define'プロパティがあれば、それに基づいてUIを生成
        if (handler && handler.define && Array.isArray(handler.define.params)) {
            handler.define.params.forEach(paramDef => {
                 // ▼▼▼【アセット選択UIのロジックを追加】▼▼▼
                if (paramDef.type === 'asset_key') {
                    this.createNodeAssetSelectInput(paramsContainer, nodeData, paramDef.key, paramDef.label, paramDef.defaultValue);
                } 
                if (paramDef.type === 'select') { // ★ selectタイプを追加
                    this.createNodeSelectInput(paramsContainer, nodeData, paramDef.key, paramDef.label, paramDef.defaultValue, paramDef.options);
                } else if (paramDef.type === 'number') {
                    this.createNodeNumberInput(paramsContainer, nodeData, paramDef.key, paramDef.label, paramDef.defaultValue);
                } else { // 'string', 'asset_key' など
                    this.createNodeTextInput(paramsContainer, nodeData, paramDef.key, paramDef.label, paramDef.defaultValue);
                }

            });
        }
        // --------------------------------------------------------------------
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        // ★ X/Y座標の入力欄は、すべてのノードで共通なので、ここに追加
        this.createNodePositionInput(paramsContainer, nodeData, 'x');
        this.createNodePositionInput(paramsContainer, nodeData, 'y');
           // ★★★ 削除ボタンを生成 ★★★
        const deleteButton = document.createElement('button');
        deleteButton.innerText = '削除';
        deleteButton.className = 'node-delete-button';
        deleteButton.addEventListener('click', () => {
            if (confirm(`ノード [${nodeData.type}] を削除しますか？`)) {
                // ▼▼▼【ここを、新しいメソッドを呼び出すように変更】▼▼▼
                this.deleteNode(nodeData.id);
                // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
            }
        });

        nodeElement.append(inputPin, outputPin, title, paramsContainer, deleteButton);
    }
// in src/editor/EditorUI.js

    /**
     * ★★★ 新規ヘルパー (ステップ1：全アセット表示版) ★★★
     * アセット選択用のドロップダウンを生成する
     */
    createNodeAssetSelectInput(container, nodeData, paramKey, label, defaultValue) {
        const row = document.createElement('div');
        row.className = 'node-param-row';
        
        const labelEl = document.createElement('label');
        labelEl.innerText = `${label}: `;
        
        const select = document.createElement('select');
        
        // --- 1. グローバルレジストリから、アセットリストを取得 ---
        const assetList = this.game.registry.get('asset_list') || [];
        
        // --- 2. プレースホルダー（未選択状態）のオプションを追加 ---
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.innerText = 'アセットを選択...';
        select.appendChild(placeholderOption);

        // --- 3. アセットリストから、<option>を動的に生成 ---
        // (現時点では、種類によるフィルタリングは行わない)
        assetList.forEach(asset => {
            const option = document.createElement('option');
            option.value = asset.key;
            option.innerText = `[${asset.type}] ${asset.key}`; // [image] bg_school のように表示
            
            // 現在設定されている値、またはデフォルト値と一致すれば、その項目を選択状態にする
            if ((nodeData.params[paramKey] || defaultValue) === asset.key) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        // --- 4. 値が変更されたら、EditorPluginに通知するリスナーを設定 ---
        select.addEventListener('change', () => {
            // ★ 既存の更新ロジックをそのまま呼び出すだけ
            if (this.plugin) {
                this.plugin.updateNodeParam(nodeData, paramKey, select.value);
            }
        });
        
        row.append(labelEl, select);
        container.appendChild(row);
    }
    /**
     * ★★★ 新規ヘルパーメソッド ★★★
     * ノードのX/Y座標を編集する数値入力欄を生成する
     */
    createNodePositionInput(container, nodeData, key) {
        const row = document.createElement('div');
        row.className = 'node-param-row';
        const label = document.createElement('label');
        label.innerText = `${key}: `;
        const input = document.createElement('input');
        input.type = 'number';
        input.value = Math.round(nodeData[key]);
        
        input.addEventListener('change', () => {
            const value = parseInt(input.value, 10);
            if (!isNaN(value)) {
               if (this.plugin && typeof this.plugin.updateNodePosition === 'function') {
                    this.plugin.updateNodePosition(this.editingObject, nodeData.id, key, value);
                }
            }
        });

        row.append(label, input);
        container.appendChild(row);
    }
// src/editor/EditorUI.js
 /**
     * ★★★ 新規ヘルパー ★★★
     * ノード内に、ドロップダウン選択式の入力欄を生成する
     */
    createNodeSelectInput(container, nodeData, paramKey, label, defaultValue, options) {
        const row = document.createElement('div');
        row.className = 'node-param-row';
        const labelEl = document.createElement('label');
        labelEl.innerText = `${label}: `;
        
        const select = document.createElement('select');
        options.forEach(optValue => {
            const option = document.createElement('option');
            option.value = optValue;
            option.innerText = optValue;
            if ((nodeData.params[paramKey] || defaultValue) == optValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            this.plugin.updateNodeParam(nodeData, paramKey, select.value);
        });
        
        row.append(labelEl, select);
        container.appendChild(row);
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
  
    
   /**
     * ★★★ 新規ヘルパー (VSLノード用) ★★★
     * ノード内に、パラメータを編集するためのテキスト入力欄を1行生成する
     * @param {HTMLElement} container - 追加先の親要素
     * @param {object} nodeData - 対応するノードのデータ
     * @param {string} paramKey - パラメータのキー (e.g., 'target')
     * @param {string} label - 表示ラベル (e.g., 'ターゲット')
     * @param {string} defaultValue - デフォルト値
     */
    createNodeTextInput(container, nodeData, paramKey, label, defaultValue) {
        const row = document.createElement('div');
        row.className = 'node-param-row';
        
        const labelEl = document.createElement('label');
        labelEl.innerText = `${label}: `;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = nodeData.params[paramKey] || defaultValue;
        
        // フォーカスが外れたら、データ更新を呼び出す
        input.addEventListener('change', () => {
         
            // --------------------------------------------------------------------
            // ★★★ thisではなく、this.pluginのメソッドを呼び出す ★★★
              if (this.plugin) {
            // ★★★ 渡す引数を、nodeData, paramKey, value に変更 ★★★
            this.plugin.updateNodeParam(nodeData, paramKey, input.value);
        }
        });
        
        row.append(labelEl, input);
        container.appendChild(row);
    }
 
    /**
     * ★★★ 新規ヘルパー (VSLノード用) ★★★
     * ノード内に、パラメータを編集するための「数値」入力欄を1行生成する
     * @param {HTMLElement} container - 追加先の親要素
     * @param {object} nodeData - 対応するノードのデータ
     * @param {string} paramKey - パラメータのキー (e.g., 'time')
     * @param {string} label - 表示ラベル (e.g., '時間(ms)')
     * @param {number} defaultValue - デフォルト値
     */
    createNodeNumberInput(container, nodeData, paramKey, label, defaultValue) {
        const row = document.createElement('div');
        row.className = 'node-param-row';
        
        const labelEl = document.createElement('label');
        labelEl.innerText = `${label}: `;
        
        const input = document.createElement('input');
        input.type = 'number'; // ★ typeを'number'に変更
        input.value = nodeData.params[paramKey] || defaultValue;
        
        input.addEventListener('change', () => {
            // ★ 値を数値に変換してから渡す
            const value = parseFloat(input.value); 
           if (this.plugin) {
                this.plugin.updateNodeParam(this.editingObject, nodeData.id, paramKey, value);
            }
        });
        
        row.append(labelEl, input);
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
        // ▼▼▼【ここを、このように修正します】▼▼▼
        // --------------------------------------------------------------------
        
        // --- 1. クリックされたピンの情報を取得 ---
        const pinType = clickedPin.dataset.pinType;
        
        // --- 2. 親であるノード要素を、より安全な方法で探す ---
        const parentNode = clickedPin.parentElement;
        if (!parentNode || !parentNode.dataset.nodeId) {
            console.error("Could not find parent node for the clicked pin!", clickedPin);
            return; // 親が見つからなければ、何もせず終了
        }
        const nodeId = parentNode.dataset.nodeId;

        // --- ケース1: 接続モード中でない時に、出力ピンがクリックされた (接続開始) ---
        if (!this.connectionState.isActive && pinType === 'output') {
            this.connectionState.isActive = true;
            this.connectionState.fromNodeId = nodeId;
            this.connectionState.fromPinElement = clickedPin;
            
            // 接続元であることを示す視覚的なフィードバック (CSSで .is-connecting を定義)
            clickedPin.classList.add('is-connecting');
            console.log(`Connection started from node: ${nodeId}`);
        } 
        // --- ケース2: 接続モード中に、入力ピンがクリックされた (接続完了) ---
        else if (this.connectionState.isActive && pinType === 'input') {
            const fromNodeId = this.connectionState.fromNodeId;
            const toNodeId = nodeId;
            
            // 接続をデータとして作成・保存
            this.createConnection(fromNodeId, toNodeId);
            
            // 接続モードを終了
            if (this.connectionState.fromPinElement) {
                this.connectionState.fromPinElement.classList.remove('is-connecting');
            }
            this.connectionState.isActive = false;
            this.connectionState.fromNodeId = null;
            this.connectionState.fromPinElement = null;
        }
        // --- その他の場合 (接続モード中に別の場所をクリックなど) は、接続をキャンセル ---
        else if (this.connectionState.isActive) {
            if (this.connectionState.fromPinElement) {
                this.connectionState.fromPinElement.classList.remove('is-connecting');
            }
            this.connectionState.isActive = false;
            this.connectionState.fromNodeId = null;
            this.connectionState.fromPinElement = null;
            console.log("Connection cancelled.");
        }
    }

    /**
     * ★★★ 新規追加 ★★★
     * 新しい接続をイベントデータに追加し、キャンバスを再描画する
     */
    /**
     * ★★★ マルチトリガー対応版 ★★★
     * 「現在アクティブな」イベントグラフに、新しい接続を追加する
     */
    createConnection(fromNodeId, toNodeId) {
        if (!this.editingObject || !this.activeEventId || fromNodeId === toNodeId) return;

        const events = this.editingObject.getData('events');
        // ★ アクティブなIDを使って、編集対象のイベントグラフを見つける
        const targetEvent = events.find(e => e.id === this.activeEventId);
        if (!targetEvent) return;
        
        if (!targetEvent.connections) {
            targetEvent.connections = [];
        }

        const exists = targetEvent.connections.some(c => c.fromNode === fromNodeId && c.toNode === toNodeId);
        if (!exists) {
            targetEvent.connections.push({ fromNode: fromNodeId, toNode: toNodeId });
            this.editingObject.setData('events', events);
            
            console.log(`Connection created in event '${targetEvent.id}': ${fromNodeId} -> ${toNodeId}`);
            
            this.populateVslCanvas();
        }
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
}