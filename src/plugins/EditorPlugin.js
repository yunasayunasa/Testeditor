export default class EditorPlugin extends Phaser.Plugins.BasePlugin {
    constructor(pluginManager) {
        super(pluginManager);
        this.selectedObject = null;
        this.editableObjects = new Map();
        this.isEnabled = false;
        this.editorUI = null;
         this.animEditorOverlay = null;
        this.animEditorCloseBtn = null;
        
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

          this.animEditorOverlay = document.getElementById('anim-editor-overlay');
        this.animEditorCloseBtn = document.getElementById('animation-editor-close-btn');

        // ★★★ 変更点3: 閉じるボタンにイベントリスナーを設定 ★★★
        if (this.animEditorCloseBtn) {
            this.animEditorCloseBtn.addEventListener('click', () => {
                this.closeAnimationEditor();
            });
        }
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

      /**
     * アニメーション・エディタのウィンドウを開く
     */
   openAnimationEditor() {
        if (!this.animEditorOverlay || !this.selectedObject) return;

        const contentArea = document.getElementById('animation-editor-content');
        contentArea.innerHTML = ''; // 中身を一度クリア

        const isSprite = (this.selectedObject instanceof Phaser.GameObjects.Sprite);

        if (isSprite) {
            // ★ ケースA: すでにSpriteの場合
            
            // --- 1. 新しいアニメーションを作成するためのフォームを生成 ---
            const createForm = this.createAnimationCreationForm();
            contentArea.appendChild(createForm);
            
            // --- 2. 登録済みのアニメーションを一覧表示 ---
            const animList = this.createAnimationList();
            contentArea.appendChild(animList);
            
        } else {
            // ★ ケースB: Spriteではない場合
            const message = document.createElement('p');
            message.innerText = `オブジェクト「${this.selectedObject.name}」はスプライトではないため、アニメーションできません。`;
            
            const convertButton = document.createElement('button');
            convertButton.innerText = 'スプライトに変換する';
            convertButton.onclick = () => { this.convertImageToSprite(); };

            contentArea.appendChild(message);
            contentArea.appendChild(convertButton);
        }

        // --- ウィンドウを開く処理 (変更なし) ---
        const titleElement = document.getElementById('animation-editor-title');
        if (titleElement) {
            titleElement.innerText = `アニメーション編集: ${this.selectedObject.name}`;
        }
        this.animEditorOverlay.style.display = 'flex';
    }

    /**
     * 新しいアニメーションを作成するためのHTMLフォームを生成する
     * @returns {HTMLElement} 生成されたフォーム要素
     */
    createAnimationCreationForm() {
        const form = document.createElement('div');
        form.style.border = '1px solid #444';
        form.style.padding = '10px';
        form.style.marginBottom = '15px';

        const title = document.createElement('h4');
        title.innerText = '新しいアニメーションを作成';
        title.style.marginTop = '0';
        form.appendChild(title);
        
        // --- 入力欄の生成 ---
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
        
        // --- 作成ボタン ---
        const createBtn = document.createElement('button');
        createBtn.innerText = '作成';
        createBtn.onclick = () => {
            const scene = this.selectedObject.scene;
            const textureKey = this.selectedObject.texture.key;
            
            // フォームから値を取得
            const animKey = animKeyInput.value;
            const framesStr = framesInput.value;
            const frameRate = parseInt(frameRateInput.value);
            const repeat = repeatCheckbox.checked ? -1 : 0;
            
            if (!animKey || !framesStr || !frameRate) {
                alert('全ての項目を入力してください。');
                return;
            }

            // フレーム番号の文字列を解析
            const frames = scene.anims.generateFrameNumbers(textureKey, {
                frames: this.parseFrameString(framesStr)
            });

            // Phaserのアニメーションマネージャーに、新しいアニメーションを登録
            scene.anims.create({
                key: animKey,
                frames: frames,
                frameRate: frameRate,
                repeat: repeat
            });
            
            console.log(`[EditorPlugin] Animation created: '${animKey}'`);
            
            // アニメーションリストを更新して、新しいアニメを表示
            this.openAnimationEditor();
        };

        form.append(animKeyInput, framesInput, frameRateInput, repeatLabel, createBtn);
        return form;
    }

    /**
     * 登録済みのアニメーションを一覧表示するHTML要素を生成する
     * @returns {HTMLElement} 生成されたリスト要素
     */
    createAnimationList() {
        const container = document.createElement('div');
        const title = document.createElement('h4');
        title.innerText = '登録済みアニメーション';
        container.appendChild(title);

        const anims = this.selectedObject.scene.anims.anims.getArray();
        
        anims.forEach(anim => {
            // このスプライトのテクスチャを使っているアニメーションのみ表示
            if (anim.frames[0].textureKey !== this.selectedObject.texture.key) return;

            const div = document.createElement('div');
            div.innerText = `キー: ${anim.key}, フレームレート: ${anim.frameRate}`;
            
            const playBtn = document.createElement('button');
            playBtn.innerText = '再生';
            playBtn.onclick = () => {
                if (this.selectedObject) this.selectedObject.play(anim.key);
            };
            
            const stopBtn = document.createElement('button');
            stopBtn.innerText = '停止';
            stopBtn.onclick = () => {
                if (this.selectedObject) this.selectedObject.stop();
            };
            
            div.append(playBtn, stopBtn);
            container.appendChild(div);
        });

        return container;
    }

    /**
     * "0-7" や "0,2,4" のような文字列を、フレーム番号の配列に変換する
     * @param {string} str - フレーム番号の文字列
     * @returns {number[]} フレーム番号の配列
     */
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
      /**
     * ★★★ 新規メソッド ★★★
     * 選択中のImageオブジェクトを、同じプロパティを持つSpriteオブジェクトに変換する
     */
    convertImageToSprite() {
        if (!this.selectedObject || !(this.selectedObject instanceof Phaser.GameObjects.Image)) {
            console.warn("[EditorPlugin] Convert failed: No valid Image selected.");
            return;
        }

        const oldImage = this.selectedObject;
        const scene = oldImage.scene;
        
        // --- 1. 古いImageのプロパティを全て記憶する ---
        const properties = {
            name: oldImage.name,
            x: oldImage.x,
            y: oldImage.y,
            scaleX: oldImage.scaleX,
            scaleY: oldImage.scaleY,
            angle: oldImage.angle,
            alpha: oldImage.alpha,
            visible: oldImage.visible,
            depth: oldImage.depth,
            texture: oldImage.texture.key
        };

        // --- 2. 古いImageを、プラグインとシーンから完全に削除 ---
        const sceneKey = scene.scene.key;
        if (this.editableObjects.has(sceneKey)) {
            this.editableObjects.get(sceneKey).delete(oldImage);
        }
        oldImage.destroy();
        
        // --- 3. 記憶したプロパティを使って、新しいSpriteを生成 ---
        const newSprite = scene.add.sprite(properties.x, properties.y, properties.texture);

        // --- 4. 新しいSpriteに、記憶したプロパティを適用 ---
        newSprite.name = properties.name;
        newSprite.setScale(properties.scaleX, properties.scaleY);
        newSprite.setAngle(properties.angle);
        newSprite.setAlpha(properties.alpha);
        newSprite.setVisible(properties.visible);
        newSprite.setDepth(properties.depth);
        // (物理ボディがあれば、それも引き継ぐ必要があるが、それは次のステップで)

        // --- 5. 新しいSpriteをエディタに登録し、選択状態にする ---
        this.makeEditable(newSprite, scene);
        this.selectedObject = newSprite;
        
        console.log(`[EditorPlugin] Object '${properties.name}' has been converted to a Sprite.`);

        // --- 6. 最後に、アニメーション・エディタの表示を更新する ---
        //    (これにより、「Convert」ボタンが消え、アニメーション設定UIが表示されるようになる)
        this.openAnimationEditor();
    }

    /**
     * アニメーション・エディタのウィンドウを閉じる
     */
    closeAnimationEditor() {
        if (!this.animEditorOverlay) return;
        this.animEditorOverlay.style.display = 'none';
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
            // 1. GameObjectの位置を更新 (これは今まで通り)
            gameObject.x = Math.round(dragX);
            gameObject.y = Math.round(dragY);

            // 2. もし物理ボディが存在し、それが静的ボディなら、手動で位置を更新する
            if (gameObject.body && (gameObject.body instanceof Phaser.Physics.Arcade.StaticBody)) {
                // 静的ボディの位置をGameObjectに同期させる
                gameObject.body.reset(gameObject.x, gameObject.y);
            }

            // 3. プロパティパネルを更新 (これも今まで通り)
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
          // --- 区切り線 ---
        this.editorPropsContainer.appendChild(document.createElement('hr'));
        
        // --- Animationセクションのタイトル ---
        const animTitle = document.createElement('div');
        animTitle.innerText = 'Animation';
        animTitle.style.fontWeight = 'bold';
        animTitle.style.marginBottom = '10px';
        this.editorPropsContainer.appendChild(animTitle);

        // --- アニメーション・エディタを開くボタン ---
        const openAnimEditorBtn = document.createElement('button');
        openAnimEditorBtn.innerText = 'Open Animation Editor';
        openAnimEditorBtn.onclick = () => {
            if (this.selectedObject) {
                this.openAnimationEditor();
            } else {
                alert('Please select an object first.');
            }
        };
        this.editorPropsContainer.appendChild(openAnimEditorBtn);
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
     * 物理パラメータを編集するためのUIを生成する (isStatic問題を完全解決)
     */
      /**
     * 物理パラメータを編集するためのUIを生成する (instanceofを使った最終確定版)
     */
    createPhysicsPropertiesUI(gameObject) {
        const body = gameObject.body;
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ 修正点 1: instanceof を使った確実な判別方法 ★★★
        // クラス名(文字列)ではなく、Phaserのクラスそのもので判定する
        const isCurrentlyStatic = (body instanceof Phaser.Physics.Arcade.StaticBody);
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        this.createCheckbox(this.editorPropsContainer, 'Is Static Body', isCurrentlyStatic, (isChecked) => {
            if (this.selectedObject && this.selectedObject.body) {
                const targetScene = this.selectedObject.scene;
                const world = targetScene.physics.world;

                world.remove(this.selectedObject.body);
                this.selectedObject.body = null;

                targetScene.physics.add.existing(this.selectedObject, isChecked);

                if (this.selectedObject.body) {
                    // ログを更新
                    const newBodyIsStatic = (this.selectedObject.body instanceof Phaser.Physics.Arcade.StaticBody);
                    console.log(`%c[BODY CHANGED] Object: '${this.selectedObject.name}', New Body is Static? -> ${newBodyIsStatic}`, 'color: cyan; font-weight: bold;');
                    
                    this.selectedObject.body.collideWorldBounds = true;
                }
                this.updatePropertyPanel();
            }
        });

        // 動的ボディの場合のみ表示するUI
        if (!isCurrentlyStatic) {
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
   /**
     * 現在のシーンのレイアウトをJSON形式でエクスポートする (完成版)
     */
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
                // オブジェクトに名前がなければスキップ
                if (!gameObject.name) continue;

                // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                // ★★★ ここからが修正の核心です ★★★
                // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

                // --- 手順1: 全てのオブジェクトに共通の基本データをまず作成 ---
                const objData = {
                    name: gameObject.name,
                    x: Math.round(gameObject.x),
                    y: Math.round(gameObject.y),
                    scaleX: parseFloat(gameObject.scaleX.toFixed(2)),
                    scaleY: parseFloat(gameObject.scaleY.toFixed(2)),
                    angle: Math.round(gameObject.angle),
                    alpha: parseFloat(gameObject.alpha.toFixed(2))
                };
                if (gameObject.texture && gameObject.texture.key !== '__DEFAULT') {
                    objData.texture = gameObject.texture.key;
                }

                // --- 手順2: もし物理ボディがあれば、「追加」で物理データを書き込む ---
                if (gameObject.body) {
                    const body = gameObject.body;
                    const isStaticForExport = (body instanceof Phaser.Physics.Arcade.StaticBody);
                    
                    objData.physics = { isStatic: isStaticForExport };
                    
                    if (!isStaticForExport) {
                        Object.assign(objData.physics, {
                            width: body.width,
                            height: body.height,
                            offsetX: body.offset.x,
                            offsetY: body.offset.y,
                            allowGravity: body.allowGravity,
                            bounceX: parseFloat(body.bounce.x.toFixed(2)),
                            bounceY: parseFloat(body.bounce.y.toFixed(2))
                        });
                    }
                    objData.physics.collideWorldBounds = body.collideWorldBounds;
                }

                // --- 手順3: 完成したobjDataを、条件なしで必ず配列に追加 ---
                sceneLayoutData.objects.push(objData);
            }
        }
        const jsonString = JSON.stringify(sceneLayoutData, null, 2);
        console.log(`%c--- Layout for [${sceneKey}] ---`, "color: lightgreen;");
        console.log(jsonString);
        navigator.clipboard.writeText(jsonString).then(() => alert('Layout for ' + sceneKey + ' copied to clipboard!'));
    }

}