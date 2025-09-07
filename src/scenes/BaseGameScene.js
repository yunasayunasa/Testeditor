export default class BaseGameScene extends Phaser.Scene {

    constructor(config) {
        super(config);

        /**
         * このシーンで動的に生成された物理コライダーを管理する配列。
         * @type {Phaser.Physics.Arcade.Collider[]}
         */
        this.dynamicColliders = [];

        /**
         * このシーンのアクションインタープリタ。
         * 継承先でインスタンス化されることを想定。
         * @type {ActionInterpreter | null}
         */
        this.actionInterpreter = null;
        
        /**
         * キープレスイベントを管理するマップ。
         * @type {Map<string, Array<object>>}
         */
        this.keyPressEvents = new Map();
    }
   
    /**
     * シーンのcreateメソッドから呼び出される、標準初期化ルーチン
     */
    initSceneWithData() {
        const sceneKey = this.scene.key;
        console.log(`[${sceneKey}] Initializing with data-driven routine...`);

        const layoutData = this.cache.json.get(sceneKey);
        
        this.buildSceneFromLayout(layoutData);
    }
    
    buildSceneFromLayout(layoutData) {
        const sceneKey = this.scene.key;
        if (!layoutData) {
            this.finalizeSetup();
            return;
        }

        if (layoutData.animations) {
            for (const animData of layoutData.animations) {
                if (this.anims.exists(animData.key)) continue;
                
                let frameConfig = Array.isArray(animData.frames) 
                    ? { frames: animData.frames } 
                    : animData.frames;
                
                this.anims.create({
                    key: animData.key,
                    frames: this.anims.generateFrameNumbers(animData.texture, frameConfig),
                    frameRate: animData.frameRate,
                    repeat: animData.repeat
                });
            }
        }
        
        if (layoutData.objects) {
            const createdObjects = [];
            for (const layout of layoutData.objects) {
                const gameObject = this.createObjectFromLayout(layout);
                if (gameObject) createdObjects.push({ gameObject, layout });
            }
            for (const item of createdObjects) {
                this.applyProperties(item.gameObject, item.layout);
            }
        }
        
        this.finalizeSetup();
    }
    
    /**
     * レイアウト定義から、正しい「種類」のゲームオブジェクトを生成する
     */
    createObjectFromLayout(layout) {
        const textureKey = layout.texture || (layout.name ? layout.name.split('_')[0] : '__DEFAULT');
        
        return (layout.type === 'Sprite')
            ? new Phaser.GameObjects.Sprite(this, 0, 0, textureKey)
            : new Phaser.GameObjects.Image(this, 0, 0, textureKey);
    }

  /**
 * 単体のオブジェクトにプロパティを適用し、シーンに追加する (最終完成版)
 * ★★★ 以下のメソッドで、既存の applyProperties を完全に置き換えてください ★★★
 */
  /**
     * 単体のオブジェクトにプロパティを適用し、シーンに追加する (完全な権限を持つ最終完成版)
     */
    applyProperties(gameObject, layout) {
        const data = layout || {};

        // --- 1. 基本プロパティ ---
        gameObject.name = data.name || 'untitled';
        if (data.group) gameObject.setData('group', data.group);
        if (data.texture) gameObject.setTexture(data.texture);
        
        // --- 2. 物理ボディの生成 ---
        if (data.physics) {
            const phys = data.physics;
            gameObject.setData('shape', phys.shape || 'rectangle');

            this.matter.add.gameObject(gameObject, {
                isStatic: phys.isStatic || false,
                friction: phys.friction !== undefined ? phys.friction : 0.1,
                restitution: phys.restitution !== undefined ? phys.restitution : 0,
            });
            
            if (phys.shape === 'circle') {
                const radius = (gameObject.width + gameObject.height) / 4;
                gameObject.setCircle(radius);
            } else {
                gameObject.setRectangle();
            }
        }
        
        // --- 3. シーンへの追加 ---
        this.add.existing(gameObject);

    // --- 4. Transform (物理ボディ生成の後に設定) ---
    gameObject.setPosition(data.x || 0, data.y || 0);
    gameObject.setScale(data.scaleX || 1, data.scaleY || 1);
    gameObject.setAngle(data.angle || 0);
    gameObject.setAlpha(data.alpha !== undefined ? data.alpha : 1);
    if (data.visible !== undefined) gameObject.setVisible(data.visible);

    // --- 5. イベントとエディタ機能の適用 ---
    this.applyEventsAndEditorFunctions(gameObject, data.events);
    
    // --- 5. インタラクティブ化 (BaseGameSceneの責務) ---
        // ★ Arcade Physicsの時と同じ、シンプルなロジックに戻す
        try {
            this.input.setDraggable(gameObject.setInteractive());
        } catch(e) {
            console.warn(`[BaseGameScene] Failed to setInteractive on '${gameObject.name}'`, e);
        }

        // --- 6. EditorPluginに、編集リストへの追加だけを依頼 ---
        const editor = this.plugins.get('EditorPlugin');
        if (editor && editor.isEnabled) {
            editor.registerEditable(gameObject, this);
        }
        
        // --- 5. アニメーションプロパティ ---
        if (data.animation && gameObject.play) {
            gameObject.setData('animation_data', data.animation);
            if (data.animation.default && this.anims.exists(data.animation.default)) {
                gameObject.play(data.animation.default);
            }
        }
       // ★★★ 6. コンポーネントプロパティ ★★★
        // (あなたの元のコードを、より確実な形に修正)
        if (layout.components && typeof this.addComponent === 'function') {
            for (const componentDef of layout.components) {
                this.addComponent(gameObject, componentDef.type, componentDef.params);
            }
        }
     // --- 7. 全てのプロパティ設定が完了した、一番最後にインタラクティブ化！ ---
    try {
        if (gameObject.body) {
            // Matter.jsオブジェクトの場合
            gameObject.setInteractive({
                hitArea: gameObject.body,
                hitAreaCallback: Phaser.Physics.Matter.Matter.Body.contains,
                draggable: true
            });
        } else {
            // 通常のオブジェクトの場合
            gameObject.setInteractive();
            this.input.setDraggable(gameObject);
        }
    } catch(e) {
        console.warn(`[BaseGameScene] Failed to setInteractive on '${gameObject.name}'`, e);
    }
}
    

    /**
     * オブジェクトにイベントリスナーとエディタ機能を（再）設定する
     */
    applyEventsAndEditorFunctions(gameObject, eventsData) {
        const events = eventsData || gameObject.getData('events') || [];
        gameObject.setData('events', events);
        
        // --- 1. 既存のリスナーを全てクリアして競合を防ぐ ---
        gameObject.off('pointerdown');

        // --- 2. インタラクティブ化とエディタへの登録 ---
        // (リスナー設定の前に一度だけ行えば良い)
        try {
            if (!gameObject.input) { // まだインタラクティブでなければ
                 if (gameObject.width === 0 || gameObject.height === 0) {
                    gameObject.once('textureupdate', () => gameObject.setSize(gameObject.width, gameObject.height).setInteractive());
                } else {
                     gameObject.setSize(gameObject.width, gameObject.height).setInteractive();
                }
            }
            const editor = this.plugins.get('EditorPlugin');
            if (editor && editor.isEnabled) {
                editor.makeEditable(gameObject, this);
            }
        } catch (e) {
            console.error(`[BaseGameScene] Failed to make object interactive: '${gameObject.name}'`, e);
        }

        // --- 3. 新しいゲームプレイ用リスナーを設定 ---
        events.forEach(eventData => {
            if (eventData.trigger === 'onClick') {
                gameObject.on('pointerdown', () => {
                    const systemScene = this.game.scene.getScene('SystemScene');
                    const editorUI = systemScene ? systemScene.editorUI : null;
                    
                    // Playモードの時、またはエディタが存在しない時だけ実行
                    if (!editorUI || editorUI.currentMode === 'play') {
                        if (this.actionInterpreter) {
                            this.actionInterpreter.run(gameObject, eventData.actions);
                        }
                    }
                });
            }
        });
    }
    
    /**
     * EditorPluginから呼び出され、イベントの再構築をトリガーする
     */
    onEditorEventChanged(targetObject) {
        console.log(`[${this.scene.key}] Rebuilding events for '${targetObject.name}'.`);
        this.applyEventsAndEditorFunctions(targetObject);
        // ★ 物理判定の再構築は不要
    }


      /**
     * シーンのセットアップが完了した最終段階で呼ばれる
     * ★★★ 以下のメソッドで、既存の finalizeSetup を完全に置き換えてください ★★★
     */
    finalizeSetup() {
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ ここで、Matter.jsの衝突イベントを監視します ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        this.matter.world.on('collisionstart', (event, bodyA, bodyB) => {
            // bodyAとbodyBは、衝突した2つの「物理ボディ」
            // それぞれに対応するGameObjectを取得
            const objA = bodyA.gameObject;
            const objB = bodyB.gameObject;

            // どちらかのオブジェクトが存在しない場合は何もしない
            if (!objA || !objB) return;

            // それぞれのオブジェクトについて、衝突イベントを処理
            this.handleCollision(objA, objB);
            this.handleCollision(objB, objA);
        });
        
        // (オプション) onOverlapに対応させたい場合は、'collisionactive'も監視する
        // this.matter.world.on('collisionactive', (event, bodyA, bodyB) => { ... });

        // --- 従来の後処理 ---
        if (this.onSetupComplete) {
            this.onSetupComplete();
        }
        
        this.events.emit('scene-ready');
        console.log(`[${this.scene.key}] Setup complete. Matter.js collision listeners are active. Scene is ready.`);
    }

    /**
     * ★★★ 新規メソッド：衝突を処理するコアロジック ★★★
     * @param {Phaser.GameObjects.GameObject} sourceObject - イベントの起点となるオブジェクト
     * @param {Phaser.GameObjects.GameObject} targetObject - 衝突相手のオブジェクト
     */
    handleCollision(sourceObject, targetObject) {
        const events = sourceObject.getData('events');
        if (!events || !this.actionInterpreter) return;

        // sourceObjectに設定されたイベント定義をループ
        for (const eventData of events) {
            // トリガーが'onCollide_Start'で、かつ衝突相手のグループが一致するかチェック
            if (eventData.trigger === 'onCollide_Start' && eventData.targetGroup === targetObject.getData('group')) {
                console.log(`[Collision] '${sourceObject.name}' collided with '${targetObject.name}'. Running actions.`);
                // 条件が一致したら、ActionInterpreterを実行
                this.actionInterpreter.run(sourceObject, eventData.actions);
            }
            // (オプション) 'onOverlap_Start'もここに追加
        }
    }
    
    
    addObjectFromEditor(assetKey, newName) {
        console.warn(`[BaseGameScene] addObjectFromEditor is not implemented in '${this.scene.key}'.`);
        return null;
    }

    handleKeyPressEvents() {
        if (!this.input.keyboard.enabled) return;
        for (const [key, events] of this.keyPressEvents.entries()) {
            const keyObject = this.input.keyboard.addKey(key);
            if (Phaser.Input.Keyboard.JustDown(keyObject)) {
                events.forEach(event => {
                    if(this.actionInterpreter) this.actionInterpreter.run(event.target, event.actions);
                });
            }
        }
    }

    shutdown() {
        super.shutdown();
    }
}