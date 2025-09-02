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

        // --- 1. 現在アクティブな「ゲーム」シーンを特定 ---
        let targetScene = null;
        const scenes = this.game.scene.getScenes(true);
        for (let i = scenes.length - 1; i >= 0; i--) {
            const scene = scenes[i];
            // ★★★ GameSceneは聖域なので、ターゲットから除外する ★★★
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
         // 1. このアセットキーのカウンターが存在しなければ、1で初期化
            if (!this.objectCounters[this.selectedAssetKey]) {
                this.objectCounters[this.selectedAssetKey] = 1;
            } else {
                // 2. 存在すれば、カウンターを1増やす
                this.objectCounters[this.selectedAssetKey]++;
            }

            // 3. 新しい名前を生成 (例: yuko_normal_1, yuko_normal_2)
            const newName = `${this.selectedAssetKey}_${this.objectCounters[this.selectedAssetKey]}`;

            // --- JumpSceneのaddObjectFromEditorを呼び出す ---
            // (このメソッドはBaseGameSceneを継承しているので、applyPropertiesを内部で呼び出す)
            const newObject = targetScene.addObjectFromEditor(this.selectedAssetKey, newName);

            if (newObject) {
                this.plugin.selectedObject = newObject;
                this.plugin.updatePropertyPanel();
            }
        }
    }

        // --- 2. シーンに「オブジェクト追加」を依頼するだけ ---
        if (targetScene.addObjectFromEditor) {
            const newObject = targetScene.addObjectFromEditor(this.selectedAssetKey);
            if (newObject) {
                this.plugin.selectedObject = newObject;
                this.plugin.updatePropertyPanel();
            }
        } else {
            console.error(`[EditorUI] Target scene '${targetScene.scene.key}' does not have an 'addObjectFromEditor' method.`);
        }
    }
}
