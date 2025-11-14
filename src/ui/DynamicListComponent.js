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
    
  buildList() {
    console.groupCollapsed('%c[LOG BOMB] DynamicListComponent.buildList() Called', 'background: #222; color: #ff4081;');
    
    if (!this.dataSourceVariable) console.error('BOMB INFO: dataSourceVariable is missing!');
    if (!this.templatePrefabKey) console.error('BOMB INFO: templatePrefabKey is missing!');
    if (!this.stateManager) console.error('BOMB INFO: stateManager is missing!');
    
    const itemIds = this.stateManager.getValue(this.dataSourceVariable) || [];
    console.log('BOMB INFO: Found Item IDs:', itemIds);

    const templateData = this.scene.cache.json.get(this.templatePrefabKey);
    console.log('BOMB INFO: Loaded Template Prefab Data:', templateData);

    const masterData = this.masterDataKey ? this.scene.cache.json.get(this.masterDataKey) : null;
    console.log('BOMB INFO: Loaded Master Data:', masterData);

    if (itemIds.length === 0) {
        console.warn('BOMB INFO: Item IDs array is empty. Nothing to build.');
        console.groupEnd();
        return;
    }
    
    let yPos = 0;

    itemIds.forEach(itemId => {
        console.log(`%c--> Processing item: ${itemId}`, 'color: #ff4081;');
        const itemData = masterData ? masterData[itemId] : null;
        if (!itemData) {
            console.error(`BOMB INFO: Data for item '${itemId}' not found in masterData!`);
            return; // continue forEach
        }
        console.log('BOMB INFO: Found data in master:', itemData);

        const newRowLayout = JSON.parse(JSON.stringify(templateData));
        newRowLayout.name = `row_${itemId}`;
        newRowLayout.x = 0;
        newRowLayout.y = yPos;

        const nameTextLayout = newRowLayout.objects?.find(child => child.name === 'item_name');
        if (nameTextLayout) {
            nameTextLayout.text = itemData.name;
            console.log(`BOMB INFO: Set text to: "${itemData.name}"`);
        }
        
        console.log('BOMB INFO: Final layout for this row:', newRowLayout);
        const newRow = this.scene.createObjectFromLayout(newRowLayout);
        
        if (newRow) {
            console.log('BOMB INFO: createObjectFromLayout SUCCESS. Created:', newRow);
            this.scene.applyProperties(newRow, newRowLayout);
            this.scene.initComponentsAndEvents(newRow);
            this.listContainer.add(newRow);
            yPos += newRowLayout.height || 60;
            console.log('%cBOMB INFO: Row added to container successfully!', 'color: lightgreen;');
        } else {
            console.error('BOMB INFO: createObjectFromLayout FAILED!');
        }
    });
    console.groupEnd();
}

    destroy() {
       
        // ★ 自分が作ったContainerも、責任を持って破棄する
        if (this.listContainer) {
            this.listContainer.destroy();
        }
    }
}