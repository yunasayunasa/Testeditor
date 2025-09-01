

export default class EditorPlugin extends Phaser.Plugins.BasePlugin {
    constructor(pluginManager) {
        super(pluginManager);
        this.selectedObject = null;
        this.editableObjects = new Map();
        this.editorPanel = document.getElementById('editor-panel');
        this.editorTitle = document.getElementById('editor-title');
        this.editorPropsContainer = document.getElementById('editor-props');
         // ★★★ 変更点1: isEnabledフラグを追加 ★★★
        this.isEnabled = false; 

        // ★★★ 変更点2: HTML要素の取得はinitに移動 ★★★
        this.editorPanel = null;
    }

    /**
     * プラグインが起動する時に、自身が有効になるべきかを最終判断する
     */
    init() {
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが、あなたが求めた最終的な制御ロジックです ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // 1. 最も確実な、原始的なURLチェックを行う
        const currentURL = window.location.href;
        const hasDebugParameter = currentURL.includes('?debug=true') || currentURL.includes('&debug=true');
        
        // 2. もしURLにパラメータがなければ、何もしないで終了
        if (!hasDebugParameter) {
            console.log("[EditorPlugin] Debug parameter not found. Editor remains inactive.");
            return;
        }

        // --- ここから先は、デバッグモードが確定した場合のみ実行される ---
        console.warn("[EditorPlugin] Debug mode activated. Initializing editor...");
        this.isEnabled = true; // 3. 自身を有効化

    
        // 4. HTML要素への参照を取得
        this.editorPanel = document.getElementById('editor-panel');
        this.editorTitle = document.getElementById('editor-title');
        this.editorPropsContainer = document.getElementById('editor-props');

        // 5. EditorUIを起動する
        new EditorUI(this.pluginManager.game, this);
    }

    makeEditable(gameObject, scene) {
          if (!this.isEnabled) return; // ★ 無効なら、何もしない
        if (!gameObject || !scene || gameObject.getData('isEditable') || !gameObject.name) return;
        
        gameObject.setInteractive();
        scene.input.setDraggable(gameObject);

        const sceneKey = scene.scene.key;
        if (!this.editableObjects.has(sceneKey)) {
            this.editableObjects.set(sceneKey, new Set());
        }
        this.editableObjects.get(sceneKey).add(gameObject);

        gameObject.on('pointerdown', () => {
            this.selectedObject = gameObject;
            this.updatePropertyPanel();
        });
        
        gameObject.on('drag', (pointer, dragX, dragY) => {
            gameObject.x = Math.round(dragX);
            gameObject.y = Math.round(dragY);
            if(this.selectedObject === gameObject) this.updatePropertyPanel();
        });

        gameObject.on('pointerover', () => gameObject.setTint(0x00ff00));
        gameObject.on('pointerout', () => gameObject.clearTint());
        gameObject.setData('isEditable', true);
    }

    updatePropertyPanel() {
          if (!this.isEnabled) return; // ★ 無効なら、何もしない
        if (!this.editorPanel || !this.editorPropsContainer || !this.editorTitle) return;
        this.editorPropsContainer.innerHTML = '';
        if (!this.selectedObject) {
            this.editorTitle.innerText = 'No Object Selected';
            return;
        }
        this.editorTitle.innerText = `Editing: ${this.selectedObject.name}`;
        // Nameプロパティ
        const nameRow = document.createElement('div');
        const nameLabel = document.createElement('label');
        nameLabel.innerText = 'Name:';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = this.selectedObject.name || '';
        nameInput.addEventListener('input', (e) => {
            if (this.selectedObject) this.selectedObject.name = e.target.value;
            this.editorTitle.innerText = `Editing: ${e.target.value}`;
        });
        nameRow.appendChild(nameLabel);
        nameRow.appendChild(nameInput);
        this.editorPropsContainer.appendChild(nameRow);
        this.editorPropsContainer.appendChild(document.createElement('hr'));
        // Transformプロパティ
        const properties = { x: {}, y: {}, scaleX: {min:0.1, max:5, step:0.01}, scaleY: {min:0.1, max:5, step:0.01}, angle: {min:-180, max:180}, alpha: {min:0, max:1, step:0.01} };
        for (const key in properties) {
            if (this.selectedObject[key] === undefined) continue;
            const prop = properties[key];
            const row = document.createElement('div');
            const label = document.createElement('label');
            label.innerText = `${key}:`;
            const input = document.createElement('input');
            input.type = (key==='x' || key==='y') ? 'number' : 'range';
            if (prop.min !== undefined) input.min = prop.min;
            if (prop.max !== undefined) input.max = prop.max;
            if (prop.step !== undefined) input.step = prop.step;
            input.value = this.selectedObject[key];
            input.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && this.selectedObject) this.selectedObject[key] = val;
            });
            row.appendChild(label);
            row.appendChild(input);
            this.editorPropsContainer.appendChild(row);
        }
        // Exportボタン
        this.editorPropsContainer.appendChild(document.createElement('hr'));
        const exportButton = document.createElement('button');
        exportButton.innerText = 'Export Layout (to Console)';
        exportButton.addEventListener('click', () => this.exportLayoutToJson());
        this.editorPropsContainer.appendChild(exportButton);
    }

    exportLayoutToJson() {
          if (!this.isEnabled) return; // ★ 無効なら、何もしない
        if (!this.selectedObject || !this.selectedObject.scene) {
            alert("Please select an object in the scene you want to export.");
            return;
        }
        const targetScene = this.selectedObject.scene;
        const sceneKey = targetScene.scene.key;
        const sceneLayoutData = { objects: [] };
        if (this.editableObjects.has(sceneKey)) {
            for (const gameObject of this.editableObjects.get(sceneKey)) {
                if (gameObject.name) {
                    const objData = { name: gameObject.name, x: Math.round(gameObject.x), y: Math.round(gameObject.y), scaleX: parseFloat(gameObject.scaleX.toFixed(2)), scaleY: parseFloat(gameObject.scaleY.toFixed(2)), angle: Math.round(gameObject.angle), alpha: parseFloat(gameObject.alpha.toFixed(2)) };
                    if (gameObject.texture && gameObject.texture.key !== '__DEFAULT') objData.texture = gameObject.texture.key;
                    sceneLayoutData.objects.push(objData);
                }
            }
        }
        const jsonString = JSON.stringify(sceneLayoutData, null, 2);
        console.log(`%c--- Layout for [${sceneKey}] ---`, "color: lightgreen;");
        console.log(jsonString);
        navigator.clipboard.writeText(jsonString).then(() => alert('Layout for ' + sceneKey + ' copied to clipboard!'));
    }
}