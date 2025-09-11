// src/editor/EditorUI.js (最終確定・完成版)

export default class EditorUI {
    constructor(game, editorPlugin) {
        this.game = game;
        this.plugin = editorPlugin;
        this.selectedAssetKey = null;
        this.objectCounters = {};
        this.helpModal = null;
        this.helpModalContent = null;

        const currentURL = window.location.href;
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

        // --- 2. プロパティの初期化 ---
        this.currentMode = 'select';

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
   // src/editor/EditorUI.js

    populateAssetBrowser() {
        const assetList = this.game.registry.get('asset_list');
        if (!assetList || !this.assetListContainer) return;
        
        this.assetListContainer.innerHTML = '';
        
        const displayableAssets = assetList.filter(asset => asset.type === 'image' || asset.type === 'spritesheet');

        for (const asset of displayableAssets) {
            
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            // ★★★ これが、全てを解決する、最後の修正です ★★★
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

            const itemDiv = document.createElement('div');
            itemDiv.className = 'asset-item';
            itemDiv.dataset.assetKey = asset.key;
            itemDiv.addEventListener('click', () => {
                this.assetListContainer.querySelectorAll('.asset-item.selected').forEach(el => el.classList.remove('selected'));
                itemDiv.classList.add('selected');
                this.selectedAssetKey = asset.key;
            });
            
            const previewImg = document.createElement('img');
            previewImg.className = 'asset-preview';
            previewImg.src = asset.path;
            
            const keySpan = document.createElement('span');
            keySpan.className = 'asset-key';
            keySpan.innerText = asset.key;

            itemDiv.appendChild(previewImg);

            itemDiv.appendChild(keySpan);

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

            // 4. 全ての部品が揃ったitemDivを、リストのコンテナに「追加」する
            this.assetListContainer.appendChild(itemDiv);
        }
        
        console.log(`[EditorUI] Asset Browser populated with ${displayableAssets.length} displayable assets.`);
    }

    onAddButtonClicked() {
        if (!this.selectedAssetKey) {
            alert('Please select an asset from the browser first.');
            return;
        }

        // --- 1. 現在アクティブな「ゲーム」シーンを特定 ---
        let targetScene = null;
        const scenes = this.game.scene.getScenes(true);
        for (let i = scenes.length - 1; i >= 0; i--) {
            const scene = scenes[i];
            if (scene.scene.key !== 'UIScene' && scene.scene.key !== 'SystemScene' && scene.scene.key !== 'GameScene') {
                targetScene = scene;
                break;
            }
        }
        
        if (!targetScene) {
             console.error("[EditorUI] Could not find a suitable target scene (e.g., JumpScene).");
             alert("Could not find a suitable target scene. Make sure you are not in GameScene.");
             return;
        }

        // --- 2. シーンに「オブジェクト追加」を依頼する ---
       if (targetScene && typeof targetScene.addObjectFromEditor === 'function') {
            
            // --- 2-1. 連番の名前を生成 ---
            if (!this.objectCounters[this.selectedAssetKey]) {
                this.objectCounters[this.selectedAssetKey] = 1;
            } else {
                this.objectCounters[this.selectedAssetKey]++;
            }
            const newName = `${this.selectedAssetKey}_${this.objectCounters[this.selectedAssetKey]}`;

            // --- 2-2. シーンに、アセットキーと新しい名前を渡して、追加を依頼 ---
            const newObject = targetScene.addObjectFromEditor(this.selectedAssetKey, newName);

            // --- 2-3. 成功すれば、選択状態にしてパネルを更新 ---
            if (newObject) {
               // ▼▼▼▼▼ 【重要修正】プラグインとメソッドの存在をチェックしてから呼び出す ▼▼▼▼▼
                if (this.plugin && typeof this.plugin.updatePropertyPanel === 'function') {
                    this.plugin.selectedObject = newObject;
                    this.plugin.updatePropertyPanel();
                }}
        } else {
            console.error(`[EditorUI] Target scene '${targetScene.scene.key}' does not have an 'addObjectFromEditor' method.`);
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



