import { ComponentRegistry } from '../components/index.js';
/**
 * データ駆動型ゲームシーンの基底クラス。
 * JSONレイアウトファイルに基づいてシーンを構築し、
 * インゲームエディタとの連携機能を提供する。
 */
export default class BaseGameScene extends Phaser.Scene {

    constructor(config) {
        super(config);
        // このクラスで定義されている他のプロパティは変更なし
        this.dynamicColliders = [];
        this.actionInterpreter = null;
        this.keyPressEvents = new Map();
        this.layoutDataKey = null;
        this.componentsToUpdate = [];
        this._deferredActions = []; 
        this.joystick = null; 
    }
     /**
     * ★★★ 新規メソッド ★★★
     * シーンが起動する際にPhaserによって自動的に呼び出される
     * SystemSceneから渡されたデータを受け取る
     * @param {object} data - SystemScene.launch()から渡されたデータ
     */
    init(data) {
        // dataオブジェクトが存在し、その中にlayoutDataKeyプロパティがあれば、
        // それをこのシーンのプロパティとして保存する
        if (data && data.layoutDataKey) {
            this.layoutDataKey = data.layoutDataKey;
            console.log(`[${this.scene.key}] Initialized with specific layout data key: '${this.layoutDataKey}'`);
        } else {
            // 指定がなければ、nullのまま
            this.layoutDataKey = null;
            console.log(`[${this.scene.key}] Initialized without specific layout data key.`);
        }
    }

/**
     * ★★★ 新規追加 ★★★
     * エディタからジョイスティックを追加するためのプレースホルダー（空の器）。
     * ジョイスティックを必要とするシーン（JumpSceneなど）は、このメソッドをオーバーライドして
     * 具体的な生成ロジックを実装する。
     */
    addJoystickFromEditor(isFromEditor = true) {
        // BaseGameSceneの時点では、何もしない。
        // これにより、ジョイスティックが不要なシーンでエラーが出るのを防ぐ。
        if (isFromEditor) {
            alert(`このシーンタイプ (${this.scene.key}) は、ジョイスティックの追加に対応していません。`);
        }
        console.warn(`[BaseGameScene] addJoystickFromEditor was called on a scene that does not support it.`);
    }
// in src/scenes/BaseGameScene.js

// ... (他のメソッドやimport文はそのまま) ...

/**
 * JSONデータに基づいてシーンの初期化を開始する (データキー動-的選択版)
 */
initSceneWithData() {
    // ★★★ SystemSceneのイベントバスを取得 ★★★
    const systemEvents = this.scene.get('SystemScene').events;

    // ★★★ "start_tutorial" イベントをリッスンする ★★★
    systemEvents.off('start_tutorial', this.handleStartTutorial, this);
    systemEvents.on('start_tutorial', this.handleStartTutorial, this);

    // --- 1. 読み込むべきJSONのキーを決定する ---
    const keyToLoad = this.layoutDataKey || this.scene.key;

    console.log(`[${this.scene.key}] Attempting to build layout from JSON key: '${keyToLoad}'`);

    // --- 2. 決定したキーを使って、キャッシュからJSONデータを取得 ---
    const layoutData = this.cache.json.get(keyToLoad);

    // --- 3. JSONデータが存在するかチェック ---
    if (layoutData) {
        
        // ▼▼▼【ここに追加します！】▼▼▼
        // --------------------------------------------------------------------
        // --- 4. (重要) オブジェクトをビルドする"前"にアニメーションを生成 ---
        this.createAnimationsFromLayout(layoutData); 
        // --------------------------------------------------------------------
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        
        // --- 5. JSONデータに基づいてオブジェクト群をビルド ---
        this.buildSceneFromLayout(layoutData);

    } else {
        // JSONデータが見つからなかった場合の警告
        console.warn(`[${this.scene.key}] No layout data found for JSON key: '${keyToLoad}'`);
        // オブジェクトがなくてもシーンの準備完了を通知する必要がある
        this.finalizeSetup();
    }

    // --- 物理エンジン更新前のイベントを捕捉する ---
    // (この部分はinitSceneWithDataの最後にあるのが適切です)
    this.matter.world.on('beforeupdate', (event) => {
        const engine = this.matter.world.engine;
        const gravity = engine.gravity;

        for (const gameObject of this.children.list) {
            if (gameObject.body && gameObject.getData('ignoreGravity') === true) {
                const bodyGravity = {
                    x: gameObject.body.mass * gravity.x * gravity.scale,
                    y: gameObject.body.mass * gravity.y * gravity.scale
                };
                const counterForce = {
                    x: -bodyGravity.x,
                    y: -bodyGravity.y
                };
                Phaser.Physics.Matter.Matter.Body.applyForce(
                    gameObject.body,
                    gameObject.body.position,
                    counterForce
                );
            }
        }
    });
}

// ▼▼▼【そして、このメソッドをクラス内のどこかに追加してください】▼▼▼
// in src/scenes/BaseGameScene.js

createAnimationsFromLayout(layoutData) {
    if (!layoutData.animations || !Array.isArray(layoutData.animations)) {
        return; // animations配列がなければ何もしない
    }

    layoutData.animations.forEach(animData => {
        if (this.anims.exists(animData.key)) {
            console.warn(`Animation with key '${animData.key}' already exists. Skipping creation.`);
            return;
        }

        // アニメーションを生成
        this.anims.create({
            key: animData.key,
            frames: this.anims.generateFrameNumbers(animData.texture, { 
                start: animData.frames.start, 
                end: animData.frames.end 
            }),
            frameRate: animData.frameRate,
            repeat: animData.repeat
        });

        // ▼▼▼【ここが修正箇所です】▼▼▼
        // animData.key を直接使います
        const createdAnim = this.anims.get(animData.key);
        console.log(`[BaseGameScene] VERIFY: Animation '${animData.key}' was just created. Is it accessible?`, createdAnim ? 'YES' : 'NO');
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    });
}

// ... (deferAction や buildSceneFromLayout などの他のメソッドはそのまま) ...
  // ★★★ 遅延実行キューにアクションを追加するための新しいメソッド ★★★
    deferAction(action) {
        this._deferredActions.push(action);
    }
    /**
     * ★★★ 新規ヘルパーメソッド ★★★
     * 'start_tutorial'イベントを受け取ったときの処理
     * @param {string} tutorialFile - イベントで渡されたシナリオファイル名
     */
    handleStartTutorial(tutorialFile) {
        if (!tutorialFile) return;

        console.log(`[${this.scene.key}] Caught 'start_tutorial' event for file: ${tutorialFile}`);
        
        // SystemSceneにオーバーレイの起動を依頼する
        this.scene.get('SystemScene').events.emit('request-overlay', {
            from: this.scene.key,
            scenario: tutorialFile,
            block_input: false
        });
    }
    /**
     * ★★★ 修正版 ★★★
     * エディタからの要求に応じて、新しいテキストオブジェクトを生成する。
     * @param {string} newName - 新しいオブジェクトに付ける一意な名前
     * @param {string} layerName - オブジェクトが所属するレイヤー名
     * @returns {Phaser.GameObjects.Text} 生成されたテキストオブジェクト
     */
    addTextObjectFromEditor(newName, layerName) { // ← ★ 引数を追加
        const centerX = this.cameras.main.scrollX + this.cameras.main.width / 2;
        const centerY = this.cameras.main.scrollY + this.cameras.main.height / 2;
        
        const layout = {
            name: newName,
            type: 'Text',
            text: 'New Text',
            x: Math.round(centerX),
            y: Math.round(centerY),
            style: {
                fontSize: '32px',
                fill: '#ffffff',
            },
            layer: layerName // ★ 受け取ったlayerNameをlayoutオブジェクトに設定
        };

        const newGameObject = this.createObjectFromLayout(layout);
        this.applyProperties(newGameObject, layout);
        
        return newGameObject;
    }
    
    /**
     * レイアウトデータからシーンのオブジェクトを構築する。
     * @param {object} layoutData - シーンのレイアウトを定義するJSONオブジェクト。
     */

/**
 * ★★★ 二段階初期化を実装した最終FIX版 ★★★
 * レイアウトデータからシーンのオブジェクトを構築・初期化する。
 */
// in src/scenes/BaseGameScene.js

/**
 * ★★★【start()ライフサイクル対応・二段階初期化 最終FIX版】★★★
 * レイアウトデータからシーンのオブジェクトを構築・初期化する。
 */
buildSceneFromLayout(layoutData) {
    if (!layoutData) {
        this.finalizeSetup([]);
        return;
    }

    if (this.editorUI && layoutData.layers) {
        this.editorUI.setLayers(layoutData.layers);
    }
    
    // アニメーション生成ロジックはinitSceneWithDataに集約されているので、ここでは不要
    // (もし残っていたら重複なので削除してOK)

    const allGameObjects = [];
    // ★★★ 全てのstart()を持つコンポーネントを集めるための、巨大な配列 ★★★
    const allComponentsToStart = [];

    if (layoutData.objects) {
        for (const layout of layoutData.objects) {
            const gameObject = this.createObjectFromLayout(layout);
            if (gameObject) {
                // 【第一段階】構築フェーズを実行
                this.applyProperties(gameObject, layout);

                // ▼▼▼【ここが重要！】▼▼▼
                // 【第二段階】初期化フェーズを実行し、start()を持つコンポーネントを受け取る
                const componentsFromThisObject = this.initComponentsAndEvents(gameObject);
                
                // 受け取ったコンポーネントを巨大な配列に結合する
                allComponentsToStart.push(...componentsFromThisObject);
                // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

                allGameObjects.push(gameObject);
            }
        }
    }

    // ▼▼▼【ここがクライマックス！】▼▼▼
    // --------------------------------------------------------------------
    // --- 全てのオブジェクトとコンポーネントの準備が整った、最後の最後でstart()を呼び出す ---
    console.log(`%c[BaseGameScene] Starting ${allComponentsToStart.length} components...`, 'color: orange; font-weight: bold;');
    allComponentsToStart.forEach(component => {
        try {
            component.start();
        } catch (e) {
            console.error(`Error during start() of component on object '${component.gameObject.name}':`, e);
        }
    });
    // --------------------------------------------------------------------
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    this.finalizeSetup(allGameObjects);
}
   
    /**
     * レイアウト定義に基づいてゲームオブジェクトを生成する (テキストオブジェクト対応版)
     * @param {object} layout - 単一オブジェクトのレイアウト定義。
     * @returns {Phaser.GameObjects.GameObject} 生成されたゲームオブジェクト。
     */
    createObjectFromLayout(layout) {
        // ▼▼▼【ここからが修正箇所です】▼▼▼
        
        // --- ケース1: タイプが 'Text' の場合 ---
           if (layout.type === 'Text') {
            const text = layout.text || '';
            
            // ★★★ スタイルオブジェクトをそのまま渡せる ★★★
            const style = layout.style || { fontSize: '32px', fill: '#fff' };
            
            const textObject = new Phaser.GameObjects.Text(this, 0, 0, text, style);

            // ★★★ 影のスタイルは、個別のメソッドで設定する必要がある ★★★
            if (style.shadow && style.shadow.color) {
                textObject.setShadow(
                    style.shadow.offsetX,
                    style.shadow.offsetY,
                    style.shadow.color,
                    style.shadow.blur || 0,
                    style.shadow.stroke,
                    style.shadow.fill
                );
            }
            return textObject;
        }

        // --- ケース2: タイプが 'Sprite' の場合 (変更なし) ---
        if (layout.type === 'Sprite') {
            const textureKey = layout.texture || '__DEFAULT';
            return new Phaser.GameObjects.Sprite(this, 0, 0, textureKey);
        }

        // --- ケース3: デフォルト (Image) の場合 (変更なし) ---
        const textureKey = layout.texture || '__DEFAULT';
        return new Phaser.GameObjects.Image(this, 0, 0, textureKey);
        
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    }
        
// in src/scenes/BaseGameScene.js

// in src/scenes/BaseGameScene.js

/**
 * ★★★【start()ライフサイクル対応版】★★★
 * 構築が完了したGameObjectに対し、コンポーネントとイベントをアタッチする。
 * コンポーネントのインスタンス化のみを行い、start()の呼び出しはbuildSceneFromLayoutに委ねる。
 * @param {Phaser.GameObjects.GameObject} gameObject - 初期化する対象オブジェクト
 * @returns {Array<object>} start()メソッドを持つコンポー-ネントインスタンスの配列
 */
initComponentsAndEvents(gameObject) {
    // start()を持つコンポーネントを収集するための配列
    const componentsToStart = [];

    // --- 1. 既存のコンポーネントインスタンスを破棄 ---
    if (gameObject.components) {
        for (const key in gameObject.components) {
            const component = gameObject.components[key];
            if (this.updatableComponents && this.updatableComponents.has(component)) {
                this.updatableComponents.delete(component);
            }
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        }
    }
    gameObject.components = {};

    // --- 2. データからコンポーネント定義を読み込み、追加・初期化する ---
    const componentsData = gameObject.getData('components');
    if (componentsData) {
        for (const compData of componentsData) {
            const componentInstance = this.addComponent(gameObject, compData.type, compData.params);
            
            // ▼▼▼【ここが重要！】▼▼▼
            // startメソッドを持つコンポーネントを収集する
            if (componentInstance && typeof componentInstance.start === 'function') {
                componentsToStart.push(componentInstance);
            }
        }
    }

    // --- 3. イベントリスナーを（再）設定する ---
    const eventsData = gameObject.getData('events');
    this.applyEventsAndEditorFunctions(gameObject, eventsData);

    // --- 4. オブジェクトをエディタで編集可能にする ---
    const editor = this.plugins.get('EditorPlugin');
    if (editor && editor.isEnabled) {
        editor.makeEditable(gameObject, this);
    }

    // ★★★ 収集したコンポーネントのリストを返す ★★★
    return componentsToStart;
}

/**
 * ★★★【第一段階：構築】最終FIX版 ★★★
 * GameObjectのインスタンスに対し、レイアウトデータに基づいて基本的なプロパティを設定する。
 * このメソッドは、オブジェクトの「ガワ」と「データ」の構築に専念する。
 * コンポーネントのインスタンス化やイベントリスナーの登録は「行わない」。
 * @param {Phaser.GameObjects.GameObject} gameObject - プロパティを適用する対象オブジェクト
 * @param {object} layout - 単一オブジェクトのレイアウト定義
 * @returns {Phaser.GameObjects.GameObject} プロパティ適用後のオブジェクト
 */
applyProperties(gameObject, layout) {
    const data = layout || {};
    gameObject.name = data.name || 'untitled';

    // --- 1. すべてのカスタムデータをGameObjectのデータマネージャーに保存する ---
    // a) JSONの最上位にある汎用データをセット
    if (data.data) {
        for (const key in data.data) {
            gameObject.setData(key, data.data[key]);
        }
    }
    // b) 将来の初期化フェーズで使われるコンポーネントとイベントの「定義」もデータとして保存
    if (data.components) gameObject.setData('components', data.components);
    if (data.events) gameObject.setData('events', data.events);
    if (data.layer) gameObject.setData('layer', data.layer);
    if (data.group) gameObject.setData('group', data.group);
    if (data.anim_prefix) gameObject.setData('anim_prefix', data.anim_prefix);

    // --- 2. シーンにオブジェクトを追加 ---
    this.add.existing(gameObject);
    
    // --- 3. 見た目（Transform）に関するプロパティを設定 ---
    gameObject.setPosition(data.x || 0, data.y || 0);
    gameObject.setScale(data.scaleX || 1, data.scaleY || 1);
    gameObject.setAngle(data.angle || 0);
    gameObject.setAlpha(data.alpha !== undefined ? data.alpha : 1);
    if (data.depth !== undefined) gameObject.setDepth(data.depth);
    if (data.type === 'Text' && data.texture) { // TextオブジェクトはsetTextureを持たないのでガード
        // (Textオブジェクトのスタイル設定はcreateObjectFromLayoutで行われている前提)
    } else if (data.texture) {
        gameObject.setTexture(data.texture);
    }
    
    // --- 4. 物理ボディの生成と設定 ---
    if (data.physics) {
        const phys = data.physics;
        const bodyOptions = { isStatic: phys.isStatic, isSensor: phys.isSensor };
        if (phys.collisionFilter) bodyOptions.collisionFilter = phys.collisionFilter;

        this.matter.add.gameObject(gameObject, bodyOptions);
        
        if (gameObject.body) {
            gameObject.setData('ignoreGravity', phys.ignoreGravity === true);
            if (phys.isSensor) gameObject.setSensor(true);
            gameObject.setStatic(phys.isStatic || false);
            gameObject.setFriction(phys.friction !== undefined ? phys.friction : 0.1);
            gameObject.setFrictionAir(phys.frictionAir !== undefined ? phys.frictionAir : 0.01);
            gameObject.setBounce(phys.restitution !== undefined ? phys.restitution : 0);
            if (phys.fixedRotation !== undefined) {
        gameObject.setFixedRotation(phys.fixedRotation);
    }
            // スケール問題を解決するコード
            gameObject.setData('shape', phys.shape || 'rectangle');
            if (phys.shape === 'circle') {
                const radius = (gameObject.width + gameObject.height) / 4;
                gameObject.setCircle(radius);
            } else {
                gameObject.setRectangle();
            }
            const MatterBody = Phaser.Physics.Matter.Matter.Body;
            MatterBody.scale(gameObject.body, data.scaleX || 1, data.scaleY || 1);
            if (phys.isSensor) gameObject.setSensor(true);
            gameObject.setStatic(phys.isStatic || false);
        }
    }

    return gameObject;
}
    
    /**
     * オブジェクトにイベントリスナーとエディタ機能を設定する (構文修正・最終完成版)
     * ★★★ 以下のメソッドで、既存のものを完全に置き換えてください ★★★
     */
   // in src/scenes/BaseGameScene.js

/**
 * ★★★ イベントリスナー登録を復活させた、真の最終完成版 ★★★
 * オブジェクトにイベントリスナーとエディタ機能を設定する。
 */
applyEventsAndEditorFunctions(gameObject, eventsData) {
    const events = eventsData || [];
    gameObject.setData('events', events);
    
    // --- 1. まず、過去に登録した可能性のあるリスナーをすべてクリアする ---
    //    これにより、再初期化（initComponentsAndEvents）の際にリスナーが重複するのを防ぐ。
    gameObject.off('pointerdown');
    gameObject.off('onStateChange');
    gameObject.off('onDirectionChange');

    // --- 2. データに基づいて、新しいリスナーを設定していく ---
    events.forEach(eventData => {
        
        // --- 'onClick' トリガーの処理 ---
        // (これはプレイモードでのみ発火するよう、リスナー内部で判定)
        if (eventData.trigger === 'onClick') {
            gameObject.on('pointerdown', () => {
                const currentMode = this.registry.get('editor_mode');
                if (currentMode === 'play' && this.actionInterpreter) {
                    this.actionInterpreter.run(gameObject, eventData, gameObject);
                }
            });
        }
          
        // --- 'onStateChange' トリガーの処理 ---
        if (eventData.trigger === 'onStateChange') {
            gameObject.on('onStateChange', (newState, oldState) => {
                // 条件を評価し、満たされればActionInterpreterを実行するヘルパーを呼び出す
                this.evaluateConditionAndRun(gameObject, eventData, { state: newState, oldState: oldState });
            });
        }
        
        // --- 'onDirectionChange' トリガーの処理 ---
        if (eventData.trigger === 'onDirectionChange') {
            gameObject.on('onDirectionChange', (newDirection) => {
                this.evaluateConditionAndRun(gameObject, eventData, { direction: newDirection });
            });
        }

        // ★ 他のカスタムイベントトリガー（onDamageなど）も、必要であればここに追加する
    });

    // --- 3. 最後に、エディタ用のインタラクティブ設定を行う ---
    // (これはゲームプレイのリスナーとは独立している)
    const editor = this.plugins.get('EditorPlugin');
    if (editor && editor.isEnabled) {
        editor.makeEditable(gameObject, this);
    }
}
 // in src/scenes/BaseGameScene.js

/**
 * ★★★ リアルタイム編集対応・最終FIX版 ★★★
 * ターゲットオブジェクトにコンポーネントを追加する。
 * StateMachineComponentが追加された際には、
 * 動作に必要なデフォルトデータを自動的に生成・設定し、初期化(init)まで行う。
 * @param {Phaser.GameObjects.GameObject} target - コンポーネントを追加する対象オブジェクト
 * @param {string} componentType - 追加するコンポーネントのクラス名 (例: 'StateMachineComponent')
 * @param {object} [params={}] - コンポーネントのコンストラクタに渡すパラメータ
 */
// in src/scenes/BaseGameScene.js

/**
 * ★★★【start()ライフサイクル分離・最終確定版】★★★
 * ターゲットオブジェクトにコンポーネントを追加し、インスタンスを返す。
 * このメソッドは、コンポーネントのインスタンス化にのみ責任を持つ。
 * start()やinit()の呼び出しは、上位のメソッド(initComponentsAndEvents)に委ねる。
 */
addComponent(target, componentType, params = {}) {
    if (target.components && target.components[componentType]) {
        console.warn(`[BaseGameScene] Component '${componentType}' already exists on '${target.name}'.`);
        return target.components[componentType]; // 既存のインスタンスを返す
    }

    const ComponentClass = ComponentRegistry[componentType];
    if (!ComponentClass) {
        console.warn(`[BaseGameScene] Unknown component: '${componentType}'`);
        return null;
    }

    const componentInstance = new ComponentClass(this, target, params);

    if (!target.components) target.components = {};
    target.components[componentType] = componentInstance;

    if (typeof componentInstance.update === 'function') {
        if (!this.updatableComponents) this.updatableComponents = new Set();
        this.updatableComponents.add(componentInstance);
    }
    
    // ▼▼▼【start()やinit()の呼び出しを、ここから全て削除！】▼▼▼
    // StateMachineComponentの特殊な初期化も、ここでは行わない。
    // その責務はinitComponentsAndEventsに移譲する。
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    const currentData = target.getData('components') || [];
    if (!currentData.some(c => c.type === componentType)) {
        currentData.push({ type: componentType, params: params });
        target.setData('components', currentData);
    }

    const editor = this.plugins.get('EditorPlugin');
    if (editor && editor.isEnabled && typeof editor.onComponentAdded === 'function') {
        editor.onComponent-Added(target, componentType, params);
    }
    
    // ★★★ 生成したインスタンスを返す ★★★
    return componentInstance;
}
    /**
     * ★★★ updateメソッドを、この内容に置き換える ★★★
     * 遅延実行キューの処理を追加
     */
    update(time, delta) {
        // ▼▼▼【ここからが修正の核心】▼▼▼
        // --- 1. 遅延実行キューに溜まったアクションをすべて実行 ---
        if (this._deferredActions.length > 0) {
            // キューのコピーを作成して、ループ中にキューが変更されても影響を受けないようにする
            const actionsToRun = [...this._deferredActions];
            // 元のキューは空にする
            this._deferredActions.length = 0;
            
            actionsToRun.forEach(action => action());
        }
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

        // --- 2. 既存のコンポーネント更新ループ ---
        if (this.updatableComponents) {
            this.updatableComponents.forEach(component => {
                if (!component.gameObject.scene || !component.gameObject.active) {
                    this.updatableComponents.delete(component);
                    return;
                }
                component.update(time, delta);
            });
        }
    }


 
/**
 * ★★★ 新規ヘルパーメソッド ★★★
 * 条件式を安全に評価し、条件が満たされればアクションを実行する
 * @param {Phaser.GameObjects.GameObject} gameObject - アクションの起点
 * @param {object} eventData - イベント定義
 * @param {object} context - 条件式の中で利用可能にする変数 (例: { state: 'walk' })
 */
evaluateConditionAndRun(gameObject, eventData, context) {
    let conditionMet = true; // デフォルトはtrue

    if (eventData.condition) {
        // --- 1. コンテキストオブジェクトから、変数名と値のリストを作成 ---
        const varNames = Object.keys(context); // 例: ['state', 'oldState']
        const varValues = Object.values(context); // 例: ['walk', 'idle']

        try {
            // --- 2. Functionコンストラクタに、変数名を引数として明示的に渡す ---
            const func = new Function(...varNames, `'use strict'; return (${eventData.condition});`);
            
            // --- 3. 作成した関数に、実際の値を渡して実行 ---
            conditionMet = func(...varValues);

        } catch (e) {
            console.warn(`[Event System] Failed to evaluate condition: "${eventData.condition}"`, e);
            conditionMet = false;
        }
    }

    if (conditionMet) {
        const actionInterpreter = this.registry.get('actionInterpreter');
        if (actionInterpreter) {
            actionInterpreter.run(gameObject, eventData, gameObject);
        }
    }
}
// in src/scenes/BaseGameScene.js

    finalizeSetup(allGameObjects) {
        console.log(`[BaseGameScene] Finalizing setup with ${allGameObjects.length} objects.`);

        for (const gameObject of allGameObjects) {
            const events = gameObject.getData('events');
            if (events) {
                for (const eventData of events) {
                        if (eventData.trigger === 'onReady') {
        const actionInterpreter = this.registry.get('actionInterpreter');
        if (actionInterpreter) {
            actionInterpreter.run(gameObject, eventData, gameObject);
        }
    }
                }
            }
        }
        
        // --- 衝突イベント監視 ---
        this.matter.world.on('collisionstart', (event) => {
            for (const pair of event.pairs) {
                // ▼▼▼【ここに不足していた変数宣言を追加】▼▼▼
                const objA = pair.bodyA.gameObject;
                const objB = pair.bodyB.gameObject;

                if (objA && objB) {
                    this.handleCollision(objA, objB, pair);
                    this.handleCollision(objB, objA, pair);
                }
                // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
            }
        });

        // --- オーバーラップイベント監視 (ここは変更なし) ---
        this.matter.world.on('collisionactive', (event) => {
            for (const pair of event.pairs) {
                if (pair.bodyA.isSensor || pair.bodyB.isSensor) {
                    const objA = pair.bodyA.gameObject;
                    const objB = pair.bodyB.gameObject;
                    if (objA && objB) {
                        this.handleOverlap(objA, objB, 'active');
                        this.handleOverlap(objB, objA, 'active');
                    }
                }
            }
        });

        this.matter.world.on('collisionend', (event) => {
            for (const pair of event.pairs) {
                if (pair.bodyA.isSensor || pair.bodyB.isSensor) {
                    const objA = pair.bodyA.gameObject;
                    const objB = pair.bodyB.gameObject;
                    if (objA && objB) {
                        this.handleOverlap(objA, objB, 'end');
                        this.handleOverlap(objB, objA, 'end');
                    }
                }
            }
        });
        
        console.log("[BaseGameScene] All collision and overlap listeners activated.");

        if (this.onSetupComplete) { this.onSetupComplete(); }
        this.events.emit('scene-ready');
    }

    /**
     * ★★★ 新規メソッド ★★★
     * オーバーラップ（センサー接触）を処理する
     * @param {Phaser.GameObjects.GameObject} sourceObject - イベントの起点
     * @param {Phaser.GameObjects.GameObject} targetObject - 接触相手
     * @param {string} phase - 'active' (重なり中) or 'end' (重なり終了)
     */
    handleOverlap(sourceObject, targetObject, phase) {
        const actionInterpreter = this.registry.get('actionInterpreter');
        if (!actionInterpreter || !sourceObject.getData) return;
        
        const events = sourceObject.getData('events');
        if (!events) return;
     

        // "重なり始め" をエミュレートするためのフラグ管理
        const overlapKey = `overlap_${targetObject.name || targetObject.id}`;
        const wasOverlapping = sourceObject.getData(overlapKey);

        if (phase === 'active' && !wasOverlapping) {
            // --- Overlap Start ---
            sourceObject.setData(overlapKey, true); // 今、重なったことを記録
            for (const eventData of events) {
                if (eventData.trigger === 'onOverlap_Start' && eventData.targetGroup === targetObject.getData('group')) {
                    actionInterpreter.run(sourceObject, eventData, targetObject);
                }
            }
        } else if (phase === 'end' && wasOverlapping) {
            // --- Overlap End ---
            sourceObject.setData(overlapKey, false); // 重なりが解消したことを記録
            for (const eventData of events) {
                if (eventData.trigger === 'onOverlap_End' && eventData.targetGroup === targetObject.getData('group')) {
                   actionInterpreter.run(sourceObject, eventData, targetObject);
                }
            }
        }
    }


      /**
     * 衝突を処理するコアロジック (全ての衝突トリガーに対応した最終確定版)
     * @param {Phaser.GameObjects.GameObject} sourceObject - イベントの起点となるオブジェクト
     * @param {Phaser.GameObjects.GameObject} targetObject - 衝突相手のオブジェクト
     * @param {object} pair - Matter.jsが提供する衝突の詳細情報
     */
    
handleCollision(sourceObject, targetObject, pair) {
        const actionInterpreter = this.registry.get('actionInterpreter');
        if (!actionInterpreter || !sourceObject.getData) return;
        
        const events = sourceObject.getData('events');
        if (!events) return;

        for (const eventData of events) {
            // グループが一致しないイベントは、即座にスキップ
            if (eventData.targetGroup !== targetObject.getData('group')) {
                continue;
            }

            // ▼▼▼【ここが全てのトリガーを正しく捌く、新しいロジックです】▼▼▼

            const trigger = eventData.trigger;

            // --- ケース1: トリガーが 'onCollide_Start' の場合 ---
            // 方向を問わないので、グループが一致すれば即座にアクションを実行
            if (trigger === 'onCollide_Start') {
                console.log(`%c[Collision] COLLIDE Event: '${sourceObject.name}' collided with '${targetObject.name}'`, 'color: yellow');
              actionInterpreter.run(sourceObject, eventData, targetObject);
                // 一致するイベントが見つかったので、このイベント定義に対する処理は終了
                continue; 
            }

            // --- ケース2: トリガーが 'onStomp' または 'onHit' の場合 ---
            // 衝突方向の判定が必要
            if (trigger === 'onStomp' || trigger === 'onHit') {
                
                // 衝突の法線ベクトルを取得し、sourceObject視点に正規化
                let collisionNormal = pair.collision.normal;
                if (sourceObject.body === pair.bodyB) {
                    collisionNormal = { x: -collisionNormal.x, y: -collisionNormal.y };
                }

                const isStomp = collisionNormal.y < -0.7; // ほぼ真上からの衝突
                const isHit = !isStomp; // それ以外は全て 'Hit' とする

                if (trigger === 'onStomp' && isStomp) {
                    console.log(`%c[Collision] STOMP Event: '${sourceObject.name}' stomped on '${targetObject.name}'`, 'color: lightgreen');
                   actionInterpreter.run(sourceObject, eventData, targetObject);
                }
                else if (trigger === 'onHit' && isHit) {
                    console.log(`%c[Collision] HIT Event: '${sourceObject.name}' was hit by '${targetObject.name}'`, 'color: orange');
                    actionInterpreter.run(sourceObject, eventData, targetObject);
                }
            }
            
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        }
    }

    /**
     * エディタからイベント定義が変更された際に呼び出される。
     * @param {Phaser.GameObjects.GameObject} targetObject - 対象オブジェクト。
     */
    onEditorEventChanged(targetObject) {
        console.log(`[${this.scene.key}] Rebuilding events for '${targetObject.name}'.`);
        // イベントリスナーのみを再適用する
        this.applyEventsAndEditorFunctions(targetObject, targetObject.getData('events'));
    }

     /**
     * ★★★ 新規メソッド ★★★
     * エディタからオブジェクトを追加するための、中核となるロジック。
     * 継承先のシーンから呼び出されることを想定。
     * @param {object} createLayout - createObjectFromLayoutに渡すための情報（例: { texture, type }）
     * @param {string} newName - 新しいオブジェクトの名前
     * @param {string} layerName - 所属するレイヤー名
     * @returns {Phaser.GameObjects.GameObject}
     */
   // in src/scenes/BaseGameScene.js

/**
 * ★★★ 二段階初期化を呼び出す最終FIX版 ★★★
 * エディタからオブジェクトを追加するための中核ロジック。
 */
_addObjectFromEditorCore(createLayout, newName, layerName) {
    const centerX = this.cameras.main.scrollX + this.cameras.main.width / 2;
    const centerY = this.cameras.main.scrollY + this.cameras.main.height / 2;
    
    // --- 1. まず、生成するオブジェクトの完全なレイアウトデータを作成 ---
    const newObjectLayout = {
        ...createLayout, // { texture, type } などの情報
        name: newName,
        x: Math.round(centerX), 
        y: Math.round(centerY),
        layer: layerName
    };
    
    // --- 2. GameObjectのインスタンスを生成 ---
    const newGameObject = this.createObjectFromLayout(newObjectLayout);

    if (newGameObject) {
        // ▼▼▼【ここが修正の核心です】▼▼▼
        // 3. 【第一段階】構築フェーズを実行
        this.applyProperties(newGameObject, newObjectLayout);

        // 4. 【第二段階】初期化フェーズを実行
        this.initComponentsAndEvents(newGameObject);
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    }
    
    return newGameObject;
}

    /**
     * addObjectFromEditor のデフォルト実装。
     * 継承先でオーバーライドされなかった場合に、警告を出すためのもの。
     */
    addObjectFromEditor(assetKey, newName, layerName) {
        console.warn(`[BaseGameScene] addObjectFromEditor is not implemented in '${this.scene.key}'. Using default image implementation.`);
        // 最低限のフォールバックとして、Imageオブジェクトを追加する
        return this._addObjectFromEditorCore({ texture: assetKey, type: 'Image' }, newName, layerName);
    }
    

    handleKeyPressEvents() {
       const actionInterpreter = this.registry.get('actionInterpreter');
        if (!actionInterpreter || !sourceObject.getData) return;
        
        const events = sourceObject.getData('events');
        if (!events) return;
        for (const [key, events] of this.keyPressEvents.entries()) {
            const keyObject = this.input.keyboard.addKey(key);
            if (Phaser.Input.Keyboard.JustDown(keyObject)) {
                events.forEach(event => {
                    if(actionInterpreter) this.actionInterpreter.run(sourceObject, eventData, targetObject);
                });
            }
        }
    }

    
    // in BaseGameScene.js
// in BaseGameScene.js

    /**
     * ★★★ 最終FIX版 (変数名修正) ★★★
     * エディタからの要求に応じて、プレハブをシーンにインスタンス化する。
     * 単一プレハブとグループプレハブの両方に対応する。
     */
    addPrefabFromEditor(prefabKey, newName, layerName) { // ← newName を受け取る
        const prefabData = this.cache.json.get(prefabKey);
        if (!prefabData) {
            console.error(`[BaseGameScene] Prefab data for key '${prefabKey}' not found.`);
            return null;
        }

        const spawnPos = {
            x: this.cameras.main.scrollX + this.cameras.main.width / 2,
            y: this.cameras.main.scrollY + this.cameras.main.height / 2
        };

        if (prefabData.type === 'GroupPrefab') {
            
            console.log(`[BaseGameScene] Reconstructing Group Prefab: '${prefabKey}'`);
            
            // ▼▼▼【ここが修正箇所です】▼▼▼
            // prefabName ではなく、引数で渡された newName を使う
            const newGroupId = `group_${newName}_${Phaser.Math.RND.uuid().substr(0,4)}`;
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

            const createdObjects = [];
            prefabData.objects.forEach(childLayout => {
                const newLayout = { ...childLayout };
                newLayout.x = spawnPos.x + (childLayout.x || 0);
                newLayout.y = spawnPos.y + (childLayout.y || 0);
                newLayout.group = newGroupId;
                newLayout.layer = layerName;

                const newGameObject = this.createObjectFromLayout(newLayout);
                if (newGameObject) {
                    this.applyProperties(newGameObject, newLayout);
                    createdObjects.push(newGameObject);
                }
            });
            
            return createdObjects;

        } else {
            
            const newObjectLayout = { ...prefabData };
            newObjectLayout.name = newName;
            newObjectLayout.x = spawnPos.x;
            newObjectLayout.y = spawnPos.y;
            newObjectLayout.layer = layerName;

            const newGameObject = this.createObjectFromLayout(newObjectLayout);
            this.applyProperties(newGameObject, newObjectLayout);
            
            return newGameObject;
        }
    }
    /**
     * ★★★ 新規・最終実装 ★★★
     * 始点オブジェクトを元に、終点までの矩形範囲をオブジェクトで塗りつぶす。
     * @param {Phaser.GameObjects.GameObject} sourceObject - 塗りつぶしの元となるブラシオブジェクト
     * @param {{x: number, y: number}} endPoint - クリックされた終点のワールド座標
     */
   // in BaseGameScene.js

  // in BaseGameScene.js

    /**
     * ★★★ 最終完成版・改 ★★★
     * 座標計算の基準点を修正し、コンテナに正しい入力エリアを設定する。
     */
   // in BaseGameScene.js

   // in BaseGameScene.js

    /**
     * ★★★ 究極の最終FIX版・改5 ★★★
     * Containerに直接子オブジェクトを追加し、原点を補正する。
     */
    fillObjectRange(sourceObject, endPoint) {
        if (!sourceObject || !sourceObject.scene) return;

        // --- 1. グリッドとループ範囲の計算 (変更なし) ---
        const gridWidth = sourceObject.displayWidth;
        const gridHeight = sourceObject.displayHeight;
        const startGridX = Math.round(sourceObject.x / gridWidth);
        const startGridY = Math.round(sourceObject.y / gridHeight);
        const endGridX = Math.round(endPoint.x / gridWidth);
        const endGridY = Math.round(endPoint.y / gridHeight);
        const fromX = Math.min(startGridX, endGridX);
        const toX = Math.max(startGridX, endGridX);
        const fromY = Math.min(startGridY, endGridY);
        const toY = Math.max(startGridY, endGridY);

        // --- 2. 複製元レイアウトの作成 (変更なし) ---
        const sourceLayout = this.extractLayoutFromObject(sourceObject);
        delete sourceLayout.physics; // 子オブジェクトは物理ボディを持たない

        // --- 3. このグループのための一意なIDを生成 ---
        const groupId = `fill_group_${Phaser.Math.RND.uuid()}`;
        console.log(`[BaseGameScene | Final Design] Creating new group with ID: ${groupId}`);
        
        // --- 4. 矩形範囲をループして、オブジェクトを配置 ---
        for (let gx = fromX; gx <= toX; gx++) {
            for (let gy = fromY; gy <= toY; gy++) {
                
                const newLayout = { ...sourceLayout };
                
                newLayout.x = gx * gridWidth + gridWidth / 2;
                newLayout.y = gy * gridHeight + gridHeight / 2;
                newLayout.name = `${sourceLayout.name}_${gx}_${gy}`;
                
                // ★★★ すべてのオブジェクトに、同じグループIDをデータとして設定 ★★★
                newLayout.group = groupId;

                // ★★★ 物理ボディも、各オブジェクトが個別に持つ ★★★
                if (newLayout.physics) {
                    newLayout.physics.width = sourceLayout.displayWidth; // スケールを考慮したサイズ
                    newLayout.physics.height = sourceLayout.displayHeight;
                }
                
                const newGameObject = this.createObjectFromLayout(newLayout);
                if (newGameObject) {
                    this.applyProperties(newGameObject, newLayout);
                }
            }
        }

        // --- 5. ブラシを破棄 ---
        sourceObject.destroy();
    }
// in src/scenes/BaseGameScene.js

    /**
     * ★★★ 新規ヘルパーメソッド ★★★
     * 指定されたグループIDに所属する、全てのGameObjectの配列を返す
     * @param {string} groupId - 検索するグループID
     * @returns {Array<Phaser.GameObjects.GameObject>}
     */
    getObjectsByGroup(groupId) {
        if (!groupId) return [];
        // シーンの表示リスト(this.children.list)から、
        // getData('group')がgroupIdと一致するオブジェクトを全て絞り込んで返す
        return this.children.list.filter(obj => obj.getData('group') === groupId);
    }
    
    // in BaseGameScene.js

    /**
     * ★★★ 完全版 ★★★
     * 既存のGameObjectから、複製や保存に使えるプレーンなレイアウトオブジェクトを抽出する。
     * @param {Phaser.GameObjects.GameObject} gameObject - 抽出元のオブジェクト
     * @returns {object} 抽出されたレイアウト情報
     */
    extractLayoutFromObject(gameObject) {
        if (!gameObject || !gameObject.scene) {
            return {}; // 安全のため空オブジェクトを返す
        }

        const layout = {
            name: gameObject.name,
            type: gameObject.constructor.name, // 'Image', 'Sprite', 'Text', 'Container' などを自動で取得

            // --- Transform ---
            x: Math.round(gameObject.x),
            y: Math.round(gameObject.y),
            scaleX: parseFloat(gameObject.scaleX.toFixed(3)),
            scaleY: parseFloat(gameObject.scaleY.toFixed(3)),
            angle: Math.round(gameObject.angle),
            alpha: parseFloat(gameObject.alpha.toFixed(3)),
            depth: gameObject.depth,
            
            // ★ スケールを考慮した表示サイズも保存
            displayWidth: gameObject.displayWidth,
            displayHeight: gameObject.displayHeight,

            // --- Data ---
            group: gameObject.getData('group'),
            layer: gameObject.getData('layer'),
            components: gameObject.getData('components'),
            events: gameObject.getData('events'),
        };

        // --- タイプに応じた固有のプロパティを追加 ---
        if (gameObject instanceof Phaser.GameObjects.Text) {
            layout.text = gameObject.text;
            layout.style = gameObject.style.toJSON();
        } 
        else if (gameObject instanceof Phaser.GameObjects.Sprite) {
            // Sprite と Image の両方が texture を持つ
            layout.texture = gameObject.texture.key;
            // Sprite は frame も持つ
            layout.frame = gameObject.frame.name;
        }
        else if (gameObject instanceof Phaser.GameObjects.Image) {
            layout.texture = gameObject.texture.key;
        }
        
        // --- 物理ボディ情報もコピー ---
        if (gameObject.body) {
            const body = gameObject.body;
            layout.physics = {
                isStatic: body.isStatic,
                isSensor: body.isSensor,
                fixedRotation: body.fixedRotation, // ★ 回転固定の状態を保存
                shape: gameObject.getData('shape') || 'rectangle',
                ignoreGravity: gameObject.getData('ignoreGravity') === true,
                friction: body.friction,
                restitution: body.restitution,
                collisionFilter: {
                    category: body.collisionFilter.category,
                    mask: body.collisionFilter.mask
                }
            };
        }
        
        return layout;
    }
    shutdown() {
        super.shutdown();
    }
}