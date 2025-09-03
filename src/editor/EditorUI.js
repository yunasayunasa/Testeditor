// src/editor/EditorUI.js (最終確定・完成版)

export default class EditorUI {
    constructor(game, editorPlugin) {
        this.game = game;
        this.plugin = editorPlugin;
        this.selectedAssetKey = null;
     this.objectCounters = {};

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
        this.resetBtn = document.getElementById('camera-reset');
        
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
        if (targetScene.addObjectFromEditor) {
            
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
                this.plugin.selectedObject = newObject;
                this.plugin.updatePropertyPanel();
            }
        } else {
            console.error(`[EditorUI] Target scene '${targetScene.scene.key}' does not have an 'addObjectFromEditor' method.`);
        }
    }
}
