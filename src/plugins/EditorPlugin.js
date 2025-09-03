export default class EditorPlugin extends Phaser.Plugins.BasePlugin {
    constructor(pluginManager) {
        super(pluginManager);
        this.selectedObject = null;
        this.editableObjects = new Map();
        this.isEnabled = false;
        this.editorUI = null;
        
        this.editorPanel = null;
        this.editorTitle = null;
        this.editorPropsContainer = null;
        this.animEditorOverlay = null;
        this.animEditorCloseBtn = null;
        this.eventEditorOverlay = null;
        this.eventEditorCloseBtn = null;
    }

    init() {
        const currentURL = window.location.href;
        if (!currentURL.includes('?debug=true') && !currentURL.includes('&debug=true')) return;
        this.isEnabled = true;

        // ★★★ editor-props-container への参照を修正 ★★★
        this.editorPanel = document.getElementById('editor-panel');
        this.editorTitle = document.getElementById('editor-title');
        this.editorPropsContainer = document.getElementById('editor-props'); // ← IDを修正
        
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

    // ★★★ 重複していた setUI メソッドは削除し、こちらに統一 ★★★
    setUI(editorUI) {
        this.editorUI = editorUI;
        const addButton = document.getElementById('add-asset-button');
        if (addButton && this.editorUI) {
            addButton.addEventListener('click', () => {
                this.editorUI.onAddButtonClicked();
            });
        }
    }

    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★★★ ここからが新しいカメラコントロールの「実行」部分 ★★★
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

    /**
     * 指定されたポインター座標にあるカメラをズームさせる
     * @param {Phaser.Input.Pointer} pointer - マウス/タッチのポインター
     * @param {number} scrollY - マウスホイールの移動量
     */
    zoomCamera(pointer, scrollY) {
        if (!this.isEnabled) return;
        
        // ポインターの位置にあるシーンのメインカメラを探す
        const camera = this.findCameraAt(pointer);
        if (camera) {
            const zoomAmount = scrollY > 0 ? -0.1 : 0.1;
            const newZoom = Phaser.Math.Clamp(camera.zoom + zoomAmount, 0.2, 5);
            camera.setZoom(newZoom);
        }
    }

    /**
     * 指定されたポインターの移動量でカメラをパンさせる
     * @param {Phaser.Input.Pointer} pointer - マウス/タッチのポインター
     */
    panCamera(pointer) {
        if (!this.isEnabled || !pointer.prevPosition) return;

        const camera = this.findCameraAt(pointer);
        if (camera) {
            const dx = (pointer.x - pointer.prevPosition.x) / camera.zoom;
            const dy = (pointer.y - pointer.prevPosition.y) / camera.zoom;
            camera.scrollX -= dx;
            camera.scrollY -= dy;
        }
    }

    /**
     * 2本の指によるピンチ操作でカメラをズームさせる
     * @param {Phaser.Input.Pointer} p1 - 1本目の指
     * @param {Phaser.Input.Pointer} p2 - 2本目の指
     * @param {number} prevDistance - 前のフレームでの2本指の距離
     */
    pinchZoomCamera(p1, p2, prevDistance) {
        if (!this.isEnabled) return 0;
        
        const camera = this.findCameraAt(p1); // どちらか一方で良い
        if (camera) {
            const currentDistance = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
            const newZoom = camera.zoom * (currentDistance / prevDistance);
            camera.setZoom(Phaser.Math.Clamp(newZoom, 0.2, 5));
            return currentDistance;
        }
        return prevDistance;
    }

    /**
     * 2本の指によるドラッグでカメラをパンさせる
     * @param {Phaser.Input.Pointer} p1 - 1本目の指
     * @param {Phaser.Input.Pointer} p2 - 2本目の指
     * @param {Phaser.Math.Vector2} prevCenter - 前のフレームでの2本指の中心点
     */
    pinchPanCamera(p1, p2, prevCenter) {
        if (!this.isEnabled) return null;

        const camera = this.findCameraAt(p1);
        if (camera) {
            const currentCenter = new Phaser.Math.Vector2((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
            const dx = (currentCenter.x - prevCenter.x) / camera.zoom;
            const dy = (currentCenter.y - prevCenter.y) / camera.zoom;
            camera.scrollX -= dx;
            camera.scrollY -= dy;
            return currentCenter;
        }
        return prevCenter;
    }

    /**
     * 指定されたポインター座標にあるシーンのカメラを見つける
     */
    findCameraAt(pointer) {
        // 現在アクティブな全シーンをループして、ポインターがカメラの表示範囲内にあるかチェック
        const scenes = this.pluginManager.game.scene.getScenes(true);
        for (const scene of scenes) {
            if (scene.cameras && scene.cameras.main && scene.cameras.main.worldView.contains(pointer.x, pointer.y)) {
                // UISceneやSystemSceneはカメラ操作の対象外
                const key = scene.scene.key;
                if (key !== 'UIScene' && key !== 'SystemScene') {
                    return scene.cameras.main;
                }
            }
        }
        return null;
    }
     updatePropertyPanel() {
        if (!this.isEnabled) return;
        if (!this.editorPanel || !this.editorPropsContainer || !this.editorTitle) return;
        this.editorPropsContainer.innerHTML = '';
        if (!this.selectedObject) {
            this.editorTitle.innerText = 'No Object Selected';
            return;
        }
        this.editorTitle.innerText = `Editing: ${this.selectedObject.name}`;

        // Name
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
        nameRow.append(nameLabel, nameInput);
        this.editorPropsContainer.appendChild(nameRow);
        this.editorPropsContainer.appendChild(document.createElement('hr'));

        // Transform
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
            row.append(label, input);
            this.editorPropsContainer.appendChild(row);
        }

        // Depth
        const depthRow = document.createElement('div');
        const depthLabel = document.createElement('label');
        depthLabel.innerText = 'depth:';
        const depthInput = document.createElement('input');
        depthInput.type = 'number';
        depthInput.step = 1;
        depthInput.value = this.selectedObject.depth;
        depthInput.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val) && this.selectedObject) {
                this.selectedObject.setDepth(val);
            }
        });
        depthRow.append(depthLabel, depthInput);
        this.editorPropsContainer.appendChild(depthRow);

        // Physics
        this.editorPropsContainer.appendChild(document.createElement('hr'));
        const physicsTitle = document.createElement('div');
        physicsTitle.innerText = '物理ボディ';
        physicsTitle.style.fontWeight = 'bold';
        physicsTitle.style.marginBottom = '10px';
        this.editorPropsContainer.appendChild(physicsTitle);

        if (this.selectedObject.body) {
            this.createPhysicsPropertiesUI(this.selectedObject);
            const removeButton = document.createElement('button');
            removeButton.innerText = '物理ボディ 削除';
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
            const addButton = document.createElement('button');
            addButton.innerText = '物理ボディ 付与';
            addButton.onclick = () => {
                if (this.selectedObject) {
                    const targetScene = this.selectedObject.scene;
                    targetScene.physics.add.existing(this.selectedObject, false);
                    if (this.selectedObject.body) {
                        this.selectedObject.body.allowGravity = false;
                        this.selectedObject.body.collideWorldBounds = true;
                    }
                    this.updatePropertyPanel();
                }
            };
            this.editorPropsContainer.appendChild(addButton);
        }

        // Animation
        this.editorPropsContainer.appendChild(document.createElement('hr'));
        const animTitle = document.createElement('div');
        animTitle.innerText = 'スプライトシート';
        animTitle.style.fontWeight = 'bold';
        animTitle.style.marginBottom = '10px';
        this.editorPropsContainer.appendChild(animTitle);

        const openAnimEditorBtn = document.createElement('button');
        openAnimEditorBtn.innerText = 'アニメーション設定';
        openAnimEditorBtn.onclick = () => this.openAnimationEditor();
        this.editorPropsContainer.appendChild(openAnimEditorBtn);

        // Events
        this.editorPropsContainer.appendChild(document.createElement('hr'));
        const eventsTitle = document.createElement('div');
        eventsTitle.innerText = 'ロジック';
        eventsTitle.style.fontWeight = 'bold';
        eventsTitle.style.marginBottom = '10px';
        this.editorPropsContainer.appendChild(eventsTitle);

        const openEventEditorBtn = document.createElement('button');
        openEventEditorBtn.innerText = 'イベント・エディタを開く';
        openEventEditorBtn.onclick = () => this.openEventEditor();
        this.editorPropsContainer.appendChild(openEventEditorBtn);
        
        // Export
        this.editorPropsContainer.appendChild(document.createElement('hr'));
        const exportButton = document.createElement('button');
        exportButton.innerText = 'エクスポート レイアウト (to Console)';
        exportButton.addEventListener('click', () => this.exportLayoutToJson());
        this.editorPropsContainer.appendChild(exportButton);
        
        // Delete
        this.editorPropsContainer.appendChild(document.createElement('hr'));
        const deleteButton = document.createElement('button');
        deleteButton.innerText = 'オブジェクト 削除';
        deleteButton.style.backgroundColor = '#e65151';
        deleteButton.style.marginTop = '10px';
        deleteButton.addEventListener('click', () => {
            if (this.selectedObject && this.selectedObject.scene && confirm(`本当に '${this.selectedObject.name}' を削除しますか？`)) {
                const targetObject = this.selectedObject;
                const sceneKey = targetObject.scene.scene.key;
                if (this.editableObjects.has(sceneKey)) {
                    this.editableObjects.get(sceneKey).delete(targetObject);
                }
                targetObject.destroy();
                this.selectedObject = null;
                this.updatePropertyPanel();
                console.log(`[EditorPlugin] Object '${targetObject.name}' has been deleted.`);
            }
        });
        this.editorPropsContainer.appendChild(deleteButton);
    }
    

   

    openAnimationEditor() {
        if (!this.animEditorOverlay) return;
        if (!this.selectedObject) {
            alert('先にオブジェクトを選択してください。');
            return;
        }

        this.pluginManager.game.input.enabled = false;
        console.log("[EditorPlugin] Phaser input disabled for modal window.");

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
                key: animKey,
                frames: frames,
                frameRate: frameRate,
                repeat: repeat
            });

            console.log(`[EditorPlugin] Animation created: '${animKey}'`);
            this.openAnimationEditor();
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
            if (!anim.frames || anim.frames.length === 0) return;
            const animTextureKey = anim.frames[0].textureKey;
            if (animTextureKey !== currentTextureKey) return;

            const div = document.createElement('div');
            div.style.marginBottom = '5px';
            div.style.display = 'flex';
            div.style.alignItems = 'center';

            const infoSpan = document.createElement('span');
            infoSpan.innerText = `キー: ${anim.key}, フレームレート: ${anim.frameRate}`;
            infoSpan.style.marginRight = '10px';

            const playBtn = document.createElement('button');
            playBtn.innerText = '再生';
            playBtn.onclick = () => {
                if (this.selectedObject && typeof this.selectedObject.play === 'function') {
                    this.selectedObject.play(anim.key);
                }
            };

            const stopBtn = document.createElement('button');
            stopBtn.innerText = '停止';
            stopBtn.onclick = () => {
                if (this.selectedObject && typeof this.selectedObject.stop === 'function') {
                    this.selectedObject.stop();
                }
            };

            const setDefaultBtn = document.createElement('button');
            setDefaultBtn.innerText = 'デフォルトに設定';
            setDefaultBtn.onclick = () => {
                if (this.selectedObject) {
                    this.selectedObject.data.values.animation_data.default = anim.key;
                    console.log(`[EditorPlugin] '${anim.key}' set as default animation.`);
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
                for (let i = start; i <= end; i++) {
                    frames.push(i);
                }
            } else {
                frames.push(Number(part));
            }
        }
        return frames;
    }

    convertImageToSprite() {
        if (!this.selectedObject || !(this.selectedObject instanceof Phaser.GameObjects.Image)) {
            console.warn("[EditorPlugin] Convert failed: No valid Image selected.");
            return;
        }

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
        newSprite.setData('animation_data', { default: null, definitions: [] });
        newSprite.name = properties.name;
        newSprite.setScale(properties.scaleX, properties.scaleY);
        newSprite.setAngle(properties.angle);
        newSprite.setAlpha(properties.alpha);
        newSprite.setVisible(properties.visible);
        newSprite.setDepth(properties.depth);

        this.makeEditable(newSprite, scene);
        this.selectedObject = newSprite;

        console.log(`[EditorPlugin] Object '${properties.name}' has been converted to a Sprite.`);
        this.openAnimationEditor();
    }

    closeAnimationEditor() {
        if (!this.animEditorOverlay) return;
        this.animEditorOverlay.style.display = 'none';
        this.pluginManager.game.input.enabled = true;
        console.log("[EditorPlugin] Phaser input re-enabled.");
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
            event.stopPropagation();
        });
        
        gameObject.on('drag', (pointer, dragX, dragY) => {
            gameObject.x = Math.round(dragX);
            gameObject.y = Math.round(dragY);
            if (gameObject.body && (gameObject.body instanceof Phaser.Physics.Arcade.StaticBody)) {
                gameObject.body.reset(gameObject.x, gameObject.y);
            }
            if(this.selectedObject === gameObject) this.updatePropertyPanel();
        });

        gameObject.on('pointerover', () => gameObject.setTint(0x00ff00));
        gameObject.on('pointerout', () => gameObject.clearTint());
        gameObject.setData('isEditable', true);
    }

   
    
    createPhysicsPropertiesUI(gameObject) {
        const body = gameObject.body;
        const isCurrentlyStatic = (body instanceof Phaser.Physics.Arcade.StaticBody);

        this.createCheckbox(this.editorPropsContainer, 'Is Static Body', isCurrentlyStatic, (isChecked) => {
            if (this.selectedObject && this.selectedObject.body) {
                const targetScene = this.selectedObject.scene;
                const world = targetScene.physics.world;
                world.remove(this.selectedObject.body);
                this.selectedObject.body = null;
                targetScene.physics.add.existing(this.selectedObject, isChecked);
                if (this.selectedObject.body) {
                    const newBodyIsStatic = (this.selectedObject.body instanceof Phaser.Physics.Arcade.StaticBody);
                    console.log(`%c[BODY CHANGED] Object: '${this.selectedObject.name}', New Body is Static? -> ${newBodyIsStatic}`, 'color: cyan; font-weight: bold;');
                    this.selectedObject.body.collideWorldBounds = true;
                }
                this.updatePropertyPanel();
            }
        });

        if (!isCurrentlyStatic) {
            this.createVector2Input(this.editorPropsContainer, 'Size', { x: body.width, y: body.height }, (x, y) => body.setSize(x, y));
            this.createVector2Input(this.editorPropsContainer, 'Offset', { x: body.offset.x, y: body.offset.y }, (x, y) => body.setOffset(x, y));
            this.createCheckbox(this.editorPropsContainer, 'Allow Gravity', body.allowGravity, (value) => { if(body) body.allowGravity = value; });
            this.createRangeInput(this.editorPropsContainer, 'Bounce X', body.bounce.x, 0, 1, 0.01, (value) => { if(body) body.bounce.x = value; });
            this.createRangeInput(this.editorPropsContainer, 'Bounce Y', body.bounce.y, 0, 1, 0.01, (value) => { if(body) body.bounce.y = value; });
        }
        
        this.createCheckbox(this.editorPropsContainer, 'Collide World Bounds', body.collideWorldBounds, (value) => { if(body) body.collideWorldBounds = value; });
    }

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
        row.append(labelEl, ' X: ', inputX, ' Y: ', inputY);
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
        row.append(labelEl, checkbox);
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
        row.append(labelEl, slider, valueEl);
        container.appendChild(row);
    }

      /**
     * 指定されたポインター座標にあるカメラをズームさせる
     */
    zoomCamera(pointer, deltaY) {
        if (!this.isEnabled) return;
        const camera = this.findCameraAt(pointer);
        if (camera) {
            const newZoom = Phaser.Math.Clamp(camera.zoom - deltaY * 0.001, 0.2, 5);
            camera.setZoom(newZoom);
        }
    }

    /**
     * 指定されたポインターの移動量でカメラをパンさせる
     */
    panCamera(pointer) {
        if (!this.isEnabled) return;
        const camera = this.findCameraAt(pointer);
        if (camera) {
            camera.scrollX -= (pointer.x - pointer.prevPosition.x) / camera.zoom;
            camera.scrollY -= (pointer.y - pointer.prevPosition.y) / camera.zoom;
        }
    }
    
    /**
     * 指定されたポインター座標にあるシーンのカメラを見つける
     */
    findCameraAt(pointer) {
        return this.pluginManager.game.scene.getScenes(true)
            .find(scene => scene.cameras.main.worldView.contains(pointer.x, pointer.y))
            ?.cameras.main;
    }

    exportLayoutToJson() {
        if (!this.isEnabled || !this.selectedObject || !this.selectedObject.scene) {
            alert("オブジェクトを選択してからエクスポートしてください。");
            return;
        }
        const targetScene = this.selectedObject.scene;
        const sceneKey = targetScene.scene.key;
        
        const sceneLayoutData = {
            objects: [],
            animations: []
        };

        if (this.editableObjects.has(sceneKey)) {
            for (const gameObject of this.editableObjects.get(sceneKey)) {
                if (!gameObject.name) continue;

                const objData = {
                    name: gameObject.name, x: Math.round(gameObject.x), y: Math.round(gameObject.y),
                    scaleX: parseFloat(gameObject.scaleX.toFixed(2)), scaleY: parseFloat(gameObject.scaleY.toFixed(2)),
                    angle: Math.round(gameObject.angle), alpha: parseFloat(gameObject.alpha.toFixed(2))
                };
                
                if (gameObject instanceof Phaser.GameObjects.Sprite) objData.type = 'Sprite';
                if (gameObject.texture && gameObject.texture.key !== '__DEFAULT') objData.texture = gameObject.texture.key;

                if (gameObject.body) {
                    const body = gameObject.body;
                    objData.physics = {
                        isStatic: (body instanceof Phaser.Physics.Arcade.StaticBody), width: body.width, height: body.height,
                        offsetX: body.offset.x, offsetY: body.offset.y, allowGravity: body.allowGravity,
                        bounceX: parseFloat(body.bounce.x.toFixed(2)), bounceY: parseFloat(body.bounce.y.toFixed(2)),
                        collideWorldBounds: body.collideWorldBounds
                    };
                }

                if (gameObject.getData('animation_data')) objData.animation = gameObject.getData('animation_data');
                if (gameObject.getData('events')) objData.events = gameObject.getData('events');
                
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
                .map(anim => {
                    let frames;
                    if (anim.generateFrameNumbers) {
                        frames = { start: anim.frames[0].frame, end: anim.frames[anim.frames.length - 1].frame };
                    } else {
                        frames = anim.frames.map(f => f.index);
                    }
                    return {
                        key: anim.key, texture: anim.frames[0].textureKey, frames: frames,
                        frameRate: anim.frameRate, repeat: anim.repeat
                    };
                });
        }

        const jsonString = JSON.stringify(sceneLayoutData, null, 2);
        console.log(`%c--- Layout for [${sceneKey}] ---`, "color: lightgreen;");
        console.log(jsonString);
        navigator.clipboard.writeText(jsonString).then(() => alert('Layout for ' + sceneKey + ' copied to clipboard!'));
    }

    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★★★ 最新版のイベント関連メソッド群をここに配置 ★★★
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

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
        addButton.style.marginTop = '10px';
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
        div.style.backgroundColor = '#333';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '8px';
        
        const triggerContainer = document.createElement('div');
        const triggerLabel = document.createElement('label');
        triggerLabel.innerText = 'トリガー: ';
        const triggerSelect = document.createElement('select');
        ['onClick', 'onHover', 'onKeyPress'].forEach(t => {
            const option = document.createElement('option');
            option.value = t; option.innerText = t;
            if (t === eventData.trigger) option.selected = true;
            triggerSelect.appendChild(option);
        });
        triggerSelect.onchange = (e) => this.updateEventData(index, 'trigger', e.target.value);
        triggerContainer.append(triggerLabel, triggerSelect);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerText = '削除';
        deleteBtn.style.backgroundColor = '#c44';
        deleteBtn.onclick = () => {
            if (confirm('このイベントを削除しますか？')) {
                const events = this.selectedObject.getData('events');
                events.splice(index, 1);
                this.selectedObject.setData('events', events);
                this.populateEventEditor();
            }
        };
        header.append(triggerContainer, deleteBtn);
        
        const actionsContainer = document.createElement('div');
        const actionsLabel = document.createElement('label');
        actionsLabel.innerText = 'アクション (タグ形式):';
        actionsLabel.style.display = 'block';
        actionsLabel.style.marginBottom = '4px';
        const actionsTextarea = document.createElement('textarea');
        actionsTextarea.style.width = '98%';
        actionsTextarea.style.minHeight = '80px';
        actionsTextarea.style.resize = 'vertical';
        actionsTextarea.value = eventData.actions;
        actionsTextarea.onchange = (e) => this.updateEventData(index, 'actions', e.target.value);
        actionsContainer.append(actionsLabel, actionsTextarea);
        
        div.append(header, actionsContainer);
        return div;
    }

    updateEventData(index, key, value) {
        if (!this.selectedObject) return;
        const events = this.selectedObject.getData('events') || [];
        if (events[index]) {
            events[index][key] = value;
            this.selectedObject.setData('events', events);
        }
    }
}
