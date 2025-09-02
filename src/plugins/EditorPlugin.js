export default class EditorPlugin extends Phaser.Plugins.BasePlugin {
    constructor(pluginManager) {
        super(pluginManager);
        this.selectedObject = null;
        this.editableObjects = new Map();
        this.isEnabled = false;
        this.editorUI = null;
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが、全てを解決する、最後の修正です ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // 1. 存在しないプロパティを削除し、混乱の元を断つ
        // this.this.editorPropsContainer, = document.getElementById('editor-props'); // ← この行を削除

        // 2. 必要な参照だけを残す
        this.editorPanel = null;
        this.editorTitle = null;
        this.editorPropsContainer = null;
    }

    init() {
        const currentURL = window.location.href;
        const hasDebugParameter = currentURL.includes('?debug=true') || currentURL.includes('&debug=true');
        if (!hasDebugParameter) return;

        this.isEnabled = true;
        this.editorPanel = document.getElementById('editor-panel');
        this.editorTitle = document.getElementById('editor-title');
        this.editorPropsContainer = document.getElementById('editor-props');
        console.warn("[EditorPlugin] Debug mode activated.");
    }

    setUI(editorUI) {
        this.editorUI = editorUI;
        const addButton = document.getElementById('add-asset-button');
        if (addButton && this.editorUI) {
            // ★★★ イベントリスナーは、ここに集約 ★★★
            addButton.addEventListener('click', () => {
                this.editorUI.onAddButtonClicked();
            });
        }
    }

    makeEditable(gameObject, scene) {
        if (!this.isEnabled || !gameObject || !scene || gameObject.getData('isEditable') || !gameObject.name) return;
        
        gameObject.setInteractive();
        scene.input.setDraggable(gameObject);

        const sceneKey = scene.scene.key;
        if (!this.editableObjects.has(sceneKey)) {
            this.editableObjects.set(sceneKey, new Set());
        }
        this.editableObjects.get(sceneKey).add(gameObject);

        gameObject.on('pointerdown', (pointer, localX, localY, event) => {
            this.selectedObject = gameObject;
            this.updatePropertyPanel();
            event.stopPropagation(); // 'pointer'ではなく'event'を使う
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
            this.editorPropsContainer.appendChild(document.createElement('hr'));
        const physicsTitle = document.createElement('div');
        physicsTitle.innerText = 'Physics';
        physicsTitle.style.fontWeight = 'bold';
        physicsTitle.style.marginBottom = '10px';
        this.editorPropsContainer.appendChild(physicsTitle);

        const gameObject = this.selectedObject;

        if (gameObject.body) {
            // --- ケースA: 物理ボディを持っている場合 ---
            this.createPhysicsPropertiesUI(gameObject);

            const removeButton = document.createElement('button');
            removeButton.innerText = 'Disable Physics';
            removeButton.style.backgroundColor = '#c44';
            removeButton.style.marginTop = '10px';
            removeButton.onclick = () => {
                if (this.selectedObject && this.selectedObject.body) {
                    this.selectedObject.body.destroy();
                    this.selectedObject.body = null;
                    this.updatePropertyPanel();
                }
            };
            this.editorPropsContainer.appendChild(removeButton);

        } else {
            // --- ケースB: 物理ボディを持っていない場合 ---
            const addButton = document.createElement('button');
            addButton.innerText = 'Enable Arcade Physics';
            addButton.onclick = () => {
                if (this.selectedObject) {
                    const targetScene = this.selectedObject.scene;
                    targetScene.physics.add.existing(this.selectedObject, false); // 動的ボディとして生成
                    if (this.selectedObject.body) {
                        this.selectedObject.body.allowGravity = false;
                        this.selectedObject.body.collideWorldBounds = true;
                    }
                    this.updatePropertyPanel();
                }
            };
            this.editorPropsContainer.appendChild(addButton);
        }
        // Exportボタン
        this.editorPropsContainer.appendChild(document.createElement('hr'));
        const exportButton = document.createElement('button');
        exportButton.innerText = 'Export Layout (to Console)';
        exportButton.addEventListener('click', () => this.exportLayoutToJson());
        this.editorPropsContainer.appendChild(exportButton);
        
        this.editorPropsContainer.appendChild(document.createElement('hr'));

        // --- オブジェクト削除ボタン ---
        const deleteButton = document.createElement('button');
        deleteButton.innerText = 'Delete Object';
        deleteButton.style.backgroundColor = '#e65151'; // 危険な操作なので赤色に
        deleteButton.style.marginTop = '10px';
        
        deleteButton.addEventListener('click', () => {
            // 削除対象のオブジェクトが、まだ存在するかを最終確認
            if (this.selectedObject && this.selectedObject.scene) {

                // ユーザーに最終確認を求める
                if (confirm(`本当に '${this.selectedObject.name}' を削除しますか？`)) {
                    
                    const targetObject = this.selectedObject;
                    const sceneKey = targetObject.scene.scene.key;

                    // 1. まず、プラグインの管理リストからオブジェクトを削除
                    if (this.editableObjects.has(sceneKey)) {
                        this.editableObjects.get(sceneKey).delete(targetObject);
                    }
                    
                    // 2. 次に、Phaserのシーンからオブジェクトを完全に破棄
                    targetObject.destroy();
                    
                    // 3. 最後に、選択を解除し、プロパティパネルを更新
                    this.selectedObject = null;
                    this.updatePropertyPanel();

                    console.log(`[EditorPlugin] Object '${targetObject.name}' has been deleted.`);
                }
            }
        });
        
        this.editorPropsContainer.appendChild(deleteButton);
    }
    
    
    

     /**
     * 物理パラメータを編集するためのUIを生成する
     */
      /**
     * 物理パラメータを編集するためのUIを生成する (最終確定版)
     */
    createPhysicsPropertiesUI(gameObject) {
        const body = gameObject.body;
        
        // ★★★ 4. ヘルパーメソッドに、存在する 'this.editorPropsContainer' を渡す ★★★
        const isStatic = body.isStatic;
        this.createCheckbox(this.editorPropsContainer, 'Is Static Body', isStatic, (isChecked) => {
            if (this.selectedObject) {
                const targetScene = this.selectedObject.scene;
                targetScene.physics.world.remove(this.selectedObject.body);
                targetScene.physics.add.existing(this.selectedObject, isChecked);
                if (this.selectedObject.body) {
                    this.selectedObject.body.collideWorldBounds = true;
                }
                this.updatePropertyPanel();
            }
        });

        const isDynamic = body.moves;
        if (isDynamic) {
            this.createVector2Input(this.editorPropsContainer, 'Size', { x: body.width, y: body.height }, (x, y) => body.setSize(x, y));
            this.createVector2Input(this.editorPropsContainer, 'Offset', { x: body.offset.x, y: body.offset.y }, (x, y) => body.setOffset(x, y));
            this.createCheckbox(this.editorPropsContainer, 'Allow Gravity', body.allowGravity, (value) => { if(body) body.allowGravity = value; });
            this.createRangeInput(this.editorPropsContainer, 'Bounce X', body.bounce.x, 0, 1, 0.01, (value) => { if(body) body.bounce.x = value; });
            this.createRangeInput(this.editorPropsContainer, 'Bounce Y', body.bounce.y, 0, 1, 0.01, (value) => { if(body) body.bounce.y = value; });
        }
        
        this.createCheckbox(this.editorPropsContainer, 'Collide World Bounds', body.collideWorldBounds, (value) => { if(body) body.collideWorldBounds = value; });
    }

    // --- 以下、UI生成ヘルパーメソッド群 ---

    createVector2Input(container, label, initialValue, callback) {
      
        const row = document.createElement('div');
        const labelEl = document.createElement('label');
        labelEl.innerText = `${label}:`;
        const inputX = document.createElement('input');
        inputX.type = 'number';
        inputX.value = initialValue.x.toFixed(0);
        const inputY = document.createElement('input');
        inputY.type = 'number';
        inputY.value = initialValue.y.toFixed(0);
        const updateValues = () => {
            const x = parseFloat(inputX.value);
            const y = parseFloat(inputY.value);
            if (!isNaN(x) && !isNaN(y)) callback(x, y);
        };
        inputX.addEventListener('change', updateValues);
        inputY.addEventListener('change', updateValues);
        row.appendChild(labelEl);
        row.appendChild(document.createTextNode(' X: '));
        row.appendChild(inputX);
        row.appendChild(document.createTextNode(' Y: '));
        row.appendChild(inputY);
        container.appendChild(row);
    }

    createCheckbox(container, label, initialValue, callback) {
  
        const row = document.createElement('div');
        const labelEl = document.createElement('label');
        labelEl.innerText = label;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = initialValue;
        checkbox.addEventListener('change', () => callback(checkbox.checked));
        row.appendChild(labelEl);
        row.appendChild(checkbox);
        container.appendChild(row);
    }

    createRangeInput(container, label, initialValue, min, max, step, callback) {

        const row = document.createElement('div');
        const labelEl = document.createElement('label');
        labelEl.innerText = label;
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = initialValue;
        const valueEl = document.createElement('span');
        valueEl.innerText = initialValue.toFixed(2);
        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            valueEl.innerText = value.toFixed(2);
            callback(value);
        });
        row.appendChild(labelEl);
        row.appendChild(slider);
        row.appendChild(valueEl);
        container.appendChild(row);
    }
   exportLayoutToJson() {
        if (!this.isEnabled || !this.selectedObject || !this.selectedObject.scene) {
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
                    if (gameObject.body) {
                        const body = gameObject.body;
                        objData.physics = { isStatic: body.isStatic, width: body.width, height: body.height, offsetX: body.offset.x, offsetY: body.offset.y, allowGravity: body.allowGravity, bounceX: parseFloat(body.bounce.x.toFixed(2)), bounceY: parseFloat(body.bounce.y.toFixed(2)), collideWorldBounds: body.collideWorldBounds };
                    }
                    // ★★★ pushは一度だけに修正 ★★★
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