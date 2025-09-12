// src/editor/EditorUI.js (最終確定・完成版)

export default class EditorUI {
    constructor(game, editorPlugin) {
        this.game = game;
        this.plugin = editorPlugin;
        this.selectedAssetKey = null;
        this.objectCounters = {};
        this.helpModal = null;
        this.helpModalContent = null;
 this.selectedAssetType = null; // ★ 選択中のアセットタイプも保持
        this.currentAssetTab = 'image'; // ★ 現在のアクティブなタブ
        const currentURL = window.location.href;
          this.currentEditorMode = 'select'; // ★ 'select' or 'tilemap'
        if (!currentURL.includes('?debug=true') && !currentURL.includes('&debug=true')) return;

        // --- 1. DOM要素の参照をまとめて取得 ---
        this.editorPanel = document.getElementById('editor-panel');
        this.assetBrowserPanel = document.getElementById('asset-browser');
        this.assetListContainer = document.getElementById('asset-list');
        this.cameraControls = document.getElementById('camera-controls');
        this.zoomInBtn = document.getElementById('camera-zoom-in');
        this.zoomOutBtn = document.getElementById('camera-zoom-out');
        this.panUpBtn = document.getElementById('camera-pan-up');
        this.panDownBtn = document.getElementById('camera-pan-down');
        this.panLeftBtn = document.getElementById('camera-pan-left');
        this.panRightBtn = document.getElementById('camera-pan-right');
        this.resetBtn = document.getElementById('camera-reset');
        this.modeToggle = document.getElementById('mode-toggle-checkbox');
        this.modeLabel = document.getElementById('mode-label');
        this.helpModal = document.getElementById('help-modal-overlay');
        this.helpModalContent = document.getElementById('help-modal-content');
        this.assetTabContainer = document.getElementById('asset-tabs');
        this.selectModeBtn = document.getElementById('select-mode-btn');
        this.tilemapModeBtn = document.getElementById('tilemap-mode-btn');
this.tilesetPanel = document.getElementById('tileset-panel');
        this.tilesetPreview = document.getElementById('tileset-preview');
        // --- 2. プロパティの初期化 ---
        this.currentMode = 'select';

         // ★ タイルマップエディタ用のプロパティ
        this.currentTileset = null; // 現在選択中のタイルセット情報
        this.selectedTileIndex = 0; // 現在選択中のタイルのインデックス
        this.tilesetHighlight = null; // 選択範囲を示すハイライト要素

        // --- 3. UIの初期セットアップを一度だけ実行 ---
        if (this.editorPanel) this.editorPanel.style.display = 'flex';
        if (this.assetBrowserPanel) this.assetBrowserPanel.style.display = 'flex';
        
        this.createPauseToggle();
        this.createHelpButton();
        this.initializeEventListeners(); // ★★★ リスナー設定はここで一度だけ呼び出す
        this.populateAssetBrowser();
    }

    /**
     * このクラスが管理する全てのUI要素にイベントリスナーを設定する (重複登録防止版)
     */
    // in src/editor/EditorUI.js

    /**
     * このクラスが管理する全てのUI要素にイベントリスナーを設定する (重複登録防止・最終版)
     */
    initializeEventListeners() {
        // ▼▼▼【重要】古いリスナーを安全に解除するためのヘルパー関数 ▼▼▼
        const replaceListener = (element, event, handler) => {
            if (!element) return;
            // 要素をDOMツリーからクローンして入れ替えることで、全ての既存リスナーを破棄する
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);
            // 新しい要素に、リスナーを「一度だけ」設定する
            newElement.addEventListener(event, handler);
            return newElement; // 新しい要素への参照を返す
        };
        
        // --- カメラコントロール ---
        if (this.cameraControls) this.cameraControls.style.display = 'flex';
        // cloneNodeで要素が置き換わるため、thisのプロパティも更新する
        this.zoomInBtn = replaceListener(this.zoomInBtn, 'click', () => this.plugin.zoomCamera(0.2));
        this.zoomOutBtn = replaceListener(this.zoomOutBtn, 'click', () => this.plugin.zoomCamera(-0.2));
        this.resetBtn = replaceListener(this.resetBtn, 'click', () => this.plugin.resetCamera());

        const panSpeed = 10;
        this.setupPanButton(this.panUpBtn, 0, -panSpeed);
        this.setupPanButton(this.panDownBtn, 0, panSpeed);
        this.setupPanButton(this.panLeftBtn, -panSpeed, 0);
        this.setupPanButton(this.panRightBtn, panSpeed, 0);

        // --- モード切替 ---
        // addEventListenerを直接使う場合、一度しか呼ばれないことが保証されている場所で行う
        // constructor内で一度しか呼ばれないので、ここはcloneNodeなしでも安全
        if (this.modeToggle && this.modeLabel) {
            this.modeToggle.addEventListener('change', (event) => {
                this.currentMode = event.target.checked ? 'play' : 'select';
                this.modeLabel.textContent = event.target.checked ? 'Play Mode' : 'Select Mode';
            });
        }

        // --- アセットブラウザのボタン ---
        const addAssetButton = document.getElementById('add-asset-button');
        replaceListener(addAssetButton, 'click', () => this.onAddButtonClicked());

        const addTextButton = document.getElementById('add-text-button');
        replaceListener(addTextButton, 'click', () => this.onAddTextClicked());
        
        // --- ヘルプモーダル ---
        const helpModalCloseBtn = document.getElementById('help-modal-close-btn');
        replaceListener(helpModalCloseBtn, 'click', () => this.closeHelpModal());
         // ▼▼▼【新しいモード切替ボタンのリスナーを追加】▼▼▼
        if (this.selectModeBtn) {
            this.selectModeBtn.addEventListener('click', () => this.setEditorMode('select'));
        }
        if (this.tilemapModeBtn) {
            this.tilemapModeBtn.addEventListener('click', () => this.setEditorMode('tilemap'));
        }
    }
      /**
     * ★★★ 新規メソッド ★★★
     * エディタの主モード（Select or Tilemap）を切り替える
     * @param {string} mode - 'select' または 'tilemap'
     */
    setEditorMode(mode) {
        if (this.currentEditorMode === mode) return; // 同じモードなら何もしない
        this.currentEditorMode = mode;
        console.log(`[EditorUI] Editor mode changed to: ${mode}`);

        // --- Bodyのクラスを制御して、UIの表示/非表示を切り替える ---
           if (mode === 'tilemap') {
            document.body.classList.add('tilemap-mode');
            this.tilemapModeBtn.classList.add('active');
            this.selectModeBtn.classList.remove('active');
        } else {
            document.body.classList.remove('tilemap-mode');
            this.selectModeBtn.classList.add('active');
            this.tilemapModeBtn.classList.remove('active');
        }
         // ★★★ タイルマップモード有効化/無効化の処理を追加 ★★★
        if (mode === 'tilemap') {
            document.body.classList.add('tilemap-mode');
            this.tilemapModeBtn.classList.add('active');
            this.selectModeBtn.classList.remove('active');
            
            // ★ タイルセットパネルを初期化して表示する
            this.initTilesetPanel();

        } else { // 'select' mode
            document.body.classList.remove('tilemap-mode');
            this.selectModeBtn.classList.add('active');
            this.tilemapModeBtn.classList.remove('active');
        }
    }
       /**
     * ★★★ 新規メソッド ★★★
     * "Add Text"ボタンがクリックされたときに呼び出される
     */
    onAddTextClicked() {
        // 1. 現在アクティブなゲームシーンを特定 (onAddButtonClickedと同じロジック)
        const targetScene = this.getActiveGameScene();
        
        if (!targetScene) {
             console.error("[EditorUI] Could not find a suitable target scene for adding text.");
             alert("テキストオブジェクトを追加できるアクティブなゲームシーンが見つかりません。");
             return;
        }

        // 2. シーンに「テキストオブジェクト追加」を依頼する
        if (typeof targetScene.addTextObjectFromEditor === 'function') {
            // 一意な名前を生成
            const newName = `text_${Date.now()}`;

            // シーンに、新しい名前を渡して追加を依頼
            const newObject = targetScene.addTextObjectFromEditor(newName);

            // 3. 成功すれば、選択状態にしてパネルを更新
            if (newObject && this.plugin) {
                this.plugin.selectedObject = newObject;
                this.plugin.updatePropertyPanel();
            }
        } else {
            console.error(`[EditorUI] Target scene '${targetScene.scene.key}' does not have an 'addTextObjectFromEditor' method.`);
        }
    }

    /**
     * ★★★ 新規ヘルパーメソッド ★★★
     * 現在編集対象となるべき、アクティブなゲームシーンを返す
     * @returns {Phaser.Scene | null}
     */
    getActiveGameScene() {
        // EditorPluginが参照を持っていれば、それを使うのが最も確実
        if (this.plugin && typeof this.plugin.getActiveGameScene === 'function') {
            const scene = this.plugin.getActiveGameScene();
            if (scene) return scene;
        }

        // フォールバックとして、シーンリストから探す (onAddButtonClickedと同じロジック)
        const scenes = this.game.scene.getScenes(true);
        for (let i = scenes.length - 1; i >= 0; i--) {
            const scene = scenes[i];
            // GameScene(ノベル)とコアシーン以外を対象とする
            if (scene.scene.key !== 'UIScene' && scene.scene.key !== 'SystemScene' && scene.scene.key !== 'GameScene') {
                return scene;
            }
        }
        return null;
    }
     /**
     * アセットブラウザをタブ付きで生成・更新する (バグ修正・完成版)
     */
    populateAssetBrowser() {
        const assetList = this.game.registry.get('asset_list');
        if (!assetList || !this.assetListContainer || !this.assetTabContainer) return;

        // --- 1. 利用可能なアセットタイプを特定 ---
        // ★ 'image'と'spritesheet'をまとめて'image'タブで扱うようにする
        const assetTypes = [...new Set(assetList.map(asset => (asset.type === 'spritesheet' ? 'image' : asset.type)))];
        if (!assetTypes.includes('image')) assetTypes.unshift('image'); // 画像がなくてもタブは表示

        // --- 2. タブボタンを生成 ---
        this.assetTabContainer.innerHTML = '';
        assetTypes.forEach(type => {
            if (!type) return; // 空のタイプを除外
            const tabButton = document.createElement('div');
            tabButton.className = 'asset-tab';
            tabButton.innerText = type.charAt(0).toUpperCase() + type.slice(1) + 's';
            if (type === this.currentAssetTab) {
                tabButton.classList.add('active');
            }
            tabButton.addEventListener('click', () => {
                this.currentAssetTab = type;
                this.selectedAssetKey = null; // タブを切り替えたら選択をリセット
                this.selectedAssetType = null;
                this.populateAssetBrowser();
            });
            this.assetTabContainer.appendChild(tabButton);
        });

        // --- 3. 現在のタブに応じてアセットリストを表示 ---
        this.assetListContainer.innerHTML = '';
        const displayableAssets = assetList.filter(asset => {
            if (this.currentAssetTab === 'image') {
                return asset.type === 'image' || asset.type === 'spritesheet';
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
                this.selectedAssetType = asset.type; // ★ タイプも保存
            });
            
            // --- プレビュー表示 ---
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
            
            // --- キー表示 ---
            const keySpan = document.createElement('span');
            keySpan.innerText = asset.key;
            itemDiv.appendChild(keySpan);
            
            // --- スプライトシート用バッジ ---
           if (asset.type === 'spritesheet') {
                const badge = document.createElement('span');
                badge.innerText = 'Sheet';
                badge.style.backgroundColor = '#3a86ff';
                badge.style.color = 'white';
                badge.style.fontSize = '10px';
                badge.style.padding = '2px 4px';
                badge.style.borderRadius = '3px';
                badge.style.marginLeft = 'auto';
                // 3. 最後に、バッジを追加
                itemDiv.appendChild(badge);
            }


            this.assetListContainer.appendChild(itemDiv);
        }
    }

 
     /**
     * "Add Selected Asset"ボタンの処理 (プレハブ対応・完成版)
     */
    onAddButtonClicked() {
        if (!this.selectedAssetKey) {
            alert('Please select an asset from the browser first.');
            return;
        }

        const targetScene = this.getActiveGameScene();
        if (!targetScene) {
            alert("Could not find a suitable target scene.");
            return;
        }

        // --- 連番の名前を生成 ---
        if (!this.objectCounters[this.selectedAssetKey]) {
            this.objectCounters[this.selectedAssetKey] = 1;
        } else {
            this.objectCounters[this.selectedAssetKey]++;
        }
        const newName = `${this.selectedAssetKey}_${this.objectCounters[this.selectedAssetKey]}`;
        
        let newObject = null;

        // ★★★ 選択中のアセットタイプに応じて、呼び出すメソッドを分岐 ★★★
        if (this.selectedAssetType === 'image' || this.selectedAssetType === 'spritesheet') {
            if (typeof targetScene.addObjectFromEditor === 'function') {
                newObject = targetScene.addObjectFromEditor(this.selectedAssetKey, newName);
            } else {
                console.error(`[EditorUI] Target scene does not have 'addObjectFromEditor' method.`);
            }
        } 
        else if (this.selectedAssetType === 'prefab') {
            if (typeof targetScene.addPrefabFromEditor === 'function') {
                newObject = targetScene.addPrefabFromEditor(this.selectedAssetKey, newName);
            } else {
                console.error(`[EditorUI] Target scene does not have 'addPrefabFromEditor' method.`);
            }
        }
        
        // --- 成功すれば、選択状態にしてパネルを更新 ---
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

      /**
     * ★★★ 新規メソッド ★★★
     * タイルセットパネルを初期化し、タイルセットを表示する
     */
    initTilesetPanel() {
        if (!this.tilesetPreview) return;

        // asset_define.jsonからタイルセット情報を取得
        const assetDefine = this.game.cache.json.get('asset_define');
        const tilesets = assetDefine.tilesets;

        // ★ とりあえず、最初のタイルセットを読み込む (将来的には選択式にする)
        const firstTilesetKey = Object.keys(tilesets)[0];
        this.currentTileset = tilesets[firstTilesetKey];
        if (!this.currentTileset) {
            console.error("No tilesets defined in asset_define.json");
            return;
        }

        // --- 1. プレビューエリアをクリア ---
        this.tilesetPreview.innerHTML = '';

        // --- 2. タイルセット画像を表示するimg要素を作成 ---
        const img = document.createElement('img');
        const texture = this.game.textures.get(this.currentTileset.key);
        img.src = texture.getSourceImage().src;
        img.style.imageRendering = 'pixelated'; // ドット絵がぼやけないようにする

        // --- 3. 選択範囲ハイライト用のdiv要素を作成 ---
        this.tilesetHighlight = document.createElement('div');
        this.tilesetHighlight.style.position = 'absolute';
        this.tilesetHighlight.style.border = '2px solid #00ff00'; // 目立つ緑色
        this.tilesetHighlight.style.pointerEvents = 'none'; // クリックを邪魔しないように
        this.tilesetHighlight.style.width = `${this.currentTileset.tileWidth - 4}px`; // ボーダーの太さを考慮
        this.tilesetHighlight.style.height = `${this.currentTileset.tileHeight - 4}px`;

        // --- 4. クリックイベントリスナーを設定 ---
        this.tilesetPreview.addEventListener('click', (event) => {
            this.onTilesetClick(event);
        });

        // --- 5. DOMに追加 ---
        this.tilesetPreview.appendChild(img);
        this.tilesetPreview.appendChild(this.tilesetHighlight);
        
        // 初期選択タイルをハイライト
        this.updateTilesetHighlight();
    }
    
    /**
     * ★★★ 新規メソッド ★★★
     * タイルセットパネルがクリックされたときに、選択タイルを更新する
     */
    onTilesetClick(event) {
        if (!this.currentTileset) return;

        // クリックされた座標を計算 (パネルの左上からの相対座標)
        const rect = this.tilesetPreview.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // 座標から、どのタイルがクリックされたかを計算
        const tileX = Math.floor(x / this.currentTileset.tileWidth);
        const tileY = Math.floor(y / this.currentTileset.tileHeight);
        
        const texture = this.game.textures.get(this.currentTileset.key);
        const tilesPerRow = texture.getSourceImage().width / this.currentTileset.tileWidth;

        // タイルのインデックスを計算 (左上から0, 1, 2...)
        this.selectedTileIndex = tileY * tilesPerRow + tileX;
        
        console.log(`Selected tile index: ${this.selectedTileIndex}`);
        
        this.updateTilesetHighlight();
    }
    
    /**
     * ★★★ 新規メソッド ★★★
     * 選択タイルのハイライト表示を更新する
     */
    updateTilesetHighlight() {
        if (!this.tilesetHighlight || !this.currentTileset) return;

        const texture = this.game.textures.get(this.currentTileset.key);
        const tilesPerRow = texture.getSourceImage().width / this.currentTileset.tileWidth;

        const tileX = this.selectedTileIndex % tilesPerRow;
        const tileY = Math.floor(this.selectedTileIndex / tilesPerRow);

        this.tilesetHighlight.style.left = `${tileX * this.currentTileset.tileWidth}px`;
        this.tilesetHighlight.style.top = `${tileY * this.currentTileset.tileHeight}px`;
    }


}



