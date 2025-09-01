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

        const pointer = this.game.input.activePointer;
        // ターゲットシーンを決定（今回はGameSceneに固定する、より安全な方法）
        const targetScene = this.game.scene.getScene('GameScene'); 
        if (!targetScene) return;

        // シーンの中央など、分かりやすい位置に生成
        const centerX = targetScene.cameras.main.centerX;
        const centerY = targetScene.cameras.main.centerY;
        
        const newImage = new Phaser.GameObjects.Image(targetScene, centerX, centerY, this.selectedAssetKey);
        newImage.name = `${this.selectedAssetKey}_${Date.now()}`;
        
        if (targetScene.initializeObject) {
            targetScene.initializeObject(newImage);
        }

        this.plugin.selectedObject = newImage;
        this.plugin.updatePropertyPanel();
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
                  const newImage = new Phaser.GameObjects.Image(targetScene, pointer.worldX, pointer.worldY, assetKey);
                
                // 2. オブジェクトにユニークな名前を付ける
                newImage.name = `${assetKey}_${Date.now()}`;
                
                // 3. シーンの初期化メソッドに、生成したオブジェクトを渡す
                //    レイヤーへの「追加」は、このメソッドの中で一度だけ行われる
                targetScene.initializeObject(newImage);

                // 4. 最後に、選択状態にしてパネルを更新
                this.plugin.selectedObject = newImage;
                this.plugin.updatePropertyPanel();
            }
        });
    }
}