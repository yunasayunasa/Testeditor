// src/components/ui/DynamicListComponent.js (最終完成形)

export default class DynamicListComponent {

    constructor(scene, gameObject, params) {
        this.scene = scene;
        this.placeholder = gameObject; // リストの表示位置を決めるための「目印」
        
        this.dataSourceVariable = params.dataSource;
        this.templatePrefabKey = params.template;
        this.masterDataKey = params.masterData;

        this.stateManager = this.scene.registry.get('stateManager');
        this.listContainer = null; // コンテナは buildList の中で一度だけ作る

        // 全てのオブジェクトの初期化が終わった、次のフレームで buildList を実行する
        // これが最も安全で確実なタイミング
        this.scene.time.delayedCall(0, this.buildList, [], this);
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

        // 目印オブジェクトの位置に、リストの本体となるContainerを「一度だけ」生成する
        this.listContainer = this.scene.add.container(this.placeholder.x, this.placeholder.y);
        
        const itemIds = this.stateManager.getValue(this.dataSourceVariable) || [];
        const templateData = this.scene.cache.json.get(this.templatePrefabKey);
        const masterData = this.masterDataKey ? this.scene.cache.json.get(this.masterDataKey) : null;
        
        let yPos = 0;

        itemIds.forEach(itemId => {
            const itemData = masterData ? masterData[itemId] : { id: itemId };
            
            const newRowLayout = JSON.parse(JSON.stringify(templateData));
            newRowLayout.name = `row_${itemId}`;
            newRowLayout.x = 0; // コンテナ内での相対X座標
            newRowLayout.y = yPos; // コンテナ内での相対Y座標

            const setVarNode = newRowLayout.events?.[0]?.nodes?.find(n => n.type === 'set_variable');
            if (setVarNode) {
                setVarNode.params.value = `"${itemId}"`;
            }
            
            const nameTextLayout = newRowLayout.objects?.find(child => child.name === 'item_name');
            if (nameTextLayout) nameTextLayout.text = itemData.name || 'Unknown';
            
            // BaseGameSceneの機能を使って、レイアウトからオブジェクトを完全に生成・初期化
            const newRow = this.scene.createObjectFromLayout(newRowLayout);
            if (newRow) {
                this.scene.applyProperties(newRow, newRowLayout);
                this.scene.initComponentsAndEvents(newRow);

                // 生成した行を、Containerに追加する
                this.listContainer.add(newRow);
                yPos += newRowLayout.height || 60;
            }
        });
    }

    destroy() {
        // 自分が作ったContainerも、責任を持って破棄する
        if (this.listContainer) {
            this.listContainer.destroy();
        }
    }
}