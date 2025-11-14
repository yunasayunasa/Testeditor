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

        
        this.buildList();


    }

    static define = {
        params: [
            { key: 'dataSource', type: 'text', label: 'Data Source (f.)' },
            { key: 'template', type: 'select', options: 'asset:prefab', label: 'Template Prefab' },
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
        
        const newRowLayout = JSON.parse(JSON.stringify(templateData));
        newRowLayout.name = `row_${itemId}`;
        newRowLayout.x = 0;
        newRowLayout.y = yPos;

        // ▼▼▼【このVSL書き換えロジックを復活させる】▼▼▼
        const evalNode = newRowLayout.events?.[0]?.nodes?.find(n => n.type === 'eval');
        if (evalNode) {
            evalNode.params.exp = `f.selected_evidence = "${itemId}"`;
        }
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        const nameTextLayout = newRowLayout.objects?.find(child => child.name === 'item_name');
        if (nameTextLayout) nameTextLayout.text = itemData.name || 'Unknown';
        
        const newRow = this.scene.createObjectFromLayout(newRowLayout);
        if (newRow) {
            this.scene.applyProperties(newRow, newRowLayout);
            this.scene.initComponentsAndEvents(newRow);
            this.listContainer.add(newRow);
            yPos += newRowLayout.height || 60;
        }
    });
}
    destroy() {
       
        // ★ 自分が作ったContainerも、責任を持って破棄する
        if (this.listContainer) {
            this.listContainer.destroy();
        }
    }
}