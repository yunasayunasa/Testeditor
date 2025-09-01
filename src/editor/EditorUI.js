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

    onAddButtonClicked() {
        if (!this.selectedAssetKey) {
            alert('Please select an asset from the browser first.');
            return;
        }

        // ★★★ ターゲットシーンを動的に見つける ★★★
        let targetScene = null;
        const scenes = this.game.scene.getScenes(true);
        // GameSceneか、'ActionScene'のような名前のシーンを探す
        targetScene = scenes.find(s => s.scene.key === 'GameScene' || s.scene.key.toLowerCase().includes('scene'));
        // 見つからなければ、アクティブな最後のシーンを対象にする
        if (!targetScene && scenes.length > 0) {
            targetScene = scenes[scenes.length - 1];
        }
        
        if (!targetScene || !targetScene.initializeObject) {
             console.error(`[EditorUI] Could not find a suitable target scene with 'initializeObject' method.`);
             return;
        }

        const centerX = targetScene.cameras.main.centerX;
        const centerY = targetScene.cameras.main.centerY;
        
        const newImage = new Phaser.GameObjects.Image(targetScene, centerX, centerY, '__DEFAULT');

        targetScene.initializeObject(newImage, {
            name: `${this.selectedAssetKey}_${Date.now()}`,
            texture: this.selectedAssetKey,
            x: centerX, y: centerY, scaleX: 1, scaleY: 1, angle: 0, alpha: 1, visible: true
        });

        this.plugin.selectedObject = newImage;
        this.plugin.updatePropertyPanel();
    }
}