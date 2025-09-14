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
this.buildLayerPanel(); 
       
    }
    
    // =================================================================
    // ヘルパーメソッド群
    // =================================================================

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
       
    }

    replaceListener(element, event, handler) {
        if (!element) return null;
        const newElement = element.cloneNode(true);
        if (element.parentNode) {
            element.parentNode.replaceChild(newElement, element);
        }
        newElement.addEventListener(event, handler);
        return newElement;
    }

    getActiveGameScene() {
        return this.plugin?.getActiveGameScene();
    }

    // =================================================================
    // イベントリスナー初期化
    // =================================================================

    initializeEventListeners() {
        // --- UIボタンのリスナー ---
        this.replaceListener(document.getElementById('add-asset-button'), 'click', () => this.onAddButtonClicked());
        this.replaceListener(document.getElementById('add-text-button'), 'click', () => this.onAddTextClicked());
        this.selectModeBtn = this.replaceListener(this.selectModeBtn, 'click', () => this.setEditorMode('select'));
        this.tilemapModeBtn = this.replaceListener(this.tilemapModeBtn, 'click', () => this.setEditorMode('tilemap'));
        
        // カメラコントロール
        if (this.cameraControls) this.cameraControls.style.display = 'flex';
        this.zoomInBtn = this.replaceListener(this.zoomInBtn, 'click', () => this.plugin.zoomCamera(0.2));
        this.zoomOutBtn = this.replaceListener(this.zoomOutBtn, 'click', () => this.plugin.zoomCamera(-0.2));
        this.resetBtn = this.replaceListener(this.resetBtn, 'click', () => this.plugin.resetCamera());
        this.setupPanButton(this.panUpBtn, 0, -10);
        this.setupPanButton(this.panDownBtn, 0, 10);
        this.setupPanButton(this.panLeftBtn, -10, 0);
        this.setupPanButton(this.panRightBtn, 10, 0);

        // プレイモード切替
        if (this.modeToggle) {
            this.modeToggle.addEventListener('change', (event) => {
                this.plugin.currentMode = event.target.checked ? 'play' : 'select';
                if (this.modeLabel) this.modeLabel.textContent = event.target.checked ? 'Play Mode' : 'Select Mode';
            });
        }
        
        // ヘルプモーダル閉じるボタン
        this.replaceListener(document.getElementById('help-modal-close-btn'), 'click', () => this.closeHelpModal());
    }

    // =================================================================
    // UI構築・更新メソッド群
    // =================================================================
    
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
     * 「Add Selected Tile」ボタンがクリックされたときの処理
     */
    onAddTileButtonClicked() {
        const scene = this.getActiveGameScene();
        
        // ガード節: シーンが存在しない、またはタイルが選択されていない場合は何もしない
        if (!scene || this.selectedTileIndex < 0 || !this.currentTileset) {
            console.warn("[EditorUI] Cannot add tile: No active scene, tile index, or tileset selected.");
            return;
        }
        
        // BaseGameSceneに実装する新しいメソッドを呼び出す
        if (typeof scene.addTileAsObject === 'function') {
            const newTileObject = scene.addTileAsObject(this.selectedTileIndex, this.currentTileset.key);
            
            // 追加された新しいタイルオブジェクトをすぐに選択状態にする
            if (newTileObject && this.plugin) {
                this.plugin.selectedObject = newTileObject;
                this.plugin.updatePropertyPanel();
            }
        } else {
            console.error(`[EditorUI] The active scene '${scene.scene.key}' does not have the 'addTileAsObject' method.`);
        }
    }
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

   // --- タイルマップ専用リスナーの管理 ---
     /**
     * ★★★ 最終代替案 ★★★
     * 範囲描画のドラッグ操作を開始する
     * @param {Phaser.GameObjects.GameObject} sourceObject - 描画の元となるオブジェクト
     */
   // in EditorUI.js

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

        this.assetListContainer.innerHTML = '';
        const displayableAssets = assetList.filter(asset => {
            if (this.currentAssetTab === 'image') return asset.type === 'image' || asset.type === 'spritesheet';
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
            this.assetListContainer.appendChild(itemDiv);
        }
    }

    onAddButtonClicked() {
        if (!this.selectedAssetKey) { alert('Please select an asset from the browser first.'); return; }
        const targetScene = this.getActiveGameScene();
        if (!targetScene) { alert("Could not find a suitable target scene."); return; }

        if (!this.objectCounters[this.selectedAssetKey]) this.objectCounters[this.selectedAssetKey] = 1;
        else this.objectCounters[this.selectedAssetKey]++;
        const newName = `${this.selectedAssetKey}_${this.objectCounters[this.selectedAssetKey]}`;
        
        let newObject = null;
        if (this.selectedAssetType === 'image' || this.selectedAssetType === 'spritesheet') {
            if (typeof targetScene.addObjectFromEditor === 'function') newObject = targetScene.addObjectFromEditor(this.selectedAssetKey, newName, this.activeLayerName);
    
        } else if (this.selectedAssetType === 'prefab') {
            if (typeof targetScene.addPrefabFromEditor === 'function') newObject = targetScene.addObjectFromEditor(this.selectedAssetKey, newName, this.activeLayerName);
    
        }
        
        if (newObject && this.plugin) {
            this.plugin.selectedObject = newObject;
            this.plugin.updatePropertyPanel();
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
            
            // ▼▼▼【ここも this.replaceListener を使うように修正】▼▼▼
            // helpButton.addEventListener('click', () => this.openHelpModal());
            // 上記の代わりに、以下のようにする
            buttonContainer.appendChild(helpButton);
            this.replaceListener(helpButton, 'click', () => this.openHelpModal());
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        } else {
            console.warn('[EditorUI] Asset browser button container not found for help button placement.');
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
    buildLayerPanel() {
        if (!this.layerListContainer) return;
        this.layerListContainer.innerHTML = ''; // 一旦クリア

        this.layers.forEach(layer => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'layer-item';

               if (this.plugin.selectedLayer && layer.name === this.plugin.selectedLayer.name) {
                itemDiv.classList.add('active');
            }
            
            // --- レイヤー名部分をクリックしたら、プラグインに選択を通知 ---
            itemDiv.addEventListener('click', () => {
                // EditorUIは自身の状態を変えず、Pluginに命令するだけ
                this.plugin.selectLayer(layer);
            });
            // --- 表示/非表示ボタン (👁️) ---
            const visibilityBtn = document.createElement('button');
            visibilityBtn.className = 'layer-control';
            visibilityBtn.innerHTML = layer.visible ? '👁️' : '—';
            if (!layer.visible) visibilityBtn.classList.add('hidden');
            visibilityBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 親のクリックイベントを発火させない
                this.toggleLayerVisibility(layer.name);
            });

            // --- ロック/アンロックボタン (🔒) ---
            const lockBtn = document.createElement('button');
            lockBtn.className = 'layer-control';
            lockBtn.innerHTML = layer.locked ? '🔒' : '🔓';
            if (layer.locked) lockBtn.classList.add('locked');
            lockBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLayerLock(layer.name);
            });

            // --- レイヤー名 ---
            const nameSpan = document.createElement('span');
            nameSpan.className = 'layer-name';
            nameSpan.innerText = layer.name;

            itemDiv.append(visibilityBtn, lockBtn, nameSpan);
            this.layerListContainer.appendChild(itemDiv);
        });
        
        // ★ レイヤー状態の変更を、EditorPluginに通知する
        this.plugin.updateLayerStates(this.layers);
    }

  

    ttoggleLayerVisibility(layerName) {
        const layer = this.layers.find(l => l.name === layerName);
        if (layer) {
            layer.visible = !layer.visible;
            this.buildLayerPanel(); // UI更新
            this.plugin.updateLayerStates(this.layers); // 状態を通知
            this.plugin.applyLayerStatesToScene(); // シーンに反映
        }
    }

    toggleLayerLock(layerName) {
        const layer = this.layers.find(l => l.name === layerName);
        if (layer) {
            layer.locked = !layer.locked;
            this.buildLayerPanel(); // UI更新
            this.plugin.updateLayerStates(this.layers); // 状態を通知
        }
    }
    
    addNewLayer() {
        const newLayerName = prompt("Enter new layer name:", `New Layer ${this.layers.length + 1}`);
        if (newLayerName && !this.layers.some(l => l.name === newLayerName)) {
            this.layers.unshift({ name: newLayerName, visible: true, locked: false }); // 配列の先頭に追加
            this.buildLayerPanel();
        }
    }
//レイヤー系ここまで


}
