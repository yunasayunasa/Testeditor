// src/editor/EditorUI.js (バグ修正・ロジック整理 最終確定版)

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
        
        // --- タイルマップエディタ用プロパティ ---
        this.currentTileset = null;
        this.selectedTileIndex = 0;
        this.tilesetHighlight = null;
        this.tileMarker = null;

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

        // --- UIの初期セットアップを一度だけ実行 ---
        if (this.editorPanel) this.editorPanel.style.display = 'flex';
        if (this.assetBrowserPanel) this.assetBrowserPanel.style.display = 'flex';
        
        this.createPauseToggle();
        this.createHelpButton();
        this.initializeEventListeners();
       
    }
  /**
     * ★★★ 新規メソッド ★★★
     * SystemSceneから呼び出され、registryデータを使ったUI構築を開始する
     */
    build() {
        console.log("[EditorUI] build() called. Populating asset browser...");
        this.populateAssetBrowser();
    }
    /**
     * 全てのUI要素にイベントリスナーを設定する
     */
    initializeEventListeners() {
        const replaceListener = (element, event, handler) => {
            if (!element) return;
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
            newElement.addEventListener(event, handler);
            return newElement;
        };
        
        // カメラコントロール
        if (this.cameraControls) this.cameraControls.style.display = 'flex';
        this.zoomInBtn = replaceListener(this.zoomInBtn, 'click', () => this.plugin.zoomCamera(0.2));
        this.zoomOutBtn = replaceListener(this.zoomOutBtn, 'click', () => this.plugin.zoomCamera(-0.2));
        this.resetBtn = replaceListener(this.resetBtn, 'click', () => this.plugin.resetCamera());

        const panSpeed = 10;
        this.setupPanButton(this.panUpBtn, 0, -panSpeed);
        this.setupPanButton(this.panDownBtn, 0, panSpeed);
        this.setupPanButton(this.panLeftBtn, -panSpeed, 0);
        this.setupPanButton(this.panRightBtn, panSpeed, 0);

        // プレイモード切替
        if (this.modeToggle) {
            this.modeToggle.addEventListener('change', (event) => {
                this.currentMode = event.target.checked ? 'play' : 'select';
                if (this.modeLabel) this.modeLabel.textContent = event.target.checked ? 'Play Mode' : 'Select Mode';
            });
        }

        // エディタモード切替
        replaceListener(this.selectModeBtn, 'click', () => this.setEditorMode('select'));
        replaceListener(this.tilemapModeBtn, 'click', () => this.setEditorMode('tilemap'));

        // アセットブラウザボタン
        replaceListener(document.getElementById('add-asset-button'), 'click', () => this.onAddButtonClicked());
        replaceListener(document.getElementById('add-text-button'), 'click', () => this.onAddTextClicked());
        
        // ヘルプモーダル
        replaceListener(document.getElementById('help-modal-close-btn'), 'click', () => this.closeHelpModal());

       
    }
    
    /**
     * エディタの主モード（Select or Tilemap）を切り替える
     */
    setEditorMode(mode) {
        if (this.currentEditorMode === mode) return;
        this.currentEditorMode = mode;
        console.log(`[EditorUI] Editor mode changed to: ${mode}`);

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

    // --- ここから下のメソッド群は、前回の提案から変更ありません ---
    // (あなたのコードにあった重複やロジックの衝突を解消し、整理したものです)

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

    getActiveGameScene() {
        if (this.plugin && typeof this.plugin.getActiveGameScene === 'function') {
            const scene = this.plugin.getActiveGameScene();
            if (scene) return scene;
        }
        const scenes = this.game.scene.getScenes(true);
        for (let i = scenes.length - 1; i >= 0; i--) {
            const scene = scenes[i];
            if (scene.scene.key !== 'UIScene' && scene.scene.key !== 'SystemScene' && scene.scene.key !== 'GameScene') {
                return scene;
            }
        }
        return null;
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

    

    initTilesetPanel() {
        if (!this.tilesetPreview) return;
        const assetDefine = this.game.cache.json.get('asset_define');
        const tilesets = assetDefine.tilesets;
        const firstTilesetKey = Object.keys(tilesets)[0];
        this.currentTileset = tilesets[firstTilesetKey];
        if (!this.currentTileset) { console.error("No tilesets defined."); return; }

        const assetList = this.game.registry.get('asset_list');
        const tilesetAsset = assetList.find(asset => asset.key === this.currentTileset.key);
        if (!tilesetAsset || !tilesetAsset.path) { console.error("Tileset image path not found."); return; }

        this.tilesetPreview.innerHTML = '';
        const img = document.createElement('img');
        img.src = tilesetAsset.path;
        img.style.imageRendering = 'pixelated';

        this.tilesetHighlight = document.createElement('div');
        this.tilesetHighlight.style.position = 'absolute';
        this.tilesetHighlight.style.border = '2px solid #00ff00';
        this.tilesetHighlight.style.pointerEvents = 'none';
        this.tilesetHighlight.style.width = `${this.currentTileset.tileWidth - 4}px`;
        this.tilesetHighlight.style.height = `${this.currentTileset.tileHeight - 4}px`;
        
        this.tilesetPreview.addEventListener('click', (event) => this.onTilesetClick(event));
        this.tilesetPreview.appendChild(img);
        this.tilesetPreview.appendChild(this.tilesetHighlight);
        
        img.onload = () => { this.updateTilesetHighlight(); };
    }
    
    onTilesetClick(event) {
        if (!this.currentTileset) return;
        const rect = this.tilesetPreview.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const tileX = Math.floor(x / this.currentTileset.tileWidth);
        const tileY = Math.floor(y / this.currentTileset.tileHeight);
        const texture = this.game.textures.get(this.currentTileset.key);
        const tilesPerRow = texture.getSourceImage().width / this.currentTileset.tileWidth;
        this.selectedTileIndex = tileY * tilesPerRow + tileX;
        this.updateTilesetHighlight();
    }
    
    updateTilesetHighlight() {
        if (!this.tilesetHighlight || !this.currentTileset) return;
        const texture = this.game.textures.get(this.currentTileset.key);
        const tilesPerRow = texture.getSourceImage().width / this.currentTileset.tileWidth;
        const tileX = this.selectedTileIndex % tilesPerRow;
        const tileY = Math.floor(this.selectedTileIndex / tilesPerRow);
        this.tilesetHighlight.style.left = `${tileX * this.currentTileset.tileWidth}px`;
        this.tilesetHighlight.style.top = `${tileY * this.currentTileset.tileHeight}px`;
        this.updateTileMarkerFrame();
    }

   /**
     * EditorPluginからの依頼を受けて、タイルマーカーの位置を更新する
     */
    updateTileMarkerPosition(pointer) {
        if (!this.tileMarker || !this.currentTileset) return;
        
        const scene = this.getActiveGameScene();
        if (!scene) return;
        
        const worldPoint = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const tileWidth = this.currentTileset.tileWidth;
        const tileHeight = this.currentTileset.tileHeight;
        const snappedX = Math.floor(worldPoint.x / tileWidth) * tileWidth + tileWidth / 2;
        const snappedY = Math.floor(worldPoint.y / tileHeight) * tileHeight + tileHeight / 2;
        
        this.tileMarker.setPosition(snappedX, snappedY);
    }

    /**
     * EditorPluginからの依頼を受けて、ポインターの位置にタイルを配置する
     */
    placeTileAtPointer(pointer) {
        const scene = this.getActiveGameScene();
        if (!scene || !this.currentTileset) return;

        const worldPoint = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const tileX = Math.floor(worldPoint.x / this.currentTileset.tileWidth);
        const tileY = Math.floor(worldPoint.y / this.currentTileset.tileHeight);
        
        if (typeof scene.placeTile === 'function') {
            scene.placeTile(tileX, tileY, this.selectedTileIndex, this.currentTileset.key);
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

