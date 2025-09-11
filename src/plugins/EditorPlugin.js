import { ComponentRegistry } from '../components/index.js';
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
        // ★★★ このメソッドは、UIへの参照を保持するだけにする ★★★
        // ★★★ イベントリスナーの登録は、ここで行わない ★★★
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
     * プロパティパネルを絶対にクラッシュさせずに更新する最終メソッド。
     */
    updatePropertyPanel() {
        // --- ガード節: 多重実行防止 ---
        if (this._isUpdatingPanel) return;
        this._isUpdatingPanel = true;

        try {
            // --- ガード節: 必須DOM要素の確認 ---
            if (!this.editorPropsContainer || !this.editorTitle) {
                this._isUpdatingPanel = false;
                return;
            }

            // --- 状態確認: 選択オブジェクトが破棄されていないか ---
            if (this.selectedObject && (!this.selectedObject.scene || !this.selectedObject.active)) {
                this.selectedObject = null;
            }

            // --- UIクリア ---
            this.editorPropsContainer.innerHTML = '';

            // --- 選択オブジェクトがない場合のUI ---
            if (!this.selectedObject) {
                this.editorTitle.innerText = 'No Object Selected';
                this._isUpdatingPanel = false;
                return;
            }
            
            // --- これ以降、selectedObjectは「存在する」と仮定してUIを構築 ---
            this.editorTitle.innerText = `Editing: ${this.selectedObject.name}`;
            
            // --- 各UIセクションを、それぞれ個別のtry/catchで囲んで防御 ---
            this.safeCreateUI(this.createNameInput);
            this.safeCreateUI(this.createGroupInput);
            this.editorPropsContainer.appendChild(document.createElement('hr'));
            
   // --- オブジェクトのタイプに応じて、表示するUIを切り替える ---
            if (this.selectedObject instanceof Phaser.GameObjects.Text) {
                // テキストオブジェクト専用のUI
                this.safeCreateUI(this.createTextPropertiesUI);
            } else {
                // 画像/スプライトオブジェクト用のUI (変更なし)
                // this.safeCreateUI(this.createTextureUI); // 将来的にテクスチャ変更UIを作るなら
            }


            this.safeCreateUI(this.createTransformInputs);
            this.safeCreateUI(this.createDepthInput);
            this.editorPropsContainer.appendChild(document.createElement('hr'));
            
            this.safeCreateUI(this.createPhysicsSection);
            this.editorPropsContainer.appendChild(document.createElement('hr'));
   this.safeCreateUI(this.createAnimationSection);
            this.editorPropsContainer.appendChild(document.createElement('hr'));
            
            this.safeCreateUI(this.createEventSection);
            this.editorPropsContainer.appendChild(document.createElement('hr'));

            this.safeCreateUI(this.createComponentSection);
            this.editorPropsContainer.appendChild(document.createElement('hr'));
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            // ... (他のセクションも同様) ...
            this.safeCreateUI(this.createExportButton);
this.safeCreateUI(this.createExportPrefabButton);


            this.safeCreateUI(this.createDeleteObjectButton);

        } catch (error) {
            console.error("%c[updatePropertyPanel] UNEXPECTED FATAL CRASH:", "color: red; font-size: 1.2em;", error);
        } finally {
            this._isUpdatingPanel = false;
        }
    }

    /**
     * UI生成関数を安全に実行するためのラッパー関数。
     * @param {function} createUIFunction - UIを生成する関数 (thisを束縛するためアロー関数を推奨)
     */
    safeCreateUI(createUIFunction) {
        try {
            // thisをEditorPluginインスタンスに束縛して実行
            createUIFunction.call(this);
        } catch (error) {
            const funcName = createUIFunction.name || 'anonymous function';
            console.error(`[EditorPlugin] Failed to create UI section: '${funcName}'`, error);
        }
    }

       /**
     * ★★★ 新規ヘルパーメソッド ★★★
     * テキストオブジェクト専用のプロパティ編集UIを生成する
     */
    createTextPropertiesUI() {
        const target = this.selectedObject;

        // --- Text Content ---
        const textRow = document.createElement('div');
        const textLabel = document.createElement('label');
        textLabel.innerText = 'Text:';
        const textInput = document.createElement('textarea');
        textInput.style.minHeight = '40px';
        textInput.value = target.text;
        textInput.addEventListener('input', (e) => {
            target.setText(e.target.value);
        });
        textRow.append(textLabel, textInput);
        this.editorPropsContainer.appendChild(textRow);

       // --- Font Family ---
        const familyRow = document.createElement('div');
        const familyLabel = document.createElement('label');
        familyLabel.innerText = 'Font:';
        const familyInput = document.createElement('input');
        familyInput.type = 'text';
        familyInput.placeholder = 'Arial, sans-serif';
        familyInput.value = target.style.fontFamily;
        familyInput.addEventListener('input', (e) => {
            target.setFontFamily(e.target.value);
        });
        familyRow.append(familyLabel, familyInput);
        this.editorPropsContainer.appendChild(familyRow);

        // --- Font Size & Style (統合) ---
        const styleRow = document.createElement('div');
        // Size
        const sizeLabel = document.createElement('label');
        sizeLabel.innerText = 'Size:';
        const sizeInput = document.createElement('input');
        sizeInput.type = 'number';
        sizeInput.style.width = '60px'; // 幅を固定
        sizeInput.value = parseInt(target.style.fontSize);
        sizeInput.addEventListener('input', (e) => {
            target.setFontSize(parseInt(e.target.value));
        });
        // Style (Bold/Italic)
        const styleSelect = document.createElement('select');
        ['normal', 'bold', 'italic', 'bold italic'].forEach(style => {
            const option = document.createElement('option');
            option.value = style;
            option.innerText = style;
            if (target.style.fontStyle === style) option.selected = true;
            styleSelect.appendChild(option);
        });
        styleSelect.addEventListener('change', (e) => {
            target.setFontStyle(e.target.value);
        });
        styleRow.append(sizeLabel, sizeInput, styleSelect);
        this.editorPropsContainer.appendChild(styleRow);
        // --- Color ---
        const colorRow = document.createElement('div');
        const colorLabel = document.createElement('label');
        colorLabel.innerText = 'Color:';
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = target.style.color;
        colorInput.addEventListener('input', (e) => {
            target.setColor(e.target.value);
        });
        colorRow.append(colorLabel, colorInput);
        this.editorPropsContainer.appendChild(colorRow);
         // --- Shadow (ドロップシャドウ) ---
        const shadowTitle = document.createElement('h5'); // 少し小さい見出し
        shadowTitle.innerText = 'Shadow';
        shadowTitle.style.margin = '10px 0 5px 0';
        this.editorPropsContainer.appendChild(shadowTitle);

        const shadowRow = document.createElement('div');
        // Color
        const shadowColorLabel = document.createElement('label');
        shadowColorLabel.innerText = 'Color:';
        const shadowColorInput = document.createElement('input');
        shadowColorInput.type = 'color';
        shadowColorInput.value = target.style.shadowColor || '#000000';
        // Offset X/Y
        const shadowXInput = document.createElement('input');
        shadowXInput.type = 'number';
        shadowXInput.title = 'Shadow Offset X';
        shadowXInput.value = target.style.shadowOffsetX || 2;
        const shadowYInput = document.createElement('input');
        shadowYInput.type = 'number';
        shadowYInput.title = 'Shadow Offset Y';
        shadowYInput.value = target.style.shadowOffsetY || 2;
        
        const updateShadow = () => {
            target.setShadow(
                parseInt(shadowXInput.value),
                parseInt(shadowYInput.value),
                shadowColorInput.value,
                2 // Blur (固定)
            );
        };
        shadowColorInput.addEventListener('input', updateShadow);
        shadowXInput.addEventListener('input', updateShadow);
        shadowYInput.addEventListener('input', updateShadow);

        shadowRow.append(shadowColorLabel, shadowColorInput, shadowXInput, shadowYInput);
        this.editorPropsContainer.appendChild(shadowRow);
    
    }
    createExportPrefabButton() {
        const button = document.createElement('button');
        button.innerText = 'Export Selection as Prefab';
        button.style.backgroundColor = '#4a8a4a'; // 分かりやすいように色を変える
        button.addEventListener('click', () => this.exportSelectionToPrefab());
        this.editorPropsContainer.appendChild(button);
    }
    // --- 物理セクションを独立したメソッドに分離 ---
    createPhysicsSection() {
        const physicsTitle = document.createElement('h4');
        physicsTitle.innerText = '物理ボディ (Matter.js)';
        this.editorPropsContainer.appendChild(physicsTitle);

        // ★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ ここが最終防衛ライン ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★
        const hasBody = this.selectedObject && this.selectedObject.body;

        if (hasBody) {
            this.createMatterPropertiesUI(this.selectedObject);
            this.createRemoveBodyButton();
        } else {
            this.createAddBodyButton();
        }
    }


/**
 * ボディ削除ボタン (再構築を呼び出す方式)
 */
createRemoveBodyButton() {
    const removeButton = document.createElement('button');
    removeButton.innerText = '物理ボディ 削除';
    removeButton.style.backgroundColor = '#e65151';
    
    removeButton.onclick = () => {
        // 物理オプションを「なし」にして再構築を呼び出す
        this.recreateBodyByReconstruction(null); // nullを渡すのがポイント
    };
    this.editorPropsContainer.appendChild(removeButton);
}


/**
 * ボディを「完全な再構築」によって安全に再生成、または削除する最終メソッド
 * @param {object | null} changedPhysicsOption - 変更オプション。nullが渡された場合はボディを削除する。
 */
recreateBodyByReconstruction(changedPhysicsOption) {
    const targetObject = this.selectedObject;
    if (!targetObject || !targetObject.scene) return;

    // --- 1. レイアウト情報を抽出 (物理以外) ---
    const layout = {
        name: targetObject.name,
        type: (targetObject instanceof Phaser.GameObjects.Sprite) ? 'Sprite' : 'Image',
        texture: targetObject.texture.key,
        x: targetObject.x,
        y: targetObject.y,
        depth: targetObject.depth,
        scaleX: targetObject.scaleX,
        scaleY: targetObject.scaleY,
        angle: targetObject.angle,
        alpha: targetObject.alpha,
        group: targetObject.getData('group'),
        animation_data: targetObject.getData('animation_data'),
        events: targetObject.getData('events'),
        components: targetObject.getData('components'),
    };
    
    // --- 2. 物理情報を、安全なプロパティだけを抽出して作成 ---
    if (changedPhysicsOption !== null) {
        const currentBody = targetObject.body;
        // ★★★ 必要なプロパティだけを明示的にコピーする ★★★
        const basePhysics = currentBody ? {
            isStatic: currentBody.isStatic,
            ignoreGravity: currentBody.ignoreGravity,
            gravityScale: currentBody.gravityScale,
            friction: currentBody.friction,
            restitution: currentBody.restitution,
            shape: targetObject.getData('shape') || 'rectangle'
        } : {}; // ボディがなければ空オブジェクトから始める

        // 抽出した安全な情報に、今回の変更をマージ
        layout.physics = { ...basePhysics, ...changedPhysicsOption };
        
    }
    // changedPhysicsOptionがnullなら、layout.physicsはundefinedのまま = ボディなし
console.log('%c[EditorPlugin] Reconstructing with layout:', 'color: cyan;', layout);
    // --- 3. 再構築プロセス ---
    const scene = targetObject.scene;
    const sceneKey = scene.scene.key;
    if (this.editableObjects.has(sceneKey)) {
        this.editableObjects.get(sceneKey).delete(targetObject);
    }
    targetObject.destroy();
    const newGameObject = scene.createObjectFromLayout(layout);
    scene.applyProperties(newGameObject, layout);
    this.selectedObject = newGameObject;
    
    // --- 4. UIを更新 ---
    this.updatePropertyPanel();
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
    // オブジェクトから安全にプロパティ値を読み込むためのヘルパー関数
    const getSafeValue = (propertyKey, defaultValue) => {
        // オブジェクトが存在しない、またはアクティブでない場合はデフォルト値を返す
        if (!this.selectedObject || !this.selectedObject.active) {
            return defaultValue;
        }
        try {
            const value = this.selectedObject[propertyKey];
            // undefinedやnullも有効な値ではないため、デフォルト値にフォールバック
            return (value !== undefined && value !== null) ? value : defaultValue;
        } catch (e) {
            // プロパティへのアクセス自体がエラーを引き起こした場合
            console.warn(`Could not access property '${propertyKey}'. Defaulting to ${defaultValue}.`);
            return defaultValue;
        }
    };

    // --- x, y ---
    ['x', 'y'].forEach(key => {
        const row = document.createElement('div');
        const label = document.createElement('label');
        label.innerText = `${key}:`;
        const input = document.createElement('input');
        input.type = 'number';
        input.value = getSafeValue(key, 0);
        input.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && this.selectedObject) {
                this.selectedObject[key] = val;
            }
        });
        row.append(label, input);
        this.editorPropsContainer.appendChild(row);
    });

    // --- scale (まとめて処理) ---
    const scaleRow = document.createElement('div');
    const scaleLabel = document.createElement('label');
    scaleLabel.innerText = 'scale:';
    const scaleInput = document.createElement('input');
    scaleInput.type = 'range';
    scaleInput.min = 0.1;
    scaleInput.max = 5;
    scaleInput.step = 0.01;
    const scaleX = getSafeValue('scaleX', 1);
    const scaleY = getSafeValue('scaleY', 1);
    scaleInput.value = (scaleX === scaleY) ? scaleX : 1.0;
    scaleInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && this.selectedObject) {
            this.selectedObject.setScale(val);
        }
    });
    scaleRow.append(scaleLabel, scaleInput);
    this.editorPropsContainer.appendChild(scaleRow);


    // --- angle, alpha ---
    ['angle', 'alpha'].forEach(key => {
        const row = document.createElement('div');
        const label = document.createElement('label');
        label.innerText = `${key}:`;
        const input = document.createElement('input');
        input.type = 'range';
        const defaultValue = (key === 'alpha') ? 1 : 0;
        input.min = (key === 'angle') ? -180 : 0;
        input.max = (key === 'angle') ? 180 : 1;
        input.step = (key === 'angle') ? 1 : 0.01;
        input.value = getSafeValue(key, defaultValue);
        input.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && this.selectedObject) {
                if (key === 'angle') this.selectedObject.setAngle(val);
                else if (key === 'alpha') this.selectedObject.setAlpha(val);
            }
        });
        row.append(label, input);
        this.editorPropsContainer.appendChild(row);
    });
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

    /**
 * 物理ボディを付与するボタンを生成する。
 */
/**
 * 物理ボディを付与するボタンを生成する。
 */
createAddBodyButton() {
    const addButton = document.createElement('button');
    addButton.innerText = '物理ボディ 付与';
    addButton.onclick = () => {
        if (this.selectedObject && !this.selectedObject.body) { // 二重付与を防止
            this.selectedObject.scene.matter.add.gameObject(this.selectedObject, { isStatic: false });
            this.selectedObject.setData('shape', 'rectangle');
            setTimeout(() => this.updatePropertyPanel(), 0);
        }
    };
    this.editorPropsContainer.appendChild(addButton);
}

  
  
/**
 * Matter.js用のプロパティUIを生成する (Phaser公式API準拠・最終版)
 */
createMatterPropertiesUI(gameObject) {
    const body = gameObject.body;
    const isTextObject = (gameObject instanceof Phaser.GameObjects.Text);
    // --- 静的ボディ ---
    this.createCheckbox(this.editorPropsContainer, '静的ボディ', body.isStatic, (isChecked) => {
        if (this.selectedObject) {
            // 公式API: .setStatic()
            this.selectedObject.setStatic(isChecked);
            // UIを更新して、他の部分の表示を正しくする
            this.updatePropertyPanel(); 
        }
    });

 // --- センサー (すり抜け) ---
    this.createCheckbox(this.editorPropsContainer, 'センサー', body.isSensor, (isChecked) => {
        if (this.selectedObject) {
            // setSensorも安全なので、直接呼び出す
            this.selectedObject.setSensor(isChecked);
            if (isChecked) {
                // センサーON時は、再構築せずにsetDataで重力無視を設定
                this.selectedObject.setData('ignoreGravity', true);
            }
            this.updatePropertyPanel(); 
        }
    });
   
    // --- 重力無視 ---
    this.createCheckbox(this.editorPropsContainer, '重力無視', gameObject.getData('ignoreGravity') === true, (isChecked) => {
        if (this.selectedObject) {
            // ★★★ ここで処理を分岐 ★★★
            if (isTextObject) {
                // テキストオブジェクトの場合：再構築せず、setDataで状態を更新するだけ
                this.selectedObject.setData('ignoreGravity', isChecked);
                console.log(`[EditorPlugin] Set ignoreGravity=${isChecked} for Text object (no reconstruction).`);
                // UIの表示を更新するために、PropertyPanelの更新だけは呼び出す
                this.updatePropertyPanel();
            } else {
                // 画像・スプライトの場合：これまで通り、安全な再構築メソッドを呼び出す
                this.recreateBodyByReconstruction({ ignoreGravity: isChecked });
            }
        }
    });

    // --- 重力スケール ---
    if (!body.ignoreGravity) {
        this.createRangeInput(this.editorPropsContainer, '重力スケール', body.gravityScale.y, -2, 2, 0.1, (value) => {
            if (this.selectedObject && this.selectedObject.body) {
                // gravityScaleは特殊なので、bodyに直接代入するのが公式な方法
                this.selectedObject.body.gravityScale.y = value;
                this.selectedObject.body.gravityScale.x = 0; // x軸は常に0に
            }
        });
    }
    this.createRangeInput(this.editorPropsContainer, '空気抵抗', body.frictionAir, 0, 0.1, 0.001, (value) => {
    if (this.selectedObject) {
        // 公式API: .setFrictionAir()
        this.selectedObject.setFrictionAir(value);
    }
});
    // --- 摩擦 & 反発 ---
    this.createRangeInput(this.editorPropsContainer, '摩擦', body.friction, 0, 1, 0.01, (value) => {
        if (this.selectedObject) {
            // 公式API: .setFriction()
            this.selectedObject.setFriction(value);
        }
    });
    this.createRangeInput(this.editorPropsContainer, '反発', body.restitution, 0, 1, 0.01, (value) => {
        if (this.selectedObject) {
            // 公式API: .setBounce()
            this.selectedObject.setBounce(value);
        }
    });

    // --- 形状 ---
    const currentShape = gameObject.getData('shape') || 'rectangle';
    this.createSelect(this.editorPropsContainer, '形状', currentShape, ['rectangle', 'circle'], (newShape) => {
        if (this.selectedObject) {
            this.selectedObject.setData('shape', newShape);
            // 形状の変更は、ボディの再生成が必要
            // ボディ削除→ボディ付与、という流れで実現する
            if (this.selectedObject.body) {
                const scene = this.selectedObject.scene;
                scene.matter.world.remove(this.selectedObject.body);
                scene.matter.add.gameObject(this.selectedObject); // デフォルトで再付与
                // 新しい形状を適用
                if (newShape === 'circle') this.selectedObject.setCircle();
                else this.selectedObject.setRectangle();
            }
            this.updatePropertyPanel();
        }
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
    
    // --- 1. 永続化データから、アタッチされているコンポーネント定義を取得 ---
    const attachedComponents = this.selectedObject.getData('components') || [];

    // --- 2. 各コンポーネント定義をループ処理し、UIを生成 ---
    attachedComponents.forEach((componentDef, index) => {
        
        // --- a. コンポーネントごとのコンテナを作成 ---
        const containerDiv = document.createElement('div');
        containerDiv.style.flexDirection = 'column';
        containerDiv.style.alignItems = 'flex-start';
        containerDiv.style.border = '1px solid #444';
        containerDiv.style.padding = '8px';
        containerDiv.style.marginBottom = '8px';
        
        // --- b. ヘッダー (コンポーネント名と削除ボタン) ---
        const headerDiv = document.createElement('div');
        headerDiv.style.width = '100%';
        headerDiv.style.justifyContent = 'space-between';
        
        const compTitle = document.createElement('strong');
        compTitle.innerText = componentDef.type;
        
        const removeBtn = document.createElement('button');
        removeBtn.innerText = '×';
        removeBtn.style.width = '25px';
        removeBtn.style.padding = '2px';
        removeBtn.style.backgroundColor = '#666';
        removeBtn.onclick = () => {
            // 確認ダイアログは不要なら省略しても良い
            if (confirm(`Component '${componentDef.type}' を削除しますか？`)) {
                // イミュータブルな再構築で、コンポーネントを安全に削除
                const currentComps = this.selectedObject.getData('components') || [];
                currentComps.splice(index, 1); // このコンポーネントを配列から削除
                this.selectedObject.setData('components', currentComps);
                this.recreateBodyByReconstruction({}); // 再構築をトリガー
            }
        };
        headerDiv.append(compTitle, removeBtn);
        containerDiv.appendChild(headerDiv);

       

        // --- c. パラメータ編集UIの生成 ---
        if (componentDef.type === 'Scrollable') {
            // パラメータの現在値を取得 (なければデフォルト値)
            const currentSpeed = componentDef.params.speed !== undefined ? componentDef.params.speed : -5;
            
            // 汎用ヘルパーを使って、スライダーを生成
            this.createRangeInput(containerDiv, 'speed', currentSpeed, -20, 20, 0.5, (newValue) => {
                // 1. 永続化データ (componentDef.params) を更新
                componentDef.params.speed = newValue;
                this.selectedObject.setData('components', attachedComponents);
                
                // 2. 実行中のインスタンスのプロパティを、リアルタイムで更新
                if (this.selectedObject.components?.Scrollable) {
                    this.selectedObject.components.Scrollable.scrollSpeed = newValue;
                }
            });
        }
        
        if (componentDef.type === 'PlayerController') {
            // 同様に、PlayerControllerのパラメータUIもここに追加できる
            const currentMoveSpeed = componentDef.params.moveSpeed !== undefined ? componentDef.params.moveSpeed : 4;
            this.createRangeInput(containerDiv, 'moveSpeed', currentMoveSpeed, 1, 20, 0.5, (newValue) => {
                componentDef.params.moveSpeed = newValue;
                this.selectedObject.setData('components', attachedComponents);
                if (this.selectedObject.components?.PlayerController) {
                    this.selectedObject.components.PlayerController.moveSpeed = newValue;
                }
            });
        }

        this.editorPropsContainer.appendChild(containerDiv);
    });

       // --- ComponentRegistryから、利用可能なコンポーネント名のリストを自動生成 ---
        const availableComponents = Object.keys(ComponentRegistry);
        // --------------------------------------------------------------------
  
        
        const select = document.createElement('select');
        select.innerHTML = '<option value="">Add Component...</option>';
        
        availableComponents.forEach(compName => {
            // 既にアタッチされていないコンポーネントのみをリストに追加
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

    /**
     * ★★★ 以下のメソッドで、既存の createDeleteObjectButton を完全に置き換えてください ★★★
     */
    createDeleteObjectButton() {
        const button = document.createElement('button');
        button.innerText = 'オブジェクト 削除';
        button.style.backgroundColor = '#e65151';
        button.style.marginTop = '10px';
        
        button.addEventListener('click', () => {
            // クリックされた瞬間の選択オブジェクトを、ローカル変数に固定する
            const objectToDelete = this.selectedObject;
            
            if (objectToDelete && objectToDelete.scene && confirm(`本当に '${objectToDelete.name}' を削除しますか？`)) {
                
                // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                // ★★★ "targetObject" を、全て "objectToDelete" に修正 ★★★
                // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
                const sceneKey = objectToDelete.scene.scene.key;
                
                if (this.editableObjects.has(sceneKey)) {
                    this.editableObjects.get(sceneKey).delete(objectToDelete);
                }
                
                objectToDelete.destroy();
                // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

                // 選択を解除し、UIを更新する
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
           if (label === '静的ボディ') checkbox.id = 'prop-isStatic';
    if (label === '重力無視') checkbox.id = 'prop-ignoreGravity';
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
          if (label === '重力スケール') slider.id = 'prop-gravityScale';
    if (label === '摩擦') slider.id = 'prop-friction';
    if (label === '反発') slider.id = 'prop-restitution';
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
            if (this.editorUI?.currentMode === 'select') {
                // ★ setPositionは物理エンジンに影響を与えない
                gameObject.setPosition(dragX, dragY);
                // ★ ドラッグ中は物理ボディの位置も強制的に合わせる
                if (gameObject.body) {
                    Phaser.Physics.Matter.Matter.Body.setPosition(gameObject.body, { x: dragX, y: dragY });
                }
                if (this.selectedObject === gameObject) this.updatePropertyPanel();
            }
        });
        
        gameObject.on('pointerover', () => {
             if (this.editorUI && this.editorUI.currentMode === 'select') {
                // ▼▼▼ 【setTintエラー対策】setTintメソッドが存在するか確認してから呼び出す ▼▼▼
                if (typeof gameObject.setTint === 'function') {
                    gameObject.setTint(0x00ff00);
                }
             }
        });
        
         gameObject.on('pointerout', () => {
            // ▼▼▼ 【setTintエラー対策】clearTintメソッドが存在するか確認してから呼び出す ▼▼▼
            if (typeof gameObject.clearTint === 'function') {
                gameObject.clearTint();
            }
        });
    }
    
    
   /**
     * 現在のシーンレイアウトをJSON形式でエクスポートする。
     * ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
     * ★★★ これが循環参照エラーを解決する最終的な修正です ★★★
     * ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
     */
    exportLayoutToJson() {
        if (!this.selectedObject || !this.selectedObject.scene) {
            alert("エクスポートするシーンのオブジェクトを、最低一つ選択してください。");
            return;
        }

        const sceneKey = this.selectedObject.scene.scene.key;
        
        // sceneLayoutDataは最終的にシリアライズされる純粋なオブジェクト
        const sceneLayoutData = {
            objects: [],
            animations: []
        };
        
        if (this.editableObjects.has(sceneKey)) {
            // 破壊されたオブジェクトを除外
            const liveObjects = Array.from(this.editableObjects.get(sceneKey)).filter(go => go && go.scene);

            for (const gameObject of liveObjects) {
                if (!gameObject.name) continue;

                // --- 1. 必要なプロパティだけを抽出した、新しいプレーンなオブジェクトを作成 ---
                const objData = {
                    name: gameObject.name,
                    type:  (gameObject instanceof Phaser.GameObjects.Text) ? 'Text' :
                    (gameObject instanceof Phaser.GameObjects.Sprite) ? 'Sprite' : 'Image',
                  
                    texture: gameObject.texture.key,
                    x: Math.round(gameObject.x),
                    y: Math.round(gameObject.y),
                    depth: gameObject.depth,
                    scaleX: parseFloat(gameObject.scaleX.toFixed(2)),
                    scaleY: parseFloat(gameObject.scaleY.toFixed(2)),
                    angle: Math.round(gameObject.angle),
                    alpha: parseFloat(gameObject.alpha.toFixed(2)),
                };
                
                // --- 2. getData()で取得したデータは、通常プレーンなので安全に追加できる ---
                const group = gameObject.getData('group');
                if (group) objData.group = group;

                 if (objData.type === 'Text') {
            objData.text = gameObject.text;
            objData.style = {
                // --- 既存のスタイル ---
                fontSize: gameObject.style.fontSize,
                fill: gameObject.style.color,
                // ▼▼▼【新しいスタイルを追加】▼▼▼
                fontFamily: gameObject.style.fontFamily,
                fontStyle: gameObject.style.fontStyle,
                // 影のスタイルも保存
                shadow: {
                    offsetX: gameObject.style.shadowOffsetX,
                    offsetY: gameObject.style.shadowOffsetY,
                    color: gameObject.style.shadowColor,
                    blur: gameObject.style.shadowBlur,
                    stroke: gameObject.style.shadowStroke,
                    fill: gameObject.style.shadowFill
                }
            };
      
        } else {
        // ★★★ textureプロパティが存在するか確認してからキーを取得 ★★★
        if (gameObject.texture && gameObject.texture.key) {
            objData.texture = gameObject.texture.key;
        }
    
            // 画像/スプライトの場合
            objData.texture = gameObject.texture.key;
        }

                const animData = gameObject.getData('animation_data');
                if (animData) objData.animation = animData;
                
                const events = gameObject.getData('events');
                if (events && events.length > 0) objData.events = events;
                
                const components = gameObject.getData('components');
                if (components && components.length > 0) objData.components = components;

                // --- 3. 物理ボディも、必要なプロパティだけを抽出する ---
                    // --- 物理ボディのプロパティ ---
         // --- 3. 物理ボディも、必要なプロパティだけを抽出する ---
if (gameObject.body) {
    const body = gameObject.body;
    objData.physics = {
        isStatic: body.isStatic,
        isSensor: body.isSensor,
        // ▼▼▼【ここが修正点です】▼▼▼
        // 信頼できない body.ignoreGravity を参照するのをやめ、
        // 自分で設定した信頼できる getData('ignoreGravity') を書き出す。
        ignoreGravity: gameObject.getData('ignoreGravity') === true,
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        gravityScale: body.gravityScale.y, // y軸の値だけで十分
        shape: gameObject.getData('shape') || 'rectangle', 
        friction: parseFloat(body.friction.toFixed(2)),
        restitution: parseFloat(body.restitution.toFixed(2)),
    };
}
                
                sceneLayoutData.objects.push(objData);
            }
        }
        
        // --- 4. アニメーションデータも同様に、必要なプロパティだけを抽出する ---
        const scene = this.game.scene.getScene(sceneKey);
        if (scene && scene.anims) {
            sceneLayoutData.animations = scene.anims.anims.getArray()
                .filter(anim => {
                    if (!anim.frames[0]) return false;
                    const sceneObjects = this.editableObjects.get(sceneKey);
                    if (!sceneObjects) return false;
                    return Array.from(sceneObjects).some(go => go.texture.key === anim.frames[0].textureKey);
                })
                         .map(anim => ({ // animオブジェクトそのものではなく、新しいプレーンなオブジェクトを返す
                    key: anim.key,
                    texture: anim.frames[0].textureKey,
                    // framesの定義も、Phaserオブジェクトへの参照を含まないようにする
                    frames: { 
                        start: anim.frames[0].frame.name, 
                        end: anim.frames[anim.frames.length - 1].frame.name 
                    },
                    frameRate: anim.frameRate,
                    repeat: anim.repeat
                }));
        }

        // --- 5. 安全なオブジェクトをJSONに変換 ---
        try {
            const jsonString = JSON.stringify(sceneLayoutData, null, 2);
            console.log(`%c--- Layout for [${sceneKey}] ---`, "color: lightgreen;");
            console.log(jsonString);
            navigator.clipboard.writeText(jsonString).then(() => {
                alert(`Layout for ${sceneKey} copied to clipboard!`);
            });
        } catch (error) {
            console.error("[EditorPlugin] FAILED to stringify layout data. This should not happen with the new structure.", error);
            alert("Failed to export layout. Check the console for a critical error.");
        }
    }

// in src/plugins/EditorPlugin.js

    // ... (既存の exportLayoutToJson メソッド) ...


    /**
     * ★★★ 新規メソッド ★★★
     * 現在選択されている単一のオブジェクトを、プレハブ用のJSONとしてエクスポートする。
     */
    exportSelectionToPrefab() {
        if (!this.selectedObject) {
            alert("プレハブとして保存したいオブジェクトを、まず選択してください。");
            return;
        }

        const gameObject = this.selectedObject;
        const prefabName = prompt("このプレハブの名前を入力してください (例: coin, bullet):", gameObject.name);

        if (!prefabName) {
            console.log("[EditorPlugin] Prefab export cancelled.");
            return;
        }

        // --- 1. 必要なプロパティだけを抽出した、プレーンなオブジェクトを作成 ---
        // (exportLayoutToJsonとほぼ同じロジック)
        const prefabData = {
            // ★ nameはプレハブのデフォルト名として保存
            name: prefabName, 
            type: (gameObject instanceof Phaser.GameObjects.Text) ? 'Text' :
             (gameObject instanceof Phaser.GameObjects.Sprite) ? 'Sprite' : 'Image',
            texture: gameObject.texture.key,
            
            // ★ 座標(x, y)はプレハブに不要なので、含めない

            depth: gameObject.depth,
            scaleX: parseFloat(gameObject.scaleX.toFixed(2)),
            scaleY: parseFloat(gameObject.scaleY.toFixed(2)),
            angle: Math.round(gameObject.angle),
            alpha: parseFloat(gameObject.alpha.toFixed(2)),
        };
        
        // --- 2. getData()で取得した安全なデータを追加 ---
        const group = gameObject.getData('group');
        if (group) prefabData.group = group;

         if (objData.type === 'Text') {
            objData.text = gameObject.text;
            objData.style = {
                // --- 既存のスタイル ---
                fontSize: gameObject.style.fontSize,
                fill: gameObject.style.color,
                // ▼▼▼【新しいスタイルを追加】▼▼▼
                fontFamily: gameObject.style.fontFamily,
                fontStyle: gameObject.style.fontStyle,
                // 影のスタイルも保存
                shadow: {
                    offsetX: gameObject.style.shadowOffsetX,
                    offsetY: gameObject.style.shadowOffsetY,
                    color: gameObject.style.shadowColor,
                    blur: gameObject.style.shadowBlur,
                    stroke: gameObject.style.shadowStroke,
                    fill: gameObject.style.shadowFill
                }
            };
        } else {
           
        // ★★★ textureプロパティが存在するか確認してからキーを取得 ★★★
        if (gameObject.texture && gameObject.texture.key) {
            objData.texture = gameObject.texture.key;
        }
    
            // 画像/スプライトの場合
            objData.texture = gameObject.texture.key;
        }

        const animData = gameObject.getData('animation_data');
        if (animData) prefabData.animation = animData;
        
        const events = gameObject.getData('events');
        if (events && events.length > 0) prefabData.events = events;
        
        const components = gameObject.getData('components');
        if (components && components.length > 0) prefabData.components = components;

        // --- 3. 物理ボディのプロパティを抽出 ---
        if (gameObject.body) {
            const body = gameObject.body;
            prefabData.physics = {
                isStatic: body.isStatic,
                isSensor: body.isSensor,
                ignoreGravity: gameObject.getData('ignoreGravity') === true,
                gravityScale: body.gravityScale.y,
                shape: gameObject.getData('shape') || 'rectangle', 
                friction: parseFloat(body.friction.toFixed(2)),
                frictionAir: parseFloat(body.frictionAir.toFixed(2)), // 空気抵抗も忘れずに
                restitution: parseFloat(body.restitution.toFixed(2)),
            };
        }
        
        // --- 4. 安全なオブジェクトをJSONに変換して出力 ---
        try {
            const jsonString = JSON.stringify(prefabData, null, 2);
            
            console.log(`%c--- Prefab Data for [${prefabName}] ---`, "color: #4CAF50; font-weight: bold;");
            console.log(jsonString);
            
            navigator.clipboard.writeText(jsonString).then(() => {
                alert(`Prefab '${prefabName}' のJSONデータをクリップボードにコピーしました。\n\n'assets/data/prefabs/${prefabName}.json' という名前で保存してください。`);
            });
        } catch (error) {
            console.error("[EditorPlugin] FAILED to stringify prefab data.", error);
            alert("プレハブのエクスポートに失敗しました。コンソールを確認してください。");
        }
    }

    // ... (ファイルの末尾まで) ...
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
        if (!this.eventEditorOverlay || !this.selectedObject) {
            alert('先にイベントを編集するオブジェクトを選択してください。');
            return;
        }
        this.pluginManager.game.input.enabled = false;
        const titleElement = document.getElementById('event-editor-title');
        if (titleElement) titleElement.innerText = `イベント編集: ${this.selectedObject.name}`;
        
        // ★★★ UIを生成するコアメソッドを呼び出す ★★★
        this.populateEventEditor();
        
        this.eventEditorOverlay.style.display = 'flex';
    }

    closeEventEditor() {
        if (!this.eventEditorOverlay) return;
        this.eventEditorOverlay.style.display = 'none';
        this.pluginManager.game.input.enabled = true;
    }
    
    /**
     * イベントエディタのコンテンツを生成・再描画する (UI最終版)
     */
    populateEventEditor() {
        const contentArea = document.getElementById('event-editor-content');
        if (!contentArea || !this.selectedObject) return;
        
        // --- UIを一度完全にクリア ---
        contentArea.innerHTML = '';
        
        // --- データソースを取得 ---
        const events = this.selectedObject.getData('events') || [];
        
        // --- 各イベント定義から、編集UIを生成して追加 ---
        events.forEach((eventData, index) => {
            const eventDiv = this.createEventDisplay(eventData, index);
            contentArea.appendChild(eventDiv);
        });
        
        // --- 「新しいイベントを追加」ボタンを生成 ---
        const addButton = document.createElement('button');
        addButton.innerText = '新しいイベントを追加';
        addButton.className = 'add-event-button'; // スタイリング用
        addButton.onclick = () => {
            const currentEvents = this.selectedObject.getData('events') || [];
            // デフォルトのイベント定義を追加
            currentEvents.push({ trigger: 'onClick', actions: '' });
            this.selectedObject.setData('events', currentEvents);
            this.populateEventEditor(); // UIを再描画
        };
        contentArea.appendChild(addButton);
    }
    
    // in src/plugins/EditorPlugin.js

    /**
     * 個々のイベント編集UIを生成する (全てのトリガーをサポートする統合・最終版)
     * @param {object} eventData - 単一のイベント定義オブジェクト
     * @param {number} index - events配列内でのインデックス
     * @returns {HTMLElement} 生成されたdiv要素
     */
    createEventDisplay(eventData, index) {
        const div = document.createElement('div');
        div.className = 'event-card';

        // --- ヘッダー (トリガー選択と削除ボタン) ---
        const header = document.createElement('div');
        header.className = 'event-header';
        
        const triggerContainer = document.createElement('div');
        const triggerLabel = document.createElement('label');
        triggerLabel.innerText = 'トリガー: ';
        const triggerSelect = document.createElement('select');
        
        // ★★★ 全ての利用可能なトリガーをリスト化 ★★★
        const availableTriggers = ['onClick', 'onReady',  'onOverlap_Start', 'onOverlap_End', 'onCollide_Start','onInteract', 'onStomp', 'onHit', 'onStateChange', 'onDirectionChange'];
        availableTriggers.forEach(t => {
            const option = document.createElement('option');
            option.value = t;
            option.innerText = t;
            if (t === eventData.trigger) option.selected = true;
            triggerSelect.appendChild(option);
        });
        triggerSelect.onchange = (e) => this.updateEventData(index, 'trigger', e.target.value);
        
        triggerContainer.append(triggerLabel, triggerSelect);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerText = '削除';
        deleteBtn.className = 'delete-button';
        deleteBtn.onclick = () => {
            if (confirm('このイベントを削除しますか？')) {
                const events = this.selectedObject.getData('events');
                events.splice(index, 1);
                this.selectedObject.setData('events', events);
                this.populateEventEditor();
            }
        };
        
        header.append(triggerContainer, deleteBtn);
        div.appendChild(header);

        // --- コンテキスト入力欄 (動的に表示) ---
        const contextContainer = document.createElement('div');
        contextContainer.className = 'event-context';
        
        // ▼▼▼【ここが修正の核心です】▼▼▼
        // "onCollide_Start", "onStomp", "onHit" のいずれかの場合に、'targetGroup'入力欄を表示
        if (['onCollide_Start','onOverlap_Start', 'onOverlap_End',  'onStomp', 'onHit'].includes(eventData.trigger)) {
            const targetLabel = document.createElement('label');
            targetLabel.innerText = '相手のグループ: ';
            const targetInput = document.createElement('input');
            targetInput.type = 'text';
            targetInput.placeholder = 'e.g., enemy, coin, wall';
            targetInput.value = eventData.targetGroup || '';
            targetInput.onchange = (e) => this.updateEventData(index, 'targetGroup', e.target.value);
            contextContainer.append(targetLabel, targetInput);
        }
        // "onStateChange", "onDirectionChange" の場合に、'condition'入力欄を表示
        else if (['onStateChange', 'onDirectionChange'].includes(eventData.trigger)) {
            const conditionLabel = document.createElement('label');
            conditionLabel.innerText = '条件(Condition): ';
            const conditionInput = document.createElement('input');
            conditionInput.type = 'text';
            conditionInput.placeholder = "e.g., state === 'walk'";
            conditionInput.value = eventData.condition || '';
            conditionInput.onchange = (e) => this.updateEventData(index, 'condition', e.target.value);
            contextContainer.append(conditionLabel, conditionInput);
        }
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        div.appendChild(contextContainer);

        // --- アクション入力欄 (変更なし) ---
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'event-actions';
        const actionsLabel = document.createElement('label');
        actionsLabel.innerText = 'アクション (Actions):';
        const actionsTextarea = document.createElement('textarea');
        actionsTextarea.placeholder = '[destroy target=other][play_sound key=...]'
        actionsTextarea.value = eventData.actions || '';
        actionsTextarea.onchange = (e) => this.updateEventData(index, 'actions', e.target.value);
        
        actionsContainer.append(actionsLabel, actionsTextarea);
        div.appendChild(actionsContainer);

        return div;
    }
    
    /**
     * ★★★ 新規メソッド ★★★
     * UIからの変更をGameObjectのデータに書き込み、UIを再描画する
     * @param {number} index - events配列内でのインデックス
     * @param {string} key - 変更するプロパティ名 ('trigger', 'targetGroup'など)
     * @param {string} value - 新しい値
     */
    updateEventData(index, key, value) {
        if (!this.selectedObject) return;
        const events = this.selectedObject.getData('events') || [];
        if (events[index]) {
            events[index][key] = value;
            
            // ★ もしトリガーが変更されたら、不要なプロパティを削除してデータを綺麗に保つ
            if (key === 'trigger') {
                delete events[index].targetGroup;
                delete events[index].condition;
            }

            this.selectedObject.setData('events', events);
            this.populateEventEditor(); // ★ UIを再描画して変更を確定させる
        }
    }
    
}
