export default class DynamicListComponent {
    constructor(scene, gameObject, params) {
        this.scene = scene;
        // ★ gameObject は、リストを配置する「位置」を示すための目印としてのみ使う
        this.placeholder = gameObject; 
        
        this.dataSourceVariable = params.dataSource;
        this.templatePrefabKey = params.template;
        this.masterDataKey = params.masterData;

        this.stateManager = this.scene.registry.get('stateManager');

        // ★ 自分自身で、リストの本体となるContainerを作成する
        this.listContainer = this.scene.add.container(this.placeholder.x, this.placeholder.y);

        // シーンの準備ができた後にリストを構築
        this.scene.events.once('scene-ready', this.buildList, this);
    }

    static define = {
        params: [
            { key: 'dataSource', type: 'text', label: 'Data Source (f.)' },
            { key: 'template', type: 'select', options: 'asset:prefab', label: 'Template Prefab' },
            { key: 'masterData', type: 'text', label: 'Master Data Key' }
        ]
    };
    
    buildList() {
        if (!this.dataSourceVariable || !this.templatePrefabKey || !this.stateManager) return;

        // ... (itemIds, templateData, masterData の取得は変更なし)
        const itemIds = this.stateManager.getValue(this.dataSourceVariable) || [];
        const templateData = this.scene.cache.json.get(this.templatePrefabKey);
        const masterData = this.masterDataKey ? this.scene.cache.json.get(this.masterDataKey) : null;
        
        let yPos = 0;

        itemIds.forEach(itemId => {
            const itemData = masterData ? masterData[itemId] : { id: itemId };
            
            // --- 1. テンプレートのレイアウトデータをコピー＆改造 ---
            const newRowLayout = JSON.parse(JSON.stringify(templateData));
            newRowLayout.name = `row_${itemId}`;
            newRowLayout.x = 0; // コンテナ内の相対座標
            newRowLayout.y = yPos;

            const evalNode = newRowLayout.events?.[0]?.nodes?.find(n => n.type === 'eval');
            if (evalNode) {
                evalNode.params.exp = `f.selected_evidence = "${itemId}"`;
            }
            
            const nameTextLayout = newRowLayout.objects?.find(child => child.name === 'item_name');
            if (nameTextLayout) nameTextLayout.text = itemData.name || 'Unknown';
            
            // --- 2. BaseGameSceneの機能でオブジェクトを生成・初期化 ---
            const newRow = this.scene.createObjectFromLayout(newRowLayout);
            if (newRow) {
                this.scene.applyProperties(newRow, newRowLayout);
                this.scene.initComponentsAndEvents(newRow);

                // --- 3. 最後にコンテナに追加 ---
                this.listContainer.add(newRow); // ★ Container なので .add() が使える！
                yPos += newRowLayout.height || 60;
            }
        });
    }

    destroy() {
        this.scene.events.off('scene-ready', this.buildList, this);
        // ★ 自分が作ったContainerも、責任を持って破棄する
        if (this.listContainer) {
            this.listContainer.destroy();
        }
    }
}