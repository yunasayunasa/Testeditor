
/**
 * Odyssey EngineのインゲームIDE機能を提供するPhaserプラグイン。
 * オブジェクトの選択、プロパティ編集、レイアウトのエクスポート機能などを管理する。
 */
export default class EditorPlugin extends Phaser.Plugins.BasePlugin {
    constructor(pluginManager) {
        super(pluginManager);
        this.selectedObject = null;
        this.editableObjects = new Map();
        this.isEnabled = false;
        this.editorUI = null;
        
        // DOM要素の参照
        this.editorPanel = null;
        this.editorTitle = null;
        this.editorPropsContainer = null;
        this.animEditorOverlay = null;
        this.animEditorCloseBtn = null;
        this.eventEditorOverlay = null;
        this.eventEditorCloseBtn = null;

        // UI更新処理の無限再帰呼び出しを防ぐためのフラグ
        this._isUpdatingPanel = false;
    }

    init() {
        // デバッグモードでなければ即時終了
        const currentURL = window.location.href;
        if (!currentURL.includes('debug=true')) return;
        this.isEnabled = true;

        // DOM要素を取得
        this.editorPanel = document.getElementById('editor-panel');
        this.editorTitle = document.getElementById('editor-title');
        this.editorPropsContainer = document.getElementById('editor-props');
        
        this.animEditorOverlay = document.getElementById('anim-editor-overlay');
        this.animEditorCloseBtn = document.getElementById('animation-editor-close-btn');
        if (this.animEditorCloseBtn) {
            this.animEditorCloseBtn.addEventListener('click', () => this.closeAnimationEditor());
        }
        
        this.eventEditorOverlay = document.getElementById('event-editor-overlay');
        this.eventEditorCloseBtn = document.getElementById('event-editor-close-btn');
        if (this.eventEditorCloseBtn) {
            this.eventEditorCloseBtn.addEventListener('click', () => this.closeEventEditor());
        }

        console.warn("[EditorPlugin] Debug mode activated.");
    }
     
    setUI(editorUI) {
        this.editorUI = editorUI;
        const addButton = document.getElementById('add-asset-button');
        if (addButton && this.editorUI) {
            addButton.addEventListener('click', () => {
                this.editorUI.onAddButtonClicked();
            });
        }
    }

    panCamera(dx, dy) {
        if (!this.isEnabled) return;
        const camera = this.getActiveGameCamera();
        if (camera) {
            camera.scrollX += dx / camera.zoom;
            camera.scrollY += dy / camera.zoom;
        }
    }

    zoomCamera(amount) {
        if (!this.isEnabled) return;
        const camera = this.getActiveGameCamera();
        if (camera) {
            const newZoom = Phaser.Math.Clamp(camera.zoom + amount, 0.2, 5);
            camera.setZoom(newZoom);
        }
    }

    resetCamera() {
        if (!this.isEnabled) return;
        const camera = this.getActiveGameCamera();
        if (camera) {
            camera.setZoom(1);
            camera.centerOn(camera.width / 2, camera.height / 2);
        }
    }

    getActiveGameCamera() {
        const scenes = this.pluginManager.game.scene.getScenes(true);
        for (const scene of scenes) {
            const key = scene.scene.key;
            if (key !== 'GameScene' && key !== 'UIScene' && key !== 'SystemScene') {
                return scene.cameras.main;
            }
        }
        return null;
    }

    /**
     * プロパティパネルのUIを、現在選択中のオブジェクトに基づいて再構築する。
     * このメソッドがUIを更新する唯一の公式なエントリーポイントとなる。
       /**
     * プロパティパネルを安全に更新する。
     */
    updatePropertyPanel() {
        if (this._isUpdatingPanel) return;
        this._isUpdatingPanel = true;

        try {
            // ▼▼▼▼▼ 【最重要修正】オブジェクトの生存確認 ▼▼▼▼▼
            // selectedObjectが破棄されていたら、選択を解除して処理をやり直す
            if (this.selectedObject && !this.selectedObject.scene) {
                console.warn(`[EditorPlugin] Selected object '${this.selectedObject.name}' seems to be destroyed. Deselecting.`);
                this.selectedObject = null;
            }
            // ▲▲▲▲▲ ここまで ▲▲▲▲▲

            if (!this.editorPropsContainer) return;
            this.editorPropsContainer.innerHTML = '';

            if (!this.selectedObject) {
                if (this.editorTitle) this.editorTitle.innerText = 'No Object Selected';
                return;
            }
            
            // これ以降、this.selectedObjectは「生存している」ことが保証される
            if (this.editorTitle) this.editorTitle.innerText = `Editing: ${this.selectedObject.name}`;
            

            this.createNameInput();
            this.createGroupInput();
            this.editorPropsContainer.appendChild(document.createElement('hr'));
            this.createTransformInputs();
            this.createDepthInput();
            this.editorPropsContainer.appendChild(document.createElement('hr'));
            
            const physicsTitle = document.createElement('h4');
            physicsTitle.innerText = '物理ボディ (Matter.js)';
            physicsTitle.style.margin = '10px 0 5px 0';
            this.editorPropsContainer.appendChild(physicsTitle);

            if (this.selectedObject.body) {
                this.createMatterPropertiesUI(this.selectedObject);
                this.createRemoveBodyButton();
            } else {
                this.createAddBodyButton();
            }
            
            this.editorPropsContainer.appendChild(document.createElement('hr'));
            this.createAnimationSection();
            this.editorPropsContainer.appendChild(document.createElement('hr'));
            this.createEventSection();
            this.editorPropsContainer.appendChild(document.createElement('hr'));
            this.createComponentSection();
            this.editorPropsContainer.appendChild(document.createElement('hr'));
            this.createExportButton();
            this.createDeleteObjectButton();

        } catch (error) {
            console.error("[EditorPlugin] Failed to update property panel:", error);
        } finally {
            this._isUpdatingPanel = false;
        }
    }

    // --- `updatePropertyPanel`から呼び出されるUI生成ヘルパーメソッド群 ---

    createNameInput() {
        const row = document.createElement('div');
        const label = document.createElement('label');
        label.innerText = 'Name: ';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = this.selectedObject.name || '';
        input.addEventListener('input', (e) => {
            if (this.selectedObject) this.selectedObject.name = e.target.value;
            this.editorTitle.innerText = `Editing: ${e.target.value}`;
        });
        row.append(label, input);
        this.editorPropsContainer.appendChild(row);
    }

    createGroupInput() {
        const row = document.createElement('div');
        const label = document.createElement('label');
        label.innerText = 'Group: ';
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'e.g., player, floor';
        input.value = this.selectedObject.getData('group') || '';
        input.addEventListener('input', (e) => {
            if (this.selectedObject) {
                this.selectedObject.setData('group', e.target.value);
            }
        });
        row.append(label, input);
        this.editorPropsContainer.appendChild(row);
    }

    createTransformInputs() {
        const properties = { 
            x: {}, y: {}, 
            scaleX: {min:0.1, max:5, step:0.01}, scaleY: {min:0.1, max:5, step:0.01}, 
            angle: {min:-180, max:180, step: 1}, alpha: {min:0, max:1, step:0.01} 
        };
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
            row.append(label, input);
            this.editorPropsContainer.appendChild(row);
        }
    }

    createDepthInput() {
        const row = document.createElement('div');
        const label = document.createElement('label');
        label.innerText = 'depth:';
        const input = document.createElement('input');
        input.type = 'number';
        input.step = 1;
        input.value = this.selectedObject.depth;
        input.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val) && this.selectedObject) {
                this.selectedObject.setDepth(val);
            }
        });
        row.append(label, input);
        this.editorPropsContainer.appendChild(row);
    }

    createAddBodyButton() {
        const addButton = document.createElement('button');
        addButton.innerText = '物理ボディ 付与';
        addButton.onclick = () => {
            if (this.selectedObject) {
                this.selectedObject.scene.matter.add.gameObject(this.selectedObject, { isStatic: false });
                this.selectedObject.setData('shape', 'rectangle');
                setTimeout(() => this.updatePropertyPanel(), 0);
            }
        };
        this.editorPropsContainer.appendChild(addButton);
    }

    createRemoveBodyButton() {
        const removeButton = document.createElement('button');
        removeButton.innerText = '物理ボディ 削除';
        removeButton.style.backgroundColor = '#e65151';
        const targetObject = this.selectedObject;
        removeButton.onclick = () => {
            if (targetObject && targetObject.body) {
                try {
                    targetObject.scene.matter.world.remove(targetObject.body);
                    targetObject.body = null;
                    targetObject.setData('shape', undefined);
                    setTimeout(() => this.updatePropertyPanel(), 0);
                } catch (e) {
                    console.error("物理ボディの削除中にエラーが発生:", e);
                }
            }
        };
        this.editorPropsContainer.appendChild(removeButton);
    }

    createMatterPropertiesUI(gameObject) {
        const body = gameObject.body;
        
        this.createCheckbox(this.editorPropsContainer, 'Is Static', body.isStatic, (isChecked) => {
            gameObject.setStatic(isChecked);
        });

        const currentShape = gameObject.getData('shape') || 'rectangle';
        this.createSelect(this.editorPropsContainer, 'Shape', currentShape, ['rectangle', 'circle'], (newShape) => {
            gameObject.setData('shape', newShape);
            if (newShape === 'circle') {
                const radius = (gameObject.width + gameObject.height) / 4;
                gameObject.setCircle(radius);
            } else {
                gameObject.setRectangle();
            }
            setTimeout(() => this.updatePropertyPanel(), 0);
        });

        this.createRangeInput(this.editorPropsContainer, 'Friction', body.friction, 0, 1, 0.01, (value) => {
            gameObject.setFriction(value);
        });
        this.createRangeInput(this.editorPropsContainer, 'Bounce', body.restitution, 0, 1, 0.01, (value) => {
            gameObject.setBounce(value);
        });
    }

    createAnimationSection() {
        const title = document.createElement('h4');
        title.innerText = 'スプライトシート';
        title.style.margin = '10px 0 5px 0';
        const button = document.createElement('button');
        button.innerText = 'アニメーション設定';
        button.onclick = () => this.openAnimationEditor();
        this.editorPropsContainer.append(title, button);
    }

    createEventSection() {
        const title = document.createElement('h4');
        title.innerText = 'ロジック';
        title.style.margin = '10px 0 5px 0';
        const button = document.createElement('button');
        button.innerText = 'イベント・エディタを開く';
        button.onclick = () => this.openEventEditor();
        this.editorPropsContainer.append(title, button);
    }

    createComponentSection() {
        const title = document.createElement('h4');
        title.innerText = 'Components';
        title.style.margin = '10px 0 5px 0';
        this.editorPropsContainer.appendChild(title);
        
        const attachedComponents = this.selectedObject.getData('components') || [];
        attachedComponents.forEach(comp => {
            const div = document.createElement('div');
            div.innerText = `- ${comp.type}`;
            this.editorPropsContainer.appendChild(div);
        });

        const availableComponents = ['PlayerController'];
        const select = document.createElement('select');
        select.innerHTML = '<option value="">Add Component...</option>';
        availableComponents.forEach(compName => {
            if (!attachedComponents.some(c => c.type === compName)) {
                select.innerHTML += `<option value="${compName}">${compName}</option>`;
            }
        });
        select.onchange = (e) => {
            const compToAdd = e.target.value;
            if (compToAdd && this.selectedObject) {
                const currentComps = this.selectedObject.getData('components') || [];
                const newComponentDef = { type: compToAdd, params: {} };
                currentComps.push(newComponentDef);
                this.selectedObject.setData('components', currentComps);
                
                const targetScene = this.selectedObject.scene;
                if (targetScene && typeof targetScene.addComponent === 'function') {
                    targetScene.addComponent(this.selectedObject, newComponentDef.type, newComponentDef.params);
                }
                this.updatePropertyPanel();
            }
        };
        this.editorPropsContainer.appendChild(select);
    }

    createExportButton() {
        const button = document.createElement('button');
        button.innerText = 'エクスポート レイアウト (to Console)';
        button.style.marginTop = '15px';
        button.addEventListener('click', () => this.exportLayoutToJson());
        this.editorPropsContainer.appendChild(button);
    }

    createDeleteObjectButton() {
        const button = document.createElement('button');
        button.innerText = 'オブジェクト 削除';
        button.style.backgroundColor = '#e65151';
        button.style.marginTop = '10px';
           button.addEventListener('click', () => {
            // ▼▼▼▼▼ 【重要修正】ローカル変数で参照を固める ▼▼▼▼▼
            const objectToDelete = this.selectedObject;
            if (objectToDelete && objectToDelete.scene && confirm(`本当に '${objectToDelete.name}' を削除しますか？`)) {
            // ▲▲▲▲▲ ここまで ▲▲▲▲▲
                const sceneKey = targetObject.scene.scene.key;
                if (this.editableObjects.has(sceneKey)) {
                    this.editableObjects.get(sceneKey).delete(targetObject);
                }
                targetObject.destroy();
                this.selectedObject = null;
                this.updatePropertyPanel();
            }
        });
        this.editorPropsContainer.appendChild(button);
    }

    // --- 汎用UI生成ヘルパー ---

    createCheckbox(container, label, initialValue, callback) {
        const row = document.createElement('div');
        const labelEl = document.createElement('label');
        labelEl.innerText = label + ' ';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = initialValue;
        checkbox.addEventListener('change', () => callback(checkbox.checked));
        row.append(labelEl, checkbox);
        container.appendChild(row);
    }

    createRangeInput(container, label, initialValue, min, max, step, callback) {
        const row = document.createElement('div');
        const labelEl = document.createElement('label');
        labelEl.innerText = label + ' ';
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = initialValue;
        const valueEl = document.createElement('span');
        valueEl.innerText = Number(initialValue).toFixed(2);
        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            valueEl.innerText = value.toFixed(2);
            callback(value);
        });
        row.append(labelEl, slider, valueEl);
        container.appendChild(row);
    }

    createSelect(container, label, initialValue, options, callback) {
        const row = document.createElement('div');
        const labelEl = document.createElement('label');
        labelEl.innerText = label + ' ';
        const select = document.createElement('select');
        options.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt;
            optionEl.innerText = opt.charAt(0).toUpperCase() + opt.slice(1);
            if (opt === initialValue) optionEl.selected = true;
            select.appendChild(optionEl);
        });
        select.addEventListener('change', (e) => callback(e.target.value));
        row.append(labelEl, select);
        container.appendChild(row);
    }

    /**
     * ゲームオブジェクトをエディタで編集可能にする。
     */
    makeEditable(gameObject, scene) {
        if (!this.isEnabled) return;
        const sceneKey = scene.scene.key;
        if (!this.editableObjects.has(sceneKey)) {
            this.editableObjects.set(sceneKey, new Set());
        }
        this.editableObjects.get(sceneKey).add(gameObject);

        if (!gameObject.input) {
            gameObject.setInteractive();
            scene.input.setDraggable(gameObject);
        }

        gameObject.off('pointerdown');
        gameObject.off('drag');
        gameObject.off('pointerover');
        gameObject.off('pointerout');

        gameObject.on('pointerdown', (pointer, localX, localY, event) => {
            if (this.editorUI && this.editorUI.currentMode === 'select') {
                this.selectedObject = gameObject;
                this.updatePropertyPanel();
                event.stopPropagation();
            }
        });

        gameObject.on('drag', (pointer, dragX, dragY) => {
            if (this.editorUI && this.editorUI.currentMode === 'select') {
                gameObject.x = Math.round(dragX);
                gameObject.y = Math.round(dragY);
                if (this.selectedObject === gameObject) {
                    this.updatePropertyPanel();
                }
            }
        });
        
        gameObject.on('pointerover', () => {
             if (this.editorUI && this.editorUI.currentMode === 'select') {
                gameObject.setTint(0x00ff00);
             }
        });
        
        gameObject.on('pointerout', () => gameObject.clearTint());
    }
    
    /**
     * 現在のシーンレイアウトをJSON形式でエクスポートする。
     */
    exportLayoutToJson() {
        if (!this.selectedObject || !this.selectedObject.scene) {
            alert("エクスポートするシーンのオブジェクトを、最低一つ選択してください。");
            return;
        }

        const sceneKey = this.selectedObject.scene.scene.key;
        const sceneLayoutData = { objects: [], animations: [] };
        
        if (this.editableObjects.has(sceneKey)) {
              const liveObjects = Array.from(this.editableObjects.get(sceneKey)).filter(go => go && go.scene);
            for (const gameObject of liveObjects) {
                const objData = {
                    name: gameObject.name,
                    type: (gameObject instanceof Phaser.GameObjects.Sprite) ? 'Sprite' : 'Image',
                    texture: gameObject.texture.key,
                    x: Math.round(gameObject.x),
                    y: Math.round(gameObject.y),
                    depth: gameObject.depth,
                    scaleX: parseFloat(gameObject.scaleX.toFixed(2)),
                    scaleY: parseFloat(gameObject.scaleY.toFixed(2)),
                    angle: Math.round(gameObject.angle),
                    alpha: parseFloat(gameObject.alpha.toFixed(2)),
                };
                
                const group = gameObject.getData('group');
                if (group) objData.group = group;

                if (gameObject.body) {
                    const body = gameObject.body;
                    objData.physics = {
                        isStatic: body.isStatic,
                        shape: gameObject.getData('shape') || 'rectangle',
                        friction: parseFloat(body.friction.toFixed(2)),
                        restitution: parseFloat(body.restitution.toFixed(2)),
                    };
                }
                
                const animData = gameObject.getData('animation_data');
                if (animData) objData.animation = animData;
                
                const events = gameObject.getData('events');
                if (events && events.length > 0) objData.events = events;
                
                const components = gameObject.getData('components');
                if (components && components.length > 0) objData.components = components;
                
                sceneLayoutData.objects.push(objData);
            }
        }
        
        const scene = this.game.scene.getScene(sceneKey);
        if (scene && scene.anims) {
            sceneLayoutData.animations = scene.anims.anims.getArray()
                .filter(anim => {
                    if (!anim.frames[0]) return false;
                    const sceneObjects = this.editableObjects.get(sceneKey);
                    if (!sceneObjects) return false;
                    return Array.from(sceneObjects).some(go => go.texture.key === anim.frames[0].textureKey);
                })
                .map(anim => ({
                    key: anim.key,
                    texture: anim.frames[0].textureKey,
                    frames: { start: anim.frames[0].frame, end: anim.frames[anim.frames.length - 1].frame },
                    frameRate: anim.frameRate,
                    repeat: anim.repeat
                }));
        }

        const jsonString = JSON.stringify(sceneLayoutData, null, 2);
        console.log(`%c--- Layout for [${sceneKey}] ---`, "color: lightgreen;");
        console.log(jsonString);
        navigator.clipboard.writeText(jsonString).then(() => {
            alert(`Layout for ${sceneKey} copied to clipboard!`);
        });
    }

    // --- モーダルウィンドウ関連 ---

    // --- モーダルウィンドウ関連 ---

    openAnimationEditor() {
        if (!this.animEditorOverlay) return;
        if (!this.selectedObject) {
            alert('先にオブジェクトを選択してください。');
            return;
        }

        this.pluginManager.game.input.enabled = false;
        const contentArea = document.getElementById('animation-editor-content');
        contentArea.innerHTML = '';

        const isSprite = (this.selectedObject instanceof Phaser.GameObjects.Sprite);

        if (isSprite) {
            const createForm = this.createAnimationCreationForm();
            contentArea.appendChild(createForm);
            const animList = this.createAnimationList();
            contentArea.appendChild(animList);
        } else {
            const message = document.createElement('p');
            message.innerText = `オブジェクト「${this.selectedObject.name}」はスプライトではないため、アニメーションできません。`;
            const convertButton = document.createElement('button');
            convertButton.innerText = 'スプライトに変換する';
            convertButton.onclick = () => { this.convertImageToSprite(); };
            contentArea.appendChild(message);
            contentArea.appendChild(convertButton);
        }

        const titleElement = document.getElementById('animation-editor-title');
        if (titleElement) {
            titleElement.innerText = `アニメーション編集: ${this.selectedObject.name}`;
        }
        this.animEditorOverlay.style.display = 'flex';
    }

    closeAnimationEditor() {
        if (!this.animEditorOverlay) return;
        this.animEditorOverlay.style.display = 'none';
        this.pluginManager.game.input.enabled = true;
    }

    createAnimationCreationForm() {
        const form = document.createElement('div');
        form.style.border = '1px solid #444';
        form.style.padding = '10px';
        form.style.marginBottom = '15px';

        const title = document.createElement('h4');
        title.innerText = '新しいアニメーションを作成';
        title.style.marginTop = '0';
        form.appendChild(title);

        const animKeyInput = document.createElement('input');
        animKeyInput.type = 'text';
        animKeyInput.placeholder = 'アニメーション名 (例: walk)';

        const framesInput = document.createElement('input');
        framesInput.type = 'text';
        framesInput.placeholder = 'フレーム番号 (例: 0-7 or 0,2,4)';

        const frameRateInput = document.createElement('input');
        frameRateInput.type = 'number';
        frameRateInput.value = 10;
        frameRateInput.placeholder = 'フレームレート';

        const repeatCheckbox = document.createElement('input');
        repeatCheckbox.type = 'checkbox';
        repeatCheckbox.checked = true;
        const repeatLabel = document.createElement('label');
        repeatLabel.innerText = ' ループ再生';
        repeatLabel.appendChild(repeatCheckbox);

        const createBtn = document.createElement('button');
        createBtn.innerText = '作成';
        createBtn.onclick = () => {
            const scene = this.selectedObject.scene;
            const textureKey = this.selectedObject.texture.key;
            const animKey = animKeyInput.value;
            const framesStr = framesInput.value;
            const frameRate = parseInt(frameRateInput.value);
            const repeat = repeatCheckbox.checked ? -1 : 0;

            if (!animKey || !framesStr || !frameRate) {
                alert('全ての項目を入力してください。');
                return;
            }

            const frames = scene.anims.generateFrameNumbers(textureKey, {
                frames: this.parseFrameString(framesStr)
            });

            scene.anims.create({
                key: animKey, frames: frames, frameRate: frameRate, repeat: repeat
            });
            this.openAnimationEditor(); // Refresh editor
        };

        form.append(animKeyInput, framesInput, frameRateInput, repeatLabel, createBtn);
        return form;
    }

    createAnimationList() {
        const container = document.createElement('div');
        const title = document.createElement('h4');
        title.innerText = '登録済みアニメーション';
        container.appendChild(title);

        if (!this.selectedObject || !this.selectedObject.scene) return container;
        const scene = this.selectedObject.scene;
        const currentTextureKey = this.selectedObject.texture.key;
        const allAnims = scene.anims.anims.getArray();

        allAnims.forEach(anim => {
            if (!anim.frames || anim.frames.length === 0 || anim.frames[0].textureKey !== currentTextureKey) return;

            const div = document.createElement('div');
            div.style.marginBottom = '5px';
            div.style.display = 'flex';
            div.style.alignItems = 'center';

            const infoSpan = document.createElement('span');
            infoSpan.innerText = `キー: ${anim.key}`;
            infoSpan.style.marginRight = '10px';

            const playBtn = document.createElement('button');
            playBtn.innerText = '再生';
            playBtn.onclick = () => { if (this.selectedObject.play) this.selectedObject.play(anim.key); };

            const stopBtn = document.createElement('button');
            stopBtn.innerText = '停止';
            stopBtn.onclick = () => { if (this.selectedObject.stop) this.selectedObject.stop(); };

            const setDefaultBtn = document.createElement('button');
            setDefaultBtn.innerText = 'デフォルトに設定';
            setDefaultBtn.onclick = () => {
                if (this.selectedObject) {
                    let animData = this.selectedObject.getData('animation_data') || {};
                    animData.default = anim.key;
                    this.selectedObject.setData('animation_data', animData);
                }
            };

            div.append(infoSpan, playBtn, stopBtn, setDefaultBtn);
            container.appendChild(div);
        });
        return container;
    }

    parseFrameString(str) {
        const parts = str.split(',');
        let frames = [];
        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                for (let i = start; i <= end; i++) frames.push(i);
            } else {
                frames.push(Number(part));
            }
        }
        return frames;
    }

    convertImageToSprite() {
        if (!this.selectedObject || !(this.selectedObject instanceof Phaser.GameObjects.Image)) return;
        const oldImage = this.selectedObject;
        const scene = oldImage.scene;
        const properties = {
            name: oldImage.name, x: oldImage.x, y: oldImage.y, scaleX: oldImage.scaleX,
            scaleY: oldImage.scaleY, angle: oldImage.angle, alpha: oldImage.alpha,
            visible: oldImage.visible, depth: oldImage.depth, texture: oldImage.texture.key
        };
        const sceneKey = scene.scene.key;
        if (this.editableObjects.has(sceneKey)) {
            this.editableObjects.get(sceneKey).delete(oldImage);
        }
        oldImage.destroy();
        const newSprite = scene.add.sprite(properties.x, properties.y, properties.texture);
        Object.assign(newSprite, properties);
        newSprite.setData('animation_data', { default: null });
        this.makeEditable(newSprite, scene);
        this.selectedObject = newSprite;
        this.openAnimationEditor();
    }

    openEventEditor() {
        if (!this.eventEditorOverlay || !this.selectedObject) return;
        this.pluginManager.game.input.enabled = false;
        const titleElement = document.getElementById('event-editor-title');
        if (titleElement) titleElement.innerText = `イベント編集: ${this.selectedObject.name}`;
        this.populateEventEditor();
        this.eventEditorOverlay.style.display = 'flex';
    }

    closeEventEditor() {
        if (!this.eventEditorOverlay) return;
        this.eventEditorOverlay.style.display = 'none';
        this.pluginManager.game.input.enabled = true;
    }
    
    populateEventEditor() {
        const contentArea = document.getElementById('event-editor-content');
        if (!contentArea || !this.selectedObject) return;
        contentArea.innerHTML = '';
        
        const events = this.selectedObject.getData('events') || [];
        events.forEach((eventData, index) => {
            const eventDiv = this.createEventDisplay(eventData, index);
            contentArea.appendChild(eventDiv);
        });
        const addButton = document.createElement('button');
        addButton.innerText = '新しいイベントを追加';
        addButton.onclick = () => {
            const currentEvents = this.selectedObject.getData('events') || [];
            currentEvents.push({ trigger: 'onClick', actions: '' });
            this.selectedObject.setData('events', currentEvents);
            this.populateEventEditor();
        };
        contentArea.appendChild(addButton);
    }
    
    createEventDisplay(eventData, index) {
        const div = document.createElement('div');
        div.style.border = '1px solid #444';
        div.style.padding = '8px';
        div.style.marginBottom = '8px';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';

        const triggerContainer = document.createElement('div');
        const triggerLabel = document.createElement('label');
        triggerLabel.innerText = 'トリガー: ';
        const triggerSelect = document.createElement('select');
        ['onClick', 'onCollide_Start'].forEach(t => {
            const option = document.createElement('option');
            option.value = t; option.innerText = t;
            if (t === eventData.trigger) option.selected = true;
            triggerSelect.appendChild(option);
        });
        triggerSelect.onchange = (e) => this.updateEventData(index, 'trigger', e.target.value);
        triggerContainer.append(triggerLabel, triggerSelect);

        if (eventData.trigger.startsWith('onCollide')) {
            const targetLabel = document.createElement('label');
            targetLabel.innerText = ' 相手のグループ: ';
            const targetInput = document.createElement('input');
            targetInput.type = 'text';
            targetInput.value = eventData.targetGroup || '';
            targetInput.onchange = (e) => this.updateEventData(index, 'targetGroup', e.target.value);
            triggerContainer.append(targetLabel, targetInput);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.innerText = '削除';
        deleteBtn.onclick = () => {
            const events = this.selectedObject.getData('events');
            events.splice(index, 1);
            this.selectedObject.setData('events', events);
            this.populateEventEditor();
        };
        header.append(triggerContainer, deleteBtn);
        
        const actionsLabel = document.createElement('label');
        actionsLabel.innerText = 'アクション (タグ形式):';
        const actionsTextarea = document.createElement('textarea');
        actionsTextarea.style.width = '98%';
        actionsTextarea.value = eventData.actions;
        actionsTextarea.onchange = (e) => this.updateEventData(index, 'actions', e.target.value);
        
        div.append(header, actionsLabel, actionsTextarea);
        return div;
    }
    
    updateEventData(index, key, value) {
        if (!this.selectedObject) return;
        const events = this.selectedObject.getData('events') || [];
        if (events[index]) {
            events[index][key] = value;
            this.selectedObject.setData('events', events);
            this.populateEventEditor();
            
            const targetScene = this.selectedObject.scene;
            if (targetScene && typeof targetScene.onEditorEventChanged === 'function') {
                targetScene.onEditorEventChanged(this.selectedObject);
            }
        }
    }
}