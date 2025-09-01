// src/editor/EditorUI.js (最終確定・完成版)

export default class EditorUI {
    constructor(game, editorPlugin) {
        this.game = game;
        this.plugin = editorPlugin;
        this.selectedAssetKey = null;

        const currentURL = window.location.href;
        if (!currentURL.includes('?debug=true') && !currentURL.includes('&debug=true')) return;

        this.editorPanel = document.getElementById('editor-panel');
        this.assetBrowserPanel = document.getElementById('asset-browser');
        if (this.editorPanel) this.editorPanel.style.display = 'flex';
        if (this.assetBrowserPanel) this.assetBrowserPanel.style.display = 'flex';

        this.assetListContainer = document.getElementById('asset-list');
        // ★★★ populateAssetBrowserは一度だけ呼び出す ★★★
        this.populateAssetBrowser();
    }

    populateAssetBrowser() {
        const assetList = this.game.registry.get('asset_list');
        if (!assetList || !this.assetListContainer) return;
        this.assetListContainer.innerHTML = '';
        const imageAssets = assetList.filter(asset => asset.type === 'image');
        for (const asset of imageAssets) {
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
            this.assetListContainer.appendChild(itemDiv);
        }
    }

  // src/editor/EditorUI.js

    onAddButtonClicked() {
        if (!this.selectedAssetKey) {
            alert('Please select an asset from the browser first.');
            return;
        }

        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが、ターゲットシーンを見つける、最後の、そして最も確実な方法です ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        let targetScene = null;
        const scenes = this.game.scene.getScenes(true); // アクティブなシーンを全て取得

        // シーンリストの「後ろ」から探す（後ろにあるほど、手前に描画されている）
        for (let i = scenes.length - 1; i >= 0; i--) {
            const scene = scenes[i];
            // それが UIScene で「なければ」、それがターゲットだ
            if (scene.scene.key !== 'UIScene') {
                targetScene = scene;
                break; // ターゲットを見つけたら、ループを抜ける
            }
        }
        
        // ★★★ これで、ターゲットシーンが確実に見つかります ★★★


        if (!targetScene) {
             console.error("[EditorUI] Could not find a suitable target scene. Is a game scene running?");
             return;
        }
        if (!targetScene.initializeObject) {
             console.error(`[EditorUI] Target scene '${targetScene.scene.key}' does not have an 'initializeObject' method.`);
             return;
        }

        const centerX = targetScene.cameras.main.centerX;
        const centerY = targetScene.cameras.main.centerY;
        
        // --- 以下のオブジェクト生成ロジックは、前回の提案で完璧です ---
        const newImage = new Phaser.GameObjects.Image(targetScene, centerX, centerY, '__DEFAULT');

        targetScene.initializeObject(newImage, {
            name: `${this.selectedAssetKey}_${Date.now()}`,
            texture: this.selectedAssetKey,
            x: centerX,
            y: centerY,
            scaleX: 1,
            scaleY: 1,
            angle: 0,
            alpha: 1,
            visible: true
        });

        this.plugin.selectedObject = newImage;
        this.plugin.updatePropertyPanel();
    }
}