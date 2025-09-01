// src/editor/EditorUI.js (真の最終・完成版)


     export default class EditorUI {
    constructor(game, editorPlugin) {
        this.game = game;
        this.plugin = editorPlugin;
        this.assetListContainer = document.getElementById('asset-list');
        
        // ★★★ 新しいプロパティ: 選択されたアセットのキーを記憶する ★★★
        this.selectedAssetKey = null;

        this.populateAssetBrowser();
        // this.initDragAndDrop(); // ← これはもう使わない
    
        // --- ここから先は、デバッグモードが確定した場合のみ実行される ---
        console.warn("[EditorUI] Debug mode activated. Initializing UI...");

        // 3. HTML要素を取得し、表示する
        this.editorPanel = document.getElementById('editor-panel');
        this.assetBrowserPanel = document.getElementById('asset-browser');
        if (this.editorPanel) this.editorPanel.style.display = 'flex';
        if (this.assetBrowserPanel) this.assetBrowserPanel.style.display = 'flex';

        // 4. 各機能の初期化を、安全なタイミングで実行
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
               // ★★★ 変更点1: draggable=trueを削除し、クリックイベントを追加 ★★★
            itemDiv.addEventListener('click', () => {
                // 他のアイテムの選択状態を解除
                this.assetListContainer.querySelectorAll('.asset-item.selected').forEach(el => el.classList.remove('selected'));
                // このアイテムを選択状態にする
                itemDiv.classList.add('selected');
                // 選択されたアセットのキーを記憶
                this.selectedAssetKey = asset.key;
                console.log(`[EditorUI] Asset selected: ${this.selectedAssetKey}`);
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
   // ★★★ initDragAndDropの代わりに、このメソッドを呼び出す ★★★
    // (これはEditorPluginから呼び出す)
     onAddButtonClicked() {
        if (!this.selectedAssetKey) {
            alert('Please select an asset from the browser first.');
            return;
        }

        const targetScene = this.game.scene.getScene('GameScene'); 
        if (!targetScene || !targetScene.initializeObject) {
             console.error("[EditorUI] Target scene 'GameScene' or its 'initializeObject' method not found.");
             return;
        }

        const centerX = targetScene.cameras.main.centerX;
        const centerY = targetScene.cameras.main.centerY;
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが、あなたのエンジンに敬意を払った、最後のコードです ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // 1. まず、「空っぽの画像オブジェクト」を、メモリ上に生成するだけ
        //    '__DEFAULT' は、Phaserに組み込まれた真っ白な仮テクスチャです
        const newImage = new Phaser.GameObjects.Image(targetScene, centerX, centerY, '__DEFAULT');

        // 2. この「生の」オブジェクトと、これから適用してほしい「設計図(layout)」を、
        //    GameSceneのinitializeObjectメソッドに、そのまま渡す
        targetScene.initializeObject(newImage, {
            name: `${this.selectedAssetKey}_${Date.now()}`,
            texture: this.selectedAssetKey, // ★ どのテクスチャを使ってほしいかを伝える
            x: centerX,
            y: centerY,
            scaleX: 1,
            scaleY: 1,
            angle: 0,
            alpha: 1,
            visible: true
        });

        // 3. 最後に、選択状態にしてパネルを更新
        this.plugin.selectedObject = newImage;
        this.plugin.updatePropertyPanel();
    }

  
}