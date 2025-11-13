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
        { 
            key: 'template', 
            type: 'select', // ← 'asset_key' ではなく 'select'
            label: 'Template Prefab',
            options: 'asset:prefab' // ← assetType ではなく、options に 'asset:prefab' を指定
        },
        { key: 'masterData', type: 'text', label: 'Master Data Key' }
    ]
};
    
  // in DynamicListComponent.js
buildList() {
    if (!this.dataSourceVariable || !this.templatePrefabKey || !this.stateManager) return;

    const itemIds = this.stateManager.getValue(this.dataSourceVariable) || [];
    const templateData = this.scene.cache.json.get(this.templatePrefabKey);
    const masterData = this.masterDataKey ? this.scene.cache.json.get(this.masterDataKey) : null;
    
    let yPos = 0;

    itemIds.forEach(itemId => {
        const itemData = masterData ? masterData[itemId] : { id: itemId };
        
        // --- 1. テンプレートのレイアウトデータをディープコピー ---
        const newRowLayout = JSON.parse(JSON.stringify(templateData));

        // --- 2. レイアウトデータに必要な情報を注入 ---
        newRowLayout.name = `row_${itemId}`;
        newRowLayout.x = 0;
        newRowLayout.y = yPos;

        // VSLの変数を置き換え
        newRowLayout.events.forEach(event => {
            event.nodes.forEach(node => {
                if (node.params && node.params.exp) {
                    // ★★★ VSLの &{...} 記法が動かなかった場合の安全策 ★★★
                    // 直接、最終的な式を組み立ててしまう
                    node.params.exp = `f.selected_evidence = "${itemId}"`;
                }
            });
        });
        
        // テキストオブジェクトの text プロパティを書き換え
        const nameTextLayout = newRowLayout.objects.find(child => child.name === 'item_name');
        if (nameTextLayout) nameTextLayout.text = itemData.name || 'Unknown';
        
        // --- 3. BaseGameScene の機能を使って、レイアウトからオブジェクトを完全に生成・初期化 ---
        const newRow = this.scene.createObjectFromLayout(newRowLayout);
        if (newRow) {
            this.scene.applyProperties(newRow, newRowLayout);
            this.scene.initComponentsAndEvents(newRow);

            // --- 4. 最後にコンテナに追加 ---
            this.listContainer.add(newRow);
            yPos += newRowLayout.height || 60;
        }
    });
}

    destroy() {
        this.scene.events.off('scene-ready', this.buildList, this);
    }
}