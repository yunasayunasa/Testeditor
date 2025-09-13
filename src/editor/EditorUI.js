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
        this.currentEditorMode = 'select'; // 初期モード
        this.currentAssetTab = 'image';
        
        // --- タイルマップエディタ用プロパティ ---
        this.currentTileset = null;
        this.selectedTileIndex = 0;
        this.tilesetHighlight = null;
        this.tileMarker = null;

        // --- DOM要素の参照 ---
        this.getDomElements();

     
// --- UIの初期セットアップ ---
        if (this.editorPanel) this.editorPanel.style.display = 'flex';
        if (this.assetBrowserPanel) this.assetBrowserPanel.style.display = 'flex';
        
        this.initializeEventListeners();
        this.populateAssetBrowser();
    }
 // in EditorUI.js
    
    // --- ヘルパーメソッド群 ---

    getDomElements() {
          // --- DOM要素の参照をまとめて取得 ---
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
        this.tilesetPanel = document.getElementById('tileset-panel');
        this.tilesetPreview = document.getElementById('tileset-preview');
    }


    getClientCoordinates(event) {
        if (event.touches && event.touches.length > 0) {
            return { x: event.touches[0].clientX, y: event.touches[0].clientY };
        }
        return { x: event.clientX, y: event.clientY };
    }

    getActiveGameScene() {
        if (this.plugin && typeof this.plugin.getActiveGameScene === 'function') {
            const scene = this.plugin.getActiveGameScene();
            if (scene) return scene;
        }
        // フォールバック
        const scenes = this.game.scene.getScenes(true);
        for (let i = scenes.length - 1; i >= 0; i--) {
            const scene = scenes[i];
            if (scene.scene.key.toLowerCase().includes('scene')) {
                return scene;
            }
        }
        return null;
    }
    // --- イベントリスナー初期化 ---

    initializeEventListeners() {
        // --- UIボタンのリスナー ---
        document.getElementById('add-asset-button')?.addEventListener('click', () => this.onAddButtonClicked());
        document.getElementById('add-text-button')?.addEventListener('click', () => this.onAddTextClicked());
        document.getElementById('select-mode-btn')?.addEventListener('click', () => this.setEditorMode('select'));
        document.getElementById('tilemap-mode-btn')?.addEventListener('click', () => this.setEditorMode('tilemap'));
        
        // カメラコントロール
        this.setupPanButton(document.getElementById('camera-pan-up'), 0, -10);
        this.setupPanButton(document.getElementById('camera-pan-down'), 0, 10);
        this.setupPanButton(document.getElementById('camera-pan-left'), -10, 0);
        this.setupPanButton(document.getElementById('camera-pan-right'), 10, 0);
        document.getElementById('camera-zoom-in')?.addEventListener('click', () => this.plugin.zoomCamera(0.2));
        document.getElementById('camera-zoom-out')?.addEventListener('click', () => this.plugin.zoomCamera(-0.2));
        document.getElementById('camera-reset')?.addEventListener('click', () => this.plugin.resetCamera());

        // その他UI
        this.createPauseToggle();
        this.createHelpButton();
    }
    // --- モード切替と、それに応じたリスナーのON/OFF ---

     /**
     * ★★★ 修正版 ★★★
     * エディタの主モードを切り替える。Pluginへの通知は不要。
     */
    setEditorMode(mode) {
        if (this.currentEditorMode === mode) return;
        this.currentEditorMode = mode;
        console.log(`[EditorUI] Editor mode changed to: ${mode}`);

        // ▼ Pluginへの通知を削除
        // if (this.plugin) {
        //     this.plugin.onEditorModeChanged(mode);
        // }

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
    }

   // --- タイルマップ専用リスナーの管理 ---
    
   /**
     * ★★★ 修正版 ★★★
     * タイルマップモード専用のDOMイベントリスナーを有効化する。
     * bind(this) を使わず、後で解除できるように参照を保持する。
     */
    activateTilemapListeners() {
        this.deactivateTilemapListeners(); // 念のためクリア

        const canvas = this.game.canvas;
        
        // リスナー関数への参照をプロパティとして保持
        this._boundPointerMove = this.handleTilemapPointerMove.bind(this);
        this._boundPointerDown = this.handleTilemapPointerDown.bind(this);

        canvas.addEventListener('pointermove', this._boundPointerMove);
        canvas.addEventListener('pointerdown', this._boundPointerDown, true); // ★ キャプチャフェーズで実行
    }
    
    /**
     * ★★★ 修正版 ★★★
     * タイルマップモード専用のDOMイベントリスナーを無効化する。
     * 保持していた参照を使って、確実に解除する。
     */
    deactivateTilemapListeners() {
        const canvas = this.game.canvas;
        if (this._boundPointerMove) {
            canvas.removeEventListener('pointermove', this._boundPointerMove);
        }
        if (this._boundPointerDown) {
            canvas.removeEventListener('pointerdown', this._boundPointerDown, true); // ★ キャプチャフェーズで実行
        }
    }
    
    /**
     * ★★★ 最終FIXの修正版 ★★★
     * 座標計算にPhaserのポインターが持つ補正済み座標を利用する
     */
    handleTilemapPointerMove(event) {
        // ★★★ このメソッドを呼び出すために、Phaserのグローバル入力リスナーを復活させる必要があります ★★★
        // このメソッド自体の中身は、これからシンプルになります。
    }
    
    /**
     * ★★★ 最終FIXの修正版 ★★★
     * 座標計算にPhaserのポインターが持つ補正済み座標を利用する
     */
    handleTilemapPointerDown(event) {
        // ★★★ このメソッドも同様です ★★★
    }
    createTileMarker() {
        const scene = this.getActiveGameScene();
        if (!scene || !this.currentTileset) return;
        this.tileMarker = scene.add.image(0, 0, this.currentTileset.key).setAlpha(0.5).setDepth(9999);
        this.updateTileMarkerFrame();
    }
    
    destroyTileMarker() {
        if (this.tileMarker) {
            this.tileMarker.destroy();
            this.tileMarker = null;
        }
    }

    updateTileMarkerFrame() {
        if (!this.tileMarker || !this.currentTileset) return;
        const tileWidth = this.currentTileset.tileWidth;
        const tileHeight = this.currentTileset.tileHeight;
        const texture = this.game.textures.get(this.currentTileset.key);
        const tilesPerRow = texture.getSourceImage().width / tileWidth;
        const tileX = this.selectedTileIndex % tilesPerRow;
        const tileY = Math.floor(this.selectedTileIndex / tilesPerRow);
        this.tileMarker.setCrop(tileX * tileWidth, tileY * tileHeight, tileWidth, tileHeight);
    }

    onAddTextClicked() {
        const targetScene = this.getActiveGameScene();
        if (!targetScene || typeof targetScene.addTextObjectFromEditor !== 'function') return;
        const newName = `text_${Date.now()}`;
        const newObject = targetScene.addTextObjectFromEditor(newName);
        if (newObject && this.plugin) {
            this.plugin.selectedObject = newObject;
            this.plugin.updatePropertyPanel();
        }
    }

    

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
            if (typeof targetScene.addObjectFromEditor === 'function') newObject = targetScene.addObjectFromEditor(this.selectedAssetKey, newName);
        } else if (this.selectedAssetType === 'prefab') {
            if (typeof targetScene.addPrefabFromEditor === 'function') newObject = targetScene.addPrefabFromEditor(this.selectedAssetKey, newName);
        }
        
        if (newObject && this.plugin) {
            this.plugin.selectedObject = newObject;
            this.plugin.updatePropertyPanel();
        }
    }

    

    
    /**
     * ★★★ 最終修正版 ★★★
     * タイルセットパネルを初期化する。asset_define.json から情報を取得し、
     * this.currentTileset に完全な定義オブジェクトを格納する。
     */
    initTilesetPanel() {
        if (!this.tilesetPreview) return;
        const assetDefine = this.game.cache.json.get('asset_define');
        if (!assetDefine || !assetDefine.tilesets) {
            console.error("asset_define.json or its tilesets definition is missing.");
            return;
        }

        const tilesets = assetDefine.tilesets;
        const firstTilesetId = Object.keys(tilesets)[0];
        if (!firstTilesetId) {
            console.error("No tilesets are defined in asset_define.json.");
            return;
        }

        // --- 修正点：タイルセットの完全な定義オブジェクトを保存 ---
        this.currentTileset = tilesets[firstTilesetId];
        // idをkeyとして追加しておく（元データにkeyがないため）
        this.currentTileset.id = firstTilesetId;

        console.log("[EditorUI] Initializing tileset panel with:", this.currentTileset);

        const assetList = this.game.registry.get('asset_list');
        // keyを使ってアセットリストから画像パスを探す
        const tilesetAsset = assetList.find(asset => asset.key === this.currentTileset.key);
        if (!tilesetAsset || !tilesetAsset.path) {
            console.error(`Tileset image path for key '${this.currentTileset.key}' not found in asset_list.`);
            return;
        }

        this.tilesetPreview.innerHTML = '';
        const img = document.createElement('img');
        img.src = tilesetAsset.path;
        // CSSでのスケーリングを無効化し、計算のズレを防ぐ
        img.style.width = 'auto';
        img.style.height = 'auto';
        img.style.maxWidth = '100%';

        this.tilesetHighlight = document.createElement('div');
        this.tilesetHighlight.style.position = 'absolute';
        this.tilesetHighlight.style.border = '2px solid #00ff00';
        this.tilesetHighlight.style.pointerEvents = 'none';
        this.tilesetHighlight.style.boxSizing = 'border-box'; // borderがサイズの内側に描画されるように
        
        this.tilesetPreview.addEventListener('click', (event) => this.onTilesetClick(event));
        this.tilesetPreview.appendChild(img);
        this.tilesetPreview.appendChild(this.tilesetHighlight);
        
        // 画像がロードされてからハイライトを更新
        img.onload = () => { this.updateTilesetHighlight(); };
    }

     /**
     * ★★★ 最終修正版 ★★★
     * onTilesetClick: 計算の最終微調整
     */
    onTilesetClick(event) {
        event.stopPropagation();
        if (!this.currentTileset) return;
        
        const imgElement = this.tilesetPreview.querySelector('img');
        if (!imgElement) return;

        const rect = imgElement.getBoundingClientRect();
        const coords = this.getClientCoordinates(event);
        const clickX = coords.x - rect.left;
        const clickY = coords.y - rect.top;

        const texture = this.game.textures.get(this.currentTileset.key);
        const naturalWidth = texture.getSourceImage().width;
        
        const scale = rect.width / naturalWidth;

        const tileWidth = this.currentTileset.tileWidth;
        const tileHeight = this.currentTileset.tileHeight;

        // スケールを考慮して元画像上の座標に変換
        const naturalX = clickX / scale;
        const naturalY = clickY / scale;

        const tileX = Math.floor(naturalX / tileWidth);
        const tileY = Math.floor(naturalY / tileHeight);
        const tilesPerRow = Math.floor(naturalWidth / tileWidth);
        
        this.selectedTileIndex = tileY * tilesPerRow + tileX;
        
        console.log(`[EditorUI] Tile selected. Index: ${this.selectedTileIndex}`);
        this.updateTilesetHighlight();
    }
    
    /**
     * ★★★ 最終修正版 ★★★
     * updateTilesetHighlight: border-boxを考慮した最終調整
     */
    updateTilesetHighlight() {
        if (!this.tilesetHighlight || !this.currentTileset) return;
        
        const imgElement = this.tilesetPreview.querySelector('img');
        if (!imgElement) return;

        const rect = imgElement.getBoundingClientRect();
        const texture = this.game.textures.get(this.currentTileset.key);
        const naturalWidth = texture.getSourceImage().width;
        
        const scale = rect.width / naturalWidth;
        const tileWidth = this.currentTileset.tileWidth;
        const tileHeight = this.currentTileset.tileHeight;
        
        const tilesPerRow = Math.floor(naturalWidth / tileWidth);
        const tileX = this.selectedTileIndex % tilesPerRow;
        const tileY = Math.floor(this.selectedTileIndex / tilesPerRow);
        
        this.tilesetHighlight.style.left = `${tileX * tileWidth * scale}px`;
        this.tilesetHighlight.style.top = `${tileY * tileHeight * scale}px`;
        // ★★★ box-sizing: border-box を使っているので、ボーダー幅を引く必要はない
        this.tilesetHighlight.style.width = `${tileWidth * scale}px`;
        this.tilesetHighlight.style.height = `${tileHeight * scale}px`;
        
        this.updateTileMarkerFrame();
    }

    // in EditorUI.js

// onTilesetClick と updateTilesetHighlight は、整数インデックスが計算できているので、
// Ver.4 のままで問題ありません。ハイライトのズレは、これから修正する handlePointerMove で解決します。

   
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
        // ★ 移設先：新しいボタン用コンテナ
        const buttonContainer = document.querySelector('#asset-browser .panel-header-buttons');
        
        if (buttonContainer) {
            const helpButton = document.createElement('button');
            helpButton.innerText = '?';
            helpButton.title = 'Open Help Manual';
            
            // ★ スタイルはCSSで管理するので、JavaScriptでの設定は不要

            helpButton.addEventListener('click', () => this.openHelpModal());
            
            // ★ コンテナの末尾に追加
            buttonContainer.appendChild(helpButton);

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

     



}


