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
        if (!this.animEditorOverlay) return;
        if (!this.selectedObject) {
            alert('先にオブジェクトを選択してください。');
            return;
        }

        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが、入力の貫通を解決する、最後のロジックです ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // 1. まず、Phaserのゲーム全体の入力を「無効化」する
        this.pluginManager.game.input.enabled = false;
        console.log("[EditorPlugin] Phaser input disabled for modal window.");

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
     * 登録済みのアニメーションを一覧表示するHTML要素を生成する (最終修正版)
     * @returns {HTMLElement} 生成されたリスト要素
     */
    createAnimationList() {
        const container = document.createElement('div');
        const title = document.createElement('h4');
        title.innerText = '登録済みアニメーション';
        container.appendChild(title);

        if (!this.selectedObject || !this.selectedObject.scene) return container;

        const scene = this.selectedObject.scene;
        const currentTextureKey = this.selectedObject.texture.key;
        
        // シーンに登録されている全てのアニメーションを取得
        const allAnims = scene.anims.anims.getArray();
        
        allAnims.forEach(anim => {
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            // ★★★ これが、全てを解決する、最後の修正です ★★★
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            
            // 1. まず、アニメーションデータがフレームを持っているか、安全にチェック
            if (!anim.frames || anim.frames.length === 0) return;

            // 2. 最初のフレームから、安全にテクスチャキーを取得
            const animTextureKey = anim.frames[0].textureKey;

            // 3. このスプライトのテクスチャと、アニメーションのテクスチャが一致するか比較
            if (animTextureKey !== currentTextureKey) return;

            // --- ここから先は、表示処理 (変更なし) ---
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
   
            div.append(infoSpan, playBtn, stopBtn , setDefaultBtn);
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
        // ★★★ 1. 新しいSpriteを生成 ★★★
        const newSprite = scene.add.sprite(properties.x, properties.y, properties.texture);
        
        // ★★★ 2. 自身に、アニメーション情報を保持するデータ領域を作る ★★★
        newSprite.setData('animation_data', {
            default: null, // デフォルトアニメーションのキー
            definitions: [] // このオブジェクトで作ったアニメの定義
        });

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
     // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ 2. 最後に、Phaserのゲーム全体の入力を「再有効化」する ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        this.pluginManager.game.input.enabled = true;
        console.log("[EditorPlugin] Phaser input re-enabled.");
    }

 
   /**
     * ★★★ 新規ヘルパーメソッド (1/2) ★★★
     * 一つのイベントを表示・編集するためのHTML要素を生成する
     */
    createEventDisplay(eventData, index) {
        const div = document.createElement('div');
        div.style.border = '1px solid #444';
        div.style.padding = '8px';
        div.style.marginBottom = '8px';

        const triggerLabel = document.createElement('label');
        triggerLabel.innerText = 'トリガー: ';
        const triggerSelect = document.createElement('select');
        const triggers = ['onClick', 'onHover', 'onKeyPress'];
        triggers.forEach(t => {
            const option = document.createElement('option');
            option.value = t;
            option.innerText = t;
            if (t === eventData.trigger) option.selected = true;
            triggerSelect.appendChild(option);
        });
        triggerSelect.onchange = (e) => this.updateEventData(index, 'trigger', e.target.value);
        
        const actionsLabel = document.createElement('label');
        actionsLabel.innerText = 'アクション (タグ形式):';
        actionsLabel.style.display = 'block';
        actionsLabel.style.marginTop = '5px';
        const actionsTextarea = document.createElement('textarea');
        actionsTextarea.style.width = '95%';
        actionsTextarea.style.height = '60px';
        actionsTextarea.value = eventData.actions;
        actionsTextarea.onchange = (e) => this.updateEventData(index, 'actions', e.target.value);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerText = '削除';
        deleteBtn.style.backgroundColor = '#c44';
        deleteBtn.style.marginLeft = '10px';
        deleteBtn.onclick = () => {
            if (confirm('このイベントを削除しますか？')) {
                const events = this.selectedObject.getData('events');
                events.splice(index, 1);
                this.selectedObject.setData('events', events);
                this.updatePropertyPanel();
            }
        };
        
        const header = document.createElement('div');
        header.append(triggerLabel, triggerSelect, deleteBtn);
        div.append(header, actionsLabel, actionsTextarea);
        
        return div;
    }

    /**
     * ★★★ 新規ヘルパーメソッド (2/2) ★★★
     * オブジェクトに保存されているイベントデータを更新する
     */
    updateEventData(index, key, value) {
        if (!this.selectedObject) return;
        const events = this.selectedObject.getData('events') || [];
        if (events[index]) {
            events[index][key] = value;
            this.selectedObject.setData('events', events);
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
        physicsTitle.innerText = '物理ボディ';
        physicsTitle.style.fontWeight = 'bold';
        physicsTitle.style.marginBottom = '10px';
        this.editorPropsContainer.appendChild(physicsTitle);

        const gameObject = this.selectedObject;

        if (gameObject.body) {
            // --- ケースA: 物理ボディを持っている場合 ---
            this.createPhysicsPropertiesUI(gameObject);

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
            // --- ケースB: 物理ボディを持っていない場合 ---
            const addButton = document.createElement('button');
            addButton.innerText = '物理ボディ 付与 ';
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
        animTitle.innerText = 'スプライトシート';
        animTitle.style.fontWeight = 'bold';
        animTitle.style.marginBottom = '10px';
        this.editorPropsContainer.appendChild(animTitle);

        // --- アニメーション・エディタを開くボタン ---
        const openAnimEditorBtn = document.createElement('button');
        openAnimEditorBtn.innerText = 'アニメーション設定';
        openAnimEditorBtn.onclick = () => {
            if (this.selectedObject) {
                this.openAnimationEditor();
            } else {
                alert('Please select an object first.');
            }
        };
        this.editorPropsContainer.appendChild(openAnimEditorBtn);

  // --- 3. Eventsプロパティの生成 ---
        this.editorPropsContainer.appendChild(document.createElement('hr'));
        
        const eventsTitle = document.createElement('div');
        eventsTitle.innerText = 'ロジック';
        eventsTitle.style.fontWeight = 'bold';
        eventsTitle.style.marginBottom = '10px';
        this.editorPropsContainer.appendChild(eventsTitle);

        // 3-1. まず、既存のイベントを一覧表示する
        const events = this.selectedObject.getData('events') || [];
        events.forEach((eventData, index) => {
            const eventDiv = this.createEventDisplay(eventData, index);
            this.editorPropsContainer.appendChild(eventDiv);
        });

        // 3-2. 次に、「新しいイベントを追加」ボタンを生成する
        const addNewEventBtn = document.createElement('button');
        addNewEventBtn.innerText = '新しいイベントを追加';
        addNewEventBtn.onclick = () => {
            const currentEvents = this.selectedObject.getData('events') || [];
            currentEvents.push({ trigger: 'onClick', actions: '' }); // actionsは空文字列で初期化
            this.selectedObject.setData('events', currentEvents);
            this.updatePropertyPanel(); // パネルを再描画して、新しい編集欄を表示
        };
        this.editorPropsContainer.appendChild(addNewEventBtn);
        
        

        // Exportボタン
        this.editorPropsContainer.appendChild(document.createElement('hr'));
        const exportButton = document.createElement('button');
        exportButton.innerText = 'エクスポート レイアウト (to Console)';
        exportButton.addEventListener('click', () => this.exportLayoutToJson());
        this.editorPropsContainer.appendChild(exportButton);
        
        this.editorPropsContainer.appendChild(document.createElement('hr'));

        // --- オブジェクト削除ボタン ---
        const deleteButton = document.createElement('button');
        deleteButton.innerText = 'オブジェクト 削除';
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
// src/plugins/EditorPlugin.js

    /**
     * 現在のシーンのレイアウトをJSON形式でエクスポートする (最終確定・完成版)
     */
    exportLayoutToJson() {
        if (!this.isEnabled || !this.selectedObject || !this.selectedObject.scene) {
            alert("Please select an object in the scene you want to export.");
            return;
        }
        const targetScene = this.selectedObject.scene;
        const sceneKey = targetScene.scene.key;
        
        const sceneLayoutData = {
            objects: [],
            animations: [] // animations配列も初期化
        };

        if (this.editableObjects.has(sceneKey)) {
            for (const gameObject of this.editableObjects.get(sceneKey)) {
                // オブジェクトに名前がなければ、エクスポート対象外
                if (!gameObject.name) continue;

                // --- 1. 基本データを準備 ---
                const objData = {
                    name: gameObject.name,
                    x: Math.round(gameObject.x),
                    y: Math.round(gameObject.y),
                    scaleX: parseFloat(gameObject.scaleX.toFixed(2)),
                    scaleY: parseFloat(gameObject.scaleY.toFixed(2)),
                    angle: Math.round(gameObject.angle),
                    alpha: parseFloat(gameObject.alpha.toFixed(2))
                };
                
                // --- 2. 種類とテクスチャを追加 ---
                if (gameObject instanceof Phaser.GameObjects.Sprite) {
                    objData.type = 'Sprite';
                }
                if (gameObject.texture && gameObject.texture.key !== '__DEFAULT') {
                    objData.texture = gameObject.texture.key;
                }

                // --- 3. 物理データを追加 ---
                if (gameObject.body) {
                    const body = gameObject.body;
                    objData.physics = {
                        isStatic: body.isStatic,
                        width: body.width,
                        height: body.height,
                        offsetX: body.offset.x,
                        offsetY: body.offset.y,
                        allowGravity: body.allowGravity,
                        bounceX: parseFloat(body.bounce.x.toFixed(2)),
                        bounceY: parseFloat(body.bounce.y.toFixed(2)),
                        collideWorldBounds: body.collideWorldBounds
                    };
                }

                // --- 4. アニメーションデータを追加 ---
                if (gameObject.getData('animation_data')) {
                    objData.animation = gameObject.getData('animation_data');
                }
                
                // --- 5. 完成したオブジェクトデータをリストに追加 ---
                sceneLayoutData.objects.push(objData);

            } // ★★★ for ループの正しい閉じ括弧 ★★★
        } // ★★★ if (this.editableObjects...) の正しい閉じ括弧 ★★★
        
        // --- 6. シーン全体のアニメーション定義を書き出す ---
        const scene = this.game.scene.getScene(sceneKey);
        if (scene && scene.anims) {
            sceneLayoutData.animations = scene.anims.anims.getArray()
                // このシーンで使われているテクスチャのアニメーションのみを対象とする
                .filter(anim => anim.frames[0] && this.editableObjects.get(sceneKey) && Array.from(this.editableObjects.get(sceneKey)).some(go => go.texture.key === anim.frames[0].textureKey))
                .map(anim => {
                    // フレーム番号を正しく抽出する
                    let frames = null;
                    // generateFrameNumbersで作られたアニメか、フレーム配列で作られたアニメか
                    if (anim.generateFrameNumbers) {
                        frames = { start: anim.frames[0].frame, end: anim.frames[anim.frames.length - 1].frame };
                    } else {
                        frames = anim.frames.map(f => f.index);
                    }
                    return {
                        key: anim.key,
                        texture: anim.frames[0].textureKey,
                        frames: frames,
                        frameRate: anim.frameRate,
                        repeat: anim.repeat
                    };
                });
        }
 if (gameObject.getData('events')) {
        objData.events = gameObject.getData('events');
    }
        // --- 7. 最終的なJSONを文字列化して出力 ---
        const jsonString = JSON.stringify(sceneLayoutData, null, 2);
        console.log(`%c--- Layout for [${sceneKey}] ---`, "color: lightgreen;");
        console.log(jsonString);
        navigator.clipboard.writeText(jsonString).then(() => alert('Layout for ' + sceneKey + ' copied to clipboard!'));
    }
}