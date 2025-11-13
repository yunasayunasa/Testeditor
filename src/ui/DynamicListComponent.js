export default class DynamicListComponent {
    constructor(scene, gameObject, params) {
        this.scene = scene;
        this.listContainer = gameObject; // このコンポーネントがアタッチされたコンテナ
        
        this.dataSourceVariable = params.dataSource;
        this.templatePrefabKey = params.template;
        this.masterDataKey = params.masterData;

        this.stateManager = this.scene.registry.get('stateManager');

        // シーンの準備ができた後にリストを構築
        this.scene.events.once('scene-ready', this.buildList, this);
    }

    static define = {
        params: [
            { key: 'dataSource', type: 'text', label: 'Data Source (f.)' },
            { key: 'template', type: 'asset_key', assetType: 'prefab', label: 'Template Prefab' },
            { key: 'masterData', type: 'text', label: 'Master Data Key' }
        ]
    };
    
    buildList() {
        if (!this.dataSourceVariable || !this.templatePrefabKey || !this.stateManager) return;

        const itemIds = this.stateManager.getValue(this.dataSourceVariable) || [];
        const templateData = this.scene.cache.json.get(this.templatePrefabKey);
        const masterData = this.masterDataKey ? this.scene.cache.json.get(this.masterDataKey) : null;
        
        let yPos = 0; // 開始Y座標

        itemIds.forEach(itemId => {
            const itemData = masterData ? masterData[itemId] : { id: itemId };
            
            // 1. テンプレートからインスタンスを生成
            // BaseGameSceneのaddPrefabFromEditorを流用するのが賢い
            if (typeof this.scene.addPrefabFromEditor !== 'function') return;
            const newRow = this.scene.addPrefabFromEditor(this.templatePrefabKey, `row_${itemId}`);
            
            if (!newRow) return;

            newRow.setPosition(0, yPos); // コンテナ内の相対座標
            
            // 2. データを流し込む
            const nameText = newRow.list.find(child => child.name === 'item_name');
            if (nameText) nameText.setText(itemData.name || 'Unknown');
            
            const itemIcon = newRow.list.find(child => child.name === 'item_icon');
            if (itemIcon) itemIcon.setTexture(itemData.icon || '__DEFAULT');

            // 3. VSLの変数を置き換え
            const events = JSON.parse(JSON.stringify(newRow.getData('events') || []));
            events.forEach(event => {
                event.nodes.forEach(node => {
                    if (node.params && node.params.exp) {
                        node.params.exp = node.params.exp.replace(/&\{data\.id\}/g, `"${itemId}"`);
                    }
                });
            });
            newRow.setData('events', events);
            this.scene.onEditorEventChanged(newRow); // イベントリスナーを再適用
            
            this.listContainer.add(newRow); // 親コンテナに追加
            yPos += newRow.height || 60; // 次の行の位置
        });
    }

    destroy() {
        this.scene.events.off('scene-ready', this.buildList, this);
    }
}