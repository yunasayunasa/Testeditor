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

        this.editorPanel = document.getElementById('editor-panel');
        this.assetBrowserPanel = document.getElementById('asset-browser');
        if (this.editorPanel) this.editorPanel.style.display = 'flex';
        if (this.assetBrowserPanel) this.assetBrowserPanel.style.display = 'flex';

        this.assetListContainer = document.getElementById('asset-list');
        this.cameraControls = document.getElementById('camera-controls');
        this.zoomInBtn = document.getElementById('camera-zoom-in');
        this.zoomOutBtn = document.getElementById('camera-zoom-out');
         this.panUpBtn = document.getElementById('camera-pan-up');
        this.panDownBtn = document.getElementById('camera-pan-down');
        this.panLeftBtn = document.getElementById('camera-pan-left');
        this.panRightBtn = document.getElementById('camera-pan-right');
        this.resetBtn = document.getElementById('camera-reset');
        this.currentMode = 'select'; // 'select' or 'play'
        this.modeToggle = document.getElementById('mode-toggle-checkbox');
        this.modeLabel = document.getElementById('mode-label');


        // ★★★ ヘルプモーダル関連のDOM要素を取得 ★★★
        this.helpModal = document.getElementById('help-modal-overlay');
        this.helpModalContent = document.getElementById('help-modal-content');
        const helpModalCloseBtn = document.getElementById('help-modal-close-btn');
        if (helpModalCloseBtn) {
            helpModalCloseBtn.addEventListener('click', () => this.closeHelpModal());
        }

        this.initializeEventListeners();
        this.populateAssetBrowser();
        
        // ★★★ ヘルプボタンを生成するメソッドを呼び出す ★★★
        this.createHelpButton();
    
        // ★★★ 3. 新しいメソッドを呼び出して、イベントリスナーをまとめて設定 ★★★
        this.initializeEventListeners();
        this.populateAssetBrowser();
    }
 /**
     * ★★★ 新規メソッド ★★★
     * このクラスが管理する全てのUI要素にイベントリスナーを設定する
     */
    initializeEventListeners() {
        // --- カメラコントロール ---
        if (this.cameraControls) {
            this.cameraControls.style.display = 'flex'; // 表示する
        }
        if (this.zoomInBtn) {
            console.log("[EditorUI] Adding listener to Zoom In button.");
            this.zoomInBtn.addEventListener('click', () => {
                this.plugin.zoomCamera(0.2); // Pluginに命令
            });
        }
        if (this.zoomOutBtn) {
            this.zoomOutBtn.addEventListener('click', () => {
                this.plugin.zoomCamera(-0.2); // Pluginに命令
            });
        }
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => {
                this.plugin.resetCamera(); // Pluginに命令
            });
        }
         const panSpeed = 10; // カメラの移動速度
        this.setupPanButton(this.panUpBtn, 0, -panSpeed);
        this.setupPanButton(this.panDownBtn, 0, panSpeed);
        this.setupPanButton(this.panLeftBtn, -panSpeed, 0);
        this.setupPanButton(this.panRightBtn, panSpeed, 0);
if (this.modeToggle && this.modeLabel) {
            this.modeToggle.addEventListener('change', (event) => {
                if (event.target.checked) {
                    this.currentMode = 'play';
                    this.modeLabel.textContent = 'Play Mode';
                } else {
                    this.currentMode = 'select';
                    this.modeLabel.textContent = 'Select Mode';
                }
                console.log(`[EditorUI] Mode changed to: ${this.currentMode}`);
            });
        }
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
    createHelpButton() {
        // ★ 移設先：アセットブラウザのヘッダー
        const assetBrowserHeader = document.querySelector('#asset-browser .panel-header');
        
        if (assetBrowserHeader) {
            const helpButton = document.createElement('button');
            helpButton.innerText = '?';
            helpButton.title = 'Open Help Manual';
            
            // ★ スタイルを少し調整して、ヘッダーに馴染ませる
            helpButton.style.marginLeft = 'auto'; // 右端に寄せる
            helpButton.style.padding = '2px 8px';
            helpButton.style.borderRadius = '4px';
            helpButton.style.border = '1px solid #555';
            helpButton.style.backgroundColor = '#444';
            helpButton.style.color = '#eee';
            helpButton.style.cursor = 'pointer';

            helpButton.addEventListener('click', () => this.openHelpModal());
            assetBrowserHeader.appendChild(helpButton);
        } else {
            console.warn('[EditorUI] Asset browser header not found for help button placement.');
        }
    }

    // ★★★ 新規メソッド：ヘルプモーダルを開く ★★★
    async openHelpModal() {
        if (!this.helpModal || !this.helpModalContent) return;
  // ★★★ bodyにクラスを追加 ★★★
        document.body.classList.add('modal-open');
        // ★★★ オーバーレイ自身にもクラスを追加 ★★★
        this.helpModal.classList.add('is-active');
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
         // ★★★ bodyからクラスを削除 ★★★
        document.body.classList.remove('modal-open');
        // ★★★ オーバーレイ自身からもクラスを削除 ★★★
        this.helpModal.classList.remove('is-active');
        this.helpModal.style.display = 'none';
      
    }

}
