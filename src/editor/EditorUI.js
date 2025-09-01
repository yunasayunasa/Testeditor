// src/editor/EditorUI.js

export default class EditorUI {
    constructor(game, editorPlugin) {
        this.game = game;
        this.plugin = editorPlugin;

        // --- HTML要素の取得 ---
        this.editorPanel = document.getElementById('editor-panel');
        this.assetBrowserPanel = document.getElementById('asset-browser');
        // (トグルボタンはもうないので削除)

        // ★★★ 変更点1: 初期状態では、パネルを非表示にしておく ★★★
        if (this.editorPanel) this.editorPanel.style.display = 'none';
        if (this.assetBrowserPanel) this.assetBrowserPanel.style.display = 'none';
    }

    /**
     * ★★★ 新規メソッド: エディタUIを起動し、表示する ★★★
     */
    run() {
        console.log("[EditorUI] Running...");

        // --- パネルを表示状態にする ---
        if (this.editorPanel) this.editorPanel.style.display = 'flex'; // 'block'から'flex'に変更
        if (this.assetBrowserPanel) this.assetBrowserPanel.style.display = 'flex';

        // --- 各機能の初期化 ---
        this.assetListContainer = document.getElementById('asset-list');
        this.populateAssetBrowser();
        this.initDragAndDrop();
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
            itemDiv.draggable = true;
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

    initDragAndDrop() {
        document.addEventListener('dragstart', (event) => {
            const assetItem = event.target.closest('.asset-item');
            if (assetItem) {
                event.dataTransfer.setData('text/plain', assetItem.dataset.assetKey);
                event.dataTransfer.effectAllowed = 'copy';
            }
        });
        const gameCanvas = this.game.canvas;
        gameCanvas.addEventListener('dragover', (event) => event.preventDefault());
        gameCanvas.addEventListener('drop', (event) => {
            event.preventDefault();
            const assetKey = event.dataTransfer.getData('text/plain');
            if (!assetKey) return;
            const pointer = this.game.input.activePointer;
            const scenes = this.game.scene.getScenes(true);
            let targetScene = null;
            for (let i = scenes.length - 1; i >= 0; i--) {
                const scene = scenes[i];
                if (scene.cameras.main.worldView.contains(pointer.x, pointer.y)) {
                    targetScene = scene;
                    break;
                }
            }
            if (targetScene) {
                const newImage = targetScene.add.image(pointer.worldX, pointer.worldY, assetKey);
                newImage.name = `${assetKey}_${Date.now()}`;
                this.plugin.makeEditable(newImage, targetScene);
                this.plugin.selectedObject = newImage;
                this.plugin.updatePropertyPanel();
            }
        });
    }
}