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

      /**
     * ★★★ 新規メソッド ★★★
     * カメラを指定された方向と量だけ移動（パン）させる
     * @param {number} dx - X方向の移動量
     * @param {number} dy - Y方向の移動量
     */
    panCamera(dx, dy) {
        if (!this.isEnabled) return;
        const camera = this.getActiveGameCamera();
        if (camera) {
            // 現在のズームレベルを考慮して移動量を調整
            camera.scrollX += dx / camera.zoom;
            camera.scrollY += dy / camera.zoom;
            console.log(`[EditorPlugin] Panning camera by (${dx}, ${dy})`);
        } else {
            console.warn("[EditorPlugin] No active game camera found for pan.");
        }
    }

    /**
     * 現在アクティブなゲームシーンのカメラを取得する
     * @returns {Phaser.Cameras.Scene2D.Camera | null}
     */
    getActiveGameCamera() {
        const scenes = this.pluginManager.game.scene.getScenes(true);
        for (const scene of scenes) {
            const key = scene.scene.key;
            // GameScene, UIScene, SystemScene 以外を対象とする
            if (key !== 'GameScene' && key !== 'UIScene' && key !== 'SystemScene') {
                return scene.cameras.main;
            }
        }
        return null;
    }

    /**
     * カメラを指定された量だけズームさせる
     * @param {number} amount - ズーム量 (正で拡大, 負で縮小)
     */
      /**
     * カメラを指定された量だけズームさせる (ログ追加版)
     */
    zoomCamera(amount) {
        if (!this.isEnabled) return;
        const camera = this.getActiveGameCamera();
        if (camera) {
            // ★★★ ログを追加して、命令が実行されたか確認 ★★★
            console.log(`[EditorPlugin] Zooming camera by ${amount}. Current zoom: ${camera.zoom}`);
            const newZoom = Phaser.Math.Clamp(camera.zoom + amount, 0.2, 5);
            camera.setZoom(newZoom);
        } else {
            // ★★★ ログを追加して、カメラが見つからなかったことを警告 ★★★
            console.warn("[EditorPlugin] Zoom command received, but no active game camera found.");
        }
    }

    /**
     * カメラの位置とズームを初期状態に戻す
     */
    resetCamera() {
        if (!this.isEnabled) return;
        const camera = this.getActiveGameCamera();
        if (camera) {
            camera.setZoom(1);
            camera.centerOn(camera.width / 2, camera.height / 2);
        }
    }
     /**
     * プロパティパネルを更新する (Matter.js対応・完全版)
     */
    updatePropertyPanel() {
        if (!this.isEnabled || !this.editorPropsContainer) return;
        this.editorPropsContainer.innerHTML = '';
        if (!this.selectedObject) {
            this.editorTitle.innerText = 'No Object Selected';
return;
        }
        this.editorTitle.innerText = `Editing: ${this.selectedObject.name}`;

        // --- Name, Group, Transform, Depth (ヘルパー関数に分離) ---
        this.createNameUI(this.selectedObject);
        this.createGroupUI(this.selectedObject);
        this.editorPropsContainer.appendChild(document.createElement('hr'));
        this.createTransformUI(this.selectedObject);
        this.createDepthUI(this.selectedObject);
        this.editorPropsContainer.appendChild(document.createElement('hr'));

        // --- Physics (Matter.js) ---
        this.createPhysicsSectionUI(this.selectedObject);
        this.editorPropsContainer.appendChild(document.createElement('hr'));
        
        // --- Animation, Events, Components ---
        // (これらは別メソッドに分離すると、さらにコードが綺麗になります)
        this.createAnimationSectionUI(this.selectedObject);
        this.editorPropsContainer.appendChild(document.createElement('hr'));
        this.createEventSectionUI(this.selectedObject);
        this.editorPropsContainer.appendChild(document.createElement('hr'));
        this.createComponentSectionUI(this.selectedObject);
        this.editorPropsContainer.appendChild(document.createElement('hr'));

        // --- Export & Delete ---
        this.createExportButton();
        this.createDeleteButton();
    }
    
    /**
     * ★★★ 新規メソッド：Matter.js用のプロパティUIを生成する ★★★
     */
    createMatterPropertiesUI(gameObject) {
        const body = gameObject.body;

        // isStatic (静的か)
        this.createCheckbox(this.editorPropsContainer, 'Is Static', body.isStatic, (isChecked) => {
            // Matter.Body.setStatic(body, isChecked) でプロパティを変更
            gameObject.setStatic(isChecked);
            this.updatePropertyPanel(); // UIを再描画
        });

        // Shape (形状) - まずは四角形と円形をサポート
        const shapeRow = document.createElement('div');
        shapeRow.innerHTML = `<label>Shape:</label>
            <select id="shape-select">
                <option value="rectangle" ${body.shape === 'rectangle' ? 'selected' : ''}>Rectangle</option>
                <option value="circle" ${body.shape === 'circle' ? 'selected' : ''}>Circle</option>
            </select>`;
        this.editorPropsContainer.appendChild(shapeRow);
        
        const shapeSelect = document.getElementById('shape-select');
        shapeSelect.onchange = (e) => {
            const newShape = e.target.value;
            // ★★★ 形状の情報を、GameObject自身にデータとして保存 ★★★
            gameObject.setData('shape', newShape);

            if (newShape === 'rectangle') {
                gameObject.setBody({ type: 'rectangle' }); 
            } else if (newShape === 'circle') {
                const radius = (gameObject.width + gameObject.height) / 4;
                gameObject.setCircle(radius);
            }
            this.updatePropertyPanel();
        };


        // Friction (摩擦)
        this.createRangeInput(this.editorPropsContainer, 'Friction', body.friction, 0, 1, 0.01, (value) => {
            gameObject.setFriction(value);
        });
        
        // Restitution (反発係数 / Bounce)
        this.createRangeInput(this.editorPropsContainer, 'Bounce', body.restitution, 0, 1, 0.01, (value) => {
            gameObject.setBounce(value);
        });

        // Angle (角度) - Transformの角度とは別に、物理ボディの角度も設定できる
        // これはTransformのangleと連動しているので、UIはそちらに任せる
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
 
    /**
     * オブジェクトを編集可能にする (Matter.js対応・完全版)
     */
    makeEditable(gameObject, scene) {
        if (!this.isEnabled || !gameObject.name) return;

        const sceneKey = scene.scene.key;
        if (!this.editableObjects.has(sceneKey)) {
            this.editableObjects.set(sceneKey, new Set());
        }
        this.editableObjects.get(sceneKey).add(gameObject);

        if (gameObject.getData('isEditable')) return; // 既に処理済みなら何もしない
        gameObject.setData('isEditable', true);
        
        // --- イベントリスナーを一度だけ、確実に追加 ---
        gameObject.off('pointerdown').on('pointerdown', (pointer) => {
            if (this.editorUI?.currentMode === 'select') {
                this.selectedObject = gameObject;
                this.updatePropertyPanel();
                pointer.event.stopPropagation();
            }
        });
        
        gameObject.off('dragstart').on('dragstart', () => {
            if (this.editorUI?.currentMode === 'select' && gameObject.body) {
                gameObject.setData('wasStatic', gameObject.body.isStatic); // 元の状態を記憶
                gameObject.setStatic(true);
            }
        });

        gameObject.off('drag').on('drag', (pointer, dragX, dragY) => {
            if (this.editorUI?.currentMode === 'select') {
                gameObject.setPosition(Math.round(dragX), Math.round(dragY));
                if (this.selectedObject === gameObject) this.updatePropertyPanel();
            }
        });

        gameObject.off('dragend').on('dragend', () => {
            if (this.editorUI?.currentMode === 'select' && gameObject.body) {
                const wasStatic = gameObject.getData('wasStatic') || false;
                gameObject.setStatic(wasStatic);
            }
        });

        gameObject.off('pointerover').on('pointerover', () => {
            if (this.editorUI?.currentMode === 'select') gameObject.setTint(0x00ff00);
        });
        
        gameObject.off('pointerout').on('pointerout', () => gameObject.clearTint());
    }
    
    
  /**
     * PhysicsセクションのUIを生成する
     */
    createPhysicsSectionUI(gameObject) {
        const title = document.createElement('div');
        title.innerText = 'Physics (Matter.js)';
        title.style.fontWeight = 'bold';
        this.editorPropsContainer.appendChild(title);

        if (gameObject.body) {
            // --- ボディがある場合 ---
            this.createMatterPropertiesUI(gameObject);
            const removeButton = document.createElement('button');
            removeButton.innerText = 'Remove Physics Body';
            removeButton.style.backgroundColor = '#c44';
            removeButton.onclick = () => {
                if (gameObject.body) {
                    gameObject.scene.matter.world.remove(gameObject.body);
                    gameObject.setBody(null);
                    gameObject.setData('physics', null); // ★ 永続化データからも削除
                    this.updatePropertyPanel();
                }
            };
            this.editorPropsContainer.appendChild(removeButton);
        } else {
            // --- ボディがない場合 ---
            const addButton = document.createElement('button');
            addButton.innerText = 'Add Physics Body';
            addButton.onclick = () => {
                gameObject.scene.matter.add.gameObject(gameObject, { isStatic: false });
                this.updatePropertyPanel();
            };
            this.editorPropsContainer.appendChild(addButton);
        }
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
                if (!gameObject.name || !gameObject.active) continue; // ★ activeでない(destroyされた)オブジェクトは除外


                const objData = {
                    name: gameObject.name, x: Math.round(gameObject.x), y: Math.round(gameObject.y), depth: gameObject.depth,
                    scaleX: parseFloat(gameObject.scaleX.toFixed(2)), scaleY: parseFloat(gameObject.scaleY.toFixed(2)),
                    angle: Math.round(gameObject.angle), alpha: parseFloat(gameObject.alpha.toFixed(2)), width: Math.round(gameObject.width),
                    height: Math.round(gameObject.height)
                };

                if (gameObject.getData('group')) {
        objData.group = gameObject.getData('group');
    }
                
                if (gameObject instanceof Phaser.GameObjects.Sprite) objData.type = 'Sprite';
                if (gameObject.texture && gameObject.texture.key !== '__DEFAULT') objData.texture = gameObject.texture.key;

                // ★★★ 物理ボディの書き出し部分を、Matter.js用に変更 ★★★
                 // ★★★ bodyプロパティの有無だけで判断 ★★★
                if (gameObject.body) {
                    const body = gameObject.body;
                    objData.physics = {
                        isStatic: body.isStatic,
                        shape: gameObject.getData('shape') || 'rectangle', 
                        friction: parseFloat(body.friction.toFixed(2)),
                        restitution: parseFloat(body.restitution.toFixed(2)),
                    };
                }

                if (gameObject.getData('animation_data')) objData.animation = gameObject.getData('animation_data');
                if (gameObject.getData('events')) objData.events = gameObject.getData('events');
                   if (gameObject.getData('components')) {
                    objData.components = gameObject.getData('components');
                }
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
        ['onClick', 'onHover', 'onKeyPress','onKeyPress_UP',
            'onKeyPress_DOWN',
            'onKeyPress_LEFT',
            'onKeyPress_RIGHT',
            'onKeyPress_SPACE',
            //物理判定
         'onCollide_Start', // 衝突した瞬間
            'onOverlap_Start'  // 重なった瞬間
             ].forEach(t => {
            const option = document.createElement('option');
            option.value = t; option.innerText = t;
            if (t === eventData.trigger) option.selected = true;
            triggerSelect.appendChild(option);
        });

        triggerSelect.onchange = (e) => this.updateEventData(index, 'trigger', e.target.value);
        this.updatePropertyPanel(); 
        triggerContainer.append(triggerLabel, triggerSelect);

      // もし、衝突/接触トリガーが選択されていたら、追加の入力欄を表示
        if (eventData.trigger.startsWith('onCollide') || eventData.trigger.startsWith('onOverlap')) {
            const targetLabel = document.createElement('label');
            targetLabel.innerText = ' 相手のグループ: ';
            targetLabel.style.marginLeft = '10px';
            
            const targetInput = document.createElement('input');
            targetInput.type = 'text';
            targetInput.placeholder = '例: player, floor';
            targetInput.style.width = '80px';
            targetInput.value = eventData.targetGroup || '';
            targetInput.onchange = (e) => this.updateEventData(index, 'targetGroup', e.target.value);
            
            triggerContainer.append(targetLabel, targetInput);
        }

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

    /*updateEventData(index, key, value) {
        if (!this.selectedObject) return;
        const events = this.selectedObject.getData('events') || [];
        if (events[index]) {
            events[index][key] = value;
            this.selectedObject.setData('events', events);
             this.populateEventEditor();
             this.pluginManager.game.events.emit('editor_event_changed', {
            target: this.selectedObject
        });
        }
    }*/
    
       /**
     * イベントデータを更新し、シーンに通知する
     */
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