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
            { key: 'dataSource', type: 'text', label: 'Data Source (f.)', defaultValue: 'f.my_list' },
            { key: 'template', type: 'asset_key', assetType: 'prefab', label: 'Template Prefab' },
            { key: 'masterData', type: 'text', label: 'Master Data Key', defaultValue: '' }
        ]
    };
    
    buildList() {
        if (!this.dataSourceVariable || !this.templatePrefabKey || !this.stateManager) return;

        const itemIds = this.stateManager.getValue(this.dataSourceVariable) || [];
        const templateData = this.scene.cache.json.get(this.templatePrefabKey);
        const masterData = this.masterDataKey ? this.scene.cache.json.get(this.masterDataKey) : null;
        
        let yPos = 0;

        itemIds.forEach(itemId => {
            const itemData = masterData ? masterData[itemId] : { id: itemId };
            
            // 1. テンプレートからインスタンスを生成 (BaseGameSceneの機能を利用)
            const newRow = this.scene.add.container(0, yPos);
            
            // 2. テンプレートの各オブジェクトをコンテナに追加
            templateData.objects.forEach(objLayout => {
                let newChild;
                if (objLayout.type === 'Text') {
                    newChild = this.scene.add.text(objLayout.x, objLayout.y, objLayout.text, objLayout.style);
                } else { // Image, Buttonなど
                    newChild = this.scene.add.image(objLayout.x, objLayout.y, objLayout.texture);
                }
                newChild.name = objLayout.name;
                newChild.setOrigin(objLayout.originX || 0, objLayout.originY || 0);

                // データを流し込む
                if (newChild.name === 'item_name') {
                    newChild.setText(itemData.name || 'Unknown');
                }
                if (newChild.name === 'item_icon') {
                    newChild.setTexture(itemData.icon || '__DEFAULT');
                }
                newRow.add(newChild);
            });

            // 3. VSLの変数を置き換え
            const events = JSON.parse(JSON.stringify(templateData.events || [])); // ディープコピー
            events.forEach(event => {
                event.nodes.forEach(node => {
                    if (node.params.exp) {
                        node.params.exp = node.params.exp.replace(/&\{data\.id\}/g, itemId);
                    }
                });
            });
            newRow.setData('events', events);
            
            // 4. コンテナ全体をクリック可能にする
            newRow.setSize(templateData.width, templateData.height);
            this.scene.applyUiEvents(newRow); // UIScene/OverlaySceneが持つイベント設定メソッドを呼び出す
            
            this.listContainer.add(newRow);
            yPos += templateData.height; // 次の行の位置をずらす
        });
    }

    destroy() {
        this.scene.events.off('scene-ready', this.buildList, this);
    }
}