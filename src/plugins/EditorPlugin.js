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
        if (!this.isEnabled || !this.propsContainer) return;
        
        this.propsContainer.innerHTML = '';
        
        if (!this.selectedObject) {
            this.editorTitle.innerText = 'オブジェクトが選択されていません';
            return;
        }
        
        this.editorTitle.innerText = `編集中: ${this.selectedObject.name}`;
        
        // --- 1. Transformセクションを生成 ---
        this.createAccordionSection('Transform', (content) => {
            this.populateTransformUI(content);
        }, true);

        // --- 2. Physicsセクションを生成 ---
        this.createAccordionSection('Physics', (content) => {
            this.populatePhysicsUI(content);
        });

        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが、失われたアニメーション・セクションです ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        this.createAccordionSection('Animation', (content) => {
            this.populateAnimationUI(content);
        });

        // --- 4. Actionsセクションを生成 ---
        this.createAccordionSection('Actions', (content) => {
            this.populateActionButtons(content);
        });
    }
    
    createAccordionSection(title, populateFn, isOpen = false) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'accordion-section';

        const header = document.createElement('div');
        header.className = 'accordion-header';
        header.innerText = title;

        const content = document.createElement('div');
        content.className = 'accordion-content';
        if (isOpen) {
            content.classList.add('open');
        }

        header.onclick = () => {
            content.classList.toggle('open');
        };
        
        populateFn(content);

        sectionDiv.appendChild(header);
        sectionDiv.appendChild(content);
        this.propsContainer.appendChild(sectionDiv);
    }
    
    /**
     * 【完成版】
     * Transformアコーディオンの中身（Name, x, y, scaleなど）を生成する
     * @param {HTMLElement} container - UIを追加する親要素 (accordion-content)
     */
    populateTransformUI(container) {
        if (!this.selectedObject) return;

        // --- Nameプロパティの編集UI ---
        const nameRow = document.createElement('div');
        const nameLabel = document.createElement('label');
        nameLabel.innerText = 'Name:';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = this.selectedObject.name || '';
        
        nameInput.addEventListener('input', (e) => {
            const newName = e.target.value;
            if (this.selectedObject) {
                this.selectedObject.name = newName;
                this.editorTitle.innerText = `編集中: ${newName}`;
            }
        });
        
        nameRow.appendChild(nameLabel);
        nameRow.appendChild(nameInput);
        container.appendChild(nameRow);

        // --- Transformプロパティの生成ループ ---
        const properties = {
            x: { type: 'number', step: 1 },
            y: { type: 'number', step: 1 },
            scaleX: { type: 'range', min: 0.1, max: 5, step: 0.01 },
            scaleY: { type: 'range', min: 0.1, max: 5, step: 0.01 },
            angle: { type: 'range', min: -180, max: 180, step: 1 },
            alpha: { type: 'range', min: 0, max: 1, step: 0.01 }
        };

        for (const key in properties) {
            if (this.selectedObject[key] === undefined) continue;

            const prop = properties[key];
            
            // ★ createRangeInputやcreateVector2Inputのようなヘルパーを直接使う
            if (prop.type === 'range') {
                this.createRangeInput(container, key, this.selectedObject[key], prop.min, prop.max, prop.step, (value) => {
                    if (this.selectedObject) this.selectedObject[key] = value;
                });
            } else if (key === 'x' || key === 'y') {
                // xとyはペアで表示したいので、ここでは何もしない（後でまとめて処理）
            }
        }
        
        // xとyをペアで表示するためのVector2入力
        this.createVector2Input(container, 'Position', { x: this.selectedObject.x, y: this.selectedObject.y }, (x, y) => {
            if (this.selectedObject) this.selectedObject.setPosition(x, y);
        });
    }

    /**
     * 【完成版】
     * Actionsアコーディオンの中身（ExportボタンとDeleteボタン）を生成する
     * @param {HTMLElement} container - UIを追加する親要素 (accordion-content)
     */
    populateActionButtons(container) {
        // --- エクスポートボタン ---
        const exportButton = document.createElement('button');
        exportButton.innerText = 'Export Layout (to Console)';
        exportButton.addEventListener('click', () => this.exportLayoutToJson());
        container.appendChild(exportButton);

        // --- オブジェクト削除ボタン ---
        const deleteButton = document.createElement('button');
        deleteButton.innerText = 'Delete Object';
        deleteButton.style.backgroundColor = '#e65151';
        deleteButton.style.marginTop = '10px';
        
        deleteButton.addEventListener('click', () => {
            if (this.selectedObject) {
                if (confirm(`本当に '${this.selectedObject.name}' を削除しますか？`)) {
                    const targetObject = this.selectedObject;
                    const sceneKey = targetObject.scene.scene.key;

                    if (this.editableObjects.has(sceneKey)) {
                        this.editableObjects.get(sceneKey).delete(targetObject);
                    }
                    
                    targetObject.destroy();
                    
                    this.selectedObject = null;
                    this.updatePropertyPanel();
                }
            }
        });
        container.appendChild(deleteButton);
    }
    /**
     * 【完成版】
     * Physicsアコーディオンの中身（物理ボディの有効化/無効化、各種パラメータ）を生成する
     * @param {HTMLElement} container - UIを追加する親要素 (accordion-content)
     */
    populatePhysicsUI(container) {
        const gameObject = this.selectedObject;
        if (!gameObject) return;

        if (gameObject.body) {
            // --- 物理ボディを持っている場合 ---
            const body = gameObject.body;
            const isStatic = body.isStatic;
            
            // Is Static Body チェックボックス
            this.createCheckbox(container, 'Is Static Body', isStatic, (isChecked) => {
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

            // 動的ボディの場合のみ、他のプロパティを表示
            const isDynamic = body.moves;
            if (isDynamic) {
                this.createVector2Input(container, 'Size', { x: body.width, y: body.height }, (x, y) => body.setSize(x, y));
                this.createVector2Input(container, 'Offset', { x: body.offset.x, y: body.offset.y }, (x, y) => body.setOffset(x, y));
                this.createCheckbox(container, 'Allow Gravity', body.allowGravity, (value) => { if(body) body.allowGravity = value; });
                this.createRangeInput(container, 'Bounce X', body.bounce.x, 0, 1, 0.01, (value) => { if(body) body.bounce.x = value; });
                this.createRangeInput(container, 'Bounce Y', body.bounce.y, 0, 1, 0.01, (value) => { if(body) body.bounce.y = value; });
            }
            
            // 共通プロパティ
            this.createCheckbox(container, 'Collide World Bounds', body.collideWorldBounds, (value) => { if(body) body.collideWorldBounds = value; });

        } else {
            // --- 物理ボディを持っていない場合 ---
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
            container.appendChild(addButton);
        }
    }

    /**
     * 【完成版】
     * Animationアコーディオンの中身（アニメーション・エディタを開くボタン）を生成する
     * @param {HTMLElement} container - UIを追加する親要素 (accordion-content)
     */
    populateAnimationUI(container) {
        if (!this.selectedObject) return;

        const openAnimEditorBtn = document.createElement('button');
        openAnimEditorBtn.innerText = 'アニメーション・エディタを開く';
        
        openAnimEditorBtn.onclick = () => {
            if (this.selectedObject) {
                this.openAnimationEditor();
            } else {
                alert('先にオブジェクトを選択してください。');
            }
        };
        
        container.appendChild(openAnimEditorBtn);
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

        // --- 7. 最終的なJSONを文字列化して出力 ---
        const jsonString = JSON.stringify(sceneLayoutData, null, 2);
        console.log(`%c--- Layout for [${sceneKey}] ---`, "color: lightgreen;");
        console.log(jsonString);
        navigator.clipboard.writeText(jsonString).then(() => alert('Layout for ' + sceneKey + ' copied to clipboard!'));
    }
}