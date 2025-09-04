
export default class BaseGameScene extends Phaser.Scene {

    // ★★★ create() の代わりに constructor で初期化 ★★★
    constructor(config) {
        super(config); // 親クラスのコンストラクタを呼び出す

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
     * 【データ駆動シーン専用】
     * シーンのcreateメソッドから呼び出される、標準初期化ルーチン
     */
    initSceneWithData() {
        const sceneKey = this.scene.key;
        console.log(`[${sceneKey}] Initializing with data-driven routine...`);

        const layoutData = this.cache.json.get(sceneKey);
        
        this.buildSceneFromLayout(layoutData);
    }

    
    // src/scenes/BaseGameScene.js

    buildSceneFromLayout(layoutData) {
        const sceneKey = this.scene.key;
        if (!layoutData) {
            this.finalizeSetup();
            return;
        }

        // --- 1. まず、シーン全体のアニメーション定義を「先に」登録する ---
        if (layoutData.animations) {
            for (const animData of layoutData.animations) {
                // 同じキーのアニメーションが既に登録されていたら、スキップする
                if (this.anims.exists(animData.key)) continue;
                
  

                let frameConfig;
                // --- 'frames'プロパティが配列かオブジェクトかを見分ける ---
                if (Array.isArray(animData.frames)) {
                    // [1, 2, 3] のような配列の場合
                    frameConfig = { frames: animData.frames };
                } else {
                    // { start: 0, end: 7 } のようなオブジェクトの場合
                    frameConfig = animData.frames;
                }
                
                this.anims.create({
                    key: animData.key,
                    frames: this.anims.generateFrameNumbers(animData.texture, frameConfig),
                    frameRate: animData.frameRate,
                    repeat: animData.repeat
                });
            }
        }
        
        // --- 2. 次に、オブジェクトを生成し、プロパティを適用する ---
        // (この部分は、前回のコードで完璧です)
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
        // ★★★ layout.typeを見て、SpriteかImageかを判断 ★★★
        const textureKey = layout.texture || (layout.name ? layout.name.split('_')[0] : '__DEFAULT');
        
        if (layout.type === 'Sprite') {
            return new Phaser.GameObjects.Sprite(this, 0, 0, textureKey);
        } else {
            // デフォルトはImage
            return new Phaser.GameObjects.Image(this, 0, 0, textureKey);
        }
    }


   // src/scenes/BaseGameScene.js

    /**
     * 【データ駆動シーン専用】
     * 単体のオブジェクトに、プロパティを「適用」し、シーンに追加する (最終確定・完成版)
     * @param {Phaser.GameObjects.GameObject} gameObject - 対象のオブジェクト
     * @param {object} layout - 単一オブジェクトのレイアウト定義
     */
    applyProperties(gameObject, layout) {
        const data = layout || { name: gameObject.name, x: gameObject.x, y: gameObject.y, scaleX: 1, scaleY: 1, angle: 0, alpha: 1, visible: true };

        // --- 1. 基本プロパティの設定 ---
        gameObject.name = data.name;
          if (layout.group) {
            gameObject.setData('group', layout.group);
        }
        

        if (data.texture) gameObject.setTexture(data.texture);
        
        // ★ オブジェクトをシーンの表示リストに「追加」
        this.add.existing(gameObject);

        // --- 2. Transformプロパティの適用 ---
        gameObject.setPosition(data.x, data.y);
        gameObject.setScale(data.scaleX, data.scaleY);
        gameObject.setAngle(data.angle);
        gameObject.setAlpha(data.alpha);
        if (data.visible !== undefined) gameObject.setVisible(data.visible);

        // --- 3. 物理プロパティの適用 ---
        if (data.physics) {
            const phys = data.physics;
            this.physics.add.existing(gameObject, phys.isStatic || false);
            if(gameObject.body) {
                if (!gameObject.body.isStatic) {
                    gameObject.body.setSize(phys.width, phys.height);
                    gameObject.body.setOffset(phys.offsetX, phys.offsetY);
                    gameObject.body.allowGravity = phys.allowGravity;
                    gameObject.body.bounce.setTo(phys.bounceX, phys.bounceY);
                }
                gameObject.body.collideWorldBounds = phys.collideWorldBounds;
            }
        }
// --- イベントデータを読み込み、トリガーを設定 ---
           if (data.events) {
            gameObject.setData('events', data.events);
            data.events.forEach(eventData => {
                if (eventData.trigger === 'onClick') {
                    gameObject.on('pointerdown', () => {
                        // ★ シーンが持つインタープリタを直接使う
                        this.actionInterpreter.run(gameObject, eventData.actions);
                    });
                }
                else if (eventData.trigger.startsWith('onKeyPress')) {
                    const key = eventData.trigger.split('_')[1];
                  

                    // どのキーが、どのアクションを実行するかを、シーンのMapに記録
                    if (!this.keyPressEvents.has(key)) {
                        this.keyPressEvents.set(key, []);
                    }
                    this.keyPressEvents.get(key).push({
                        target: gameObject,
                        actions: eventData.actions
                    });
                }
            });
        }
        
           
        // --- 4. インタラクティブ化とエディタ登録 ---
        // (この処理は、アニメーションを再生する「前」に行う)
        try {
            // テクスチャのサイズが確定するのを待ってから、当たり判定を設定
            if (gameObject.width === 0 || gameObject.height === 0) {
                gameObject.once('textureupdate', () => {
                    gameObject.setSize(gameObject.width, gameObject.height).setInteractive();
                });
            } else {
                 gameObject.setSize(gameObject.width, gameObject.height).setInteractive();
            }

            const editor = this.plugins.get('EditorPlugin');
         // ★★★ イベントの適用を、新しい applyEvents メソッドに一任 ★★★
        this.applyEvents(gameObject, layout.events);
        
        try {
            const editor = this.plugins.get('EditorPlugin');
            if (editor) {
                editor.makeEditable(gameObject, this);
            }
        } catch (e) { console.error(`[BaseGameScene] Failed to make object interactive: '${gameObject.name}'`, e); }
        
        // --- 5. アニメーションプロパティの適用 ---
        // (オブジェクトがインタラクティブになった「後」で、再生を開始する)
        if (data.animation && gameObject.play) {
            gameObject.setData('animation_data', data.animation);
            if (data.animation.default) {
                if (this.anims.exists(data.animation.default)) {
                    gameObject.play(data.animation.default);
                } else {
                    console.warn(`[BaseGameScene] Animation key '${data.animation.default}' not found.`);
                }
            }
        }
        if (data.events) {
        gameObject.setData('events', data.events);
    }
       //const editor = this.plugins.get('EditorPlugin');
        if (editor) {
            editor.makeEditable(gameObject, this);
        }
    }

    /**
     * 単一オブジェクトのイベントリスナーを、クリア＆再設定する
     */
    /*applyEvents(gameObject, eventsData) {
        const events = eventsData || gameObject.getData('events') || [];
        gameObject.setData('events', events);
        
        // --- ゲームプレイ用の 'pointerdown' リスナーを全て削除 ---
        // 'onClick' イベントを持つリスナーだけを狙って削除
        gameObject.off('pointerdown');

        events.forEach(eventData => {
            if (eventData.trigger === 'onClick') {
                // ★★★ EditorPluginのリスナーと競合しないように設定 ★★★
                gameObject.setInteractive(); // 念のため
                gameObject.on('pointerdown', () => {
                    if (this.actionInterpreter) {
                        this.actionInterpreter.run(gameObject, eventData.actions);
                    }
                });
            }
        });
    }*/
    
    /**
     * ★★★ 新規メソッド ★★★
     * EditorPluginから呼び出され、イベントの再構築をトリガーする
     */
    /*onEditorEventChanged(targetObject) {
        console.log(`[${this.scene.key}] Event changed for '${targetObject.name}'. Rebuilding listeners and colliders.`);
        
        // 1. ターゲットオブジェクトのイベントリスナーを再適用
        this.applyEvents(targetObject);

        // 2. シーン全体の物理判定を再構築
        this.rebuildPhysicsInteractions();
    }*/

    
    /**
     * エディタからオブジェクト追加の依頼を受けた時の、デフォルトの処理。
     * 子クラスで、このメソッドをオーバーライドすることを想定。
     */
    addObjectFromEditor(assetKey, newName) {
        console.warn(`[BaseGameScene] addObjectFromEditor is not implemented in '${this.scene.key}'.`);
        return null;
        }
       /**
     * シーン全体の物理的な相互作用を再構築する (遅延初期化対応版)
     */
    /*rebuildPhysicsInteractions() {
        // --- 1. 以前に作成した動的なコライダーを全て破棄 ---
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが遅延初期化と防御的コードです ★★★
        // もし何らかの理由で this.dynamicColliders が存在しなくても、
        // 空の配列としてその場で初期化するため、絶対にエラーにならない。
        if (!this.dynamicColliders) {
            this.dynamicColliders = [];
        }
        this.dynamicColliders.forEach(collider => collider.destroy());
        this.dynamicColliders = []; // 配列を空にする
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        
        // --- 2. 収集したイベントに基づいて、物理エンジンに関係性を設定 ---
        const allGameObjects = this.children.getAll();
        const collisionEvents = [];
        
        allGameObjects.forEach(gameObject => {
            const events = gameObject.getData('events');
            if (events) {
                events.forEach(eventData => {
                    if ((eventData.trigger === 'onCollide_Start' || eventData.trigger === 'onOverlap_Start') && eventData.targetGroup) {
                        collisionEvents.push({
                            source: gameObject,
                            eventType: eventData.trigger === 'onCollide_Start' ? 'collider' : 'overlap',
                            targetGroup: eventData.targetGroup,
                            actions: eventData.actions
                        });
                    }
                });
            }
        });
        
        collisionEvents.forEach(eventInfo => {
            const targetObjects = allGameObjects.filter(obj => obj.getData('group') === eventInfo.targetGroup);
            if (targetObjects.length > 0) {
                const newCollider = this.physics.add[eventInfo.eventType](eventInfo.source, targetObjects, (sourceObject, targetObject) => {
                    if (this.actionInterpreter) {
                        this.actionInterpreter.run(sourceObject, eventInfo.actions);
                    }
                });
                this.dynamicColliders.push(newCollider);
            }
        });
    }*/
      /**
     * 単一オブジェクトのゲームプレイ用イベントリスナーをクリア＆再設定する
     */
    applyEvents(gameObject, eventsData) {
        const events = eventsData || gameObject.getData('events') || [];
        gameObject.setData('events', events);
        
        // 既存のゲームプレイ用 'pointerdown' リスナーをクリア
        gameObject.off('pointerdown');

        events.forEach(eventData => {
            if (eventData.trigger === 'onClick') {
                gameObject.setInteractive();
                gameObject.on('pointerdown', () => {
                    const editor = this.plugins.get('EditorPlugin');
                    const shiftKey = this.input.keyboard.addKey('SHIFT');
                    
                    // エディタが無効、または、Shiftキーが押されている場合のみ、イベントを実行
                    if (!editor || !editor.isEnabled || shiftKey.isDown) {
                        if (this.actionInterpreter) {
                            this.actionInterpreter.run(gameObject, eventData.actions);
                        }
                    } else {
                        console.log(`[GameScene] '${gameObject.name}' clicked. Hold SHIFT to test onClick event.`);
                    }
                });
            }
        });
    }
    
    /**
     * EditorPluginから呼び出され、イベントの再構築をトリガーする
     */
    onEditorEventChanged(targetObject) {
        console.log(`[${this.scene.key}] Rebuilding for '${targetObject.name}'.`);
        this.applyEvents(targetObject); // onClickなどを再設定
        this.rebuildPhysicsInteractions(); // onCollisionなどを再設定
    }

    /**
     * シーン全体の物理的な相互作用（衝突・接触）を再構築する
     */
    rebuildPhysicsInteractions() {
        if (!this.dynamicColliders) {
            this.dynamicColliders = [];
        }
        this.dynamicColliders.forEach(collider => collider.destroy());
        this.dynamicColliders = [];
        
        const allGameObjects = this.children.getAll();
        const collisionEvents = [];

        allGameObjects.forEach(gameObject => {
            const events = gameObject.getData('events');
            if (events) {
                events.forEach(eventData => {
                    if ((eventData.trigger === 'onCollide_Start' || eventData.trigger === 'onOverlap_Start') && eventData.targetGroup) {
                        collisionEvents.push({
                            source: gameObject,
                            eventType: eventData.trigger === 'onCollide_Start' ? 'collider' : 'overlap',
                            targetGroup: eventData.targetGroup,
                            actions: eventData.actions
                        });
                    }
                });
            }
        });
        
        collisionEvents.forEach(eventInfo => {
            const targetObjects = allGameObjects.filter(obj => obj.getData('group') === eventInfo.targetGroup);
            if (targetObjects.length > 0) {
                const newCollider = this.physics.add[eventInfo.eventType](eventInfo.source, targetObjects, (sourceObject, targetObject) => {
                    if (this.actionInterpreter) {
                        this.actionInterpreter.run(sourceObject, eventInfo.actions);
                    }
                });
                this.dynamicColliders.push(newCollider);
            }
        });
    }

    finalizeSetup() {
        console.log(`[${this.scene.key}] Finalizing setup...`);

        if (this.onSetupComplete) {
            this.onSetupComplete();
        }
        
        this.rebuildPhysicsInteractions();
        
        this.events.emit('scene-ready');
        console.log(`[${this.scene.key}] Setup complete. Scene is ready.`);
    }

       /**
     * ★★★ 新規メソッド ★★★
     * 毎フレーム実行され、キーが押されているかをチェックし、イベントを発火させる
     */
    handleKeyPressEvents() {
        if (!this.input.keyboard.enabled) return;
        
        for (const [key, events] of this.keyPressEvents.entries()) {
            const keyObject = this.input.keyboard.addKey(key); // キーオブジェクトを取得
            
            // isDown: キーが「押されている間」、ずっとtrue
            if (Phaser.Input.Keyboard.JustDown(keyObject)) { // JustDown: 押された「瞬間」だけtrue
                events.forEach(event => {
                    this.actionInterpreter.run(event.target, event.actions);
                });
            }
        }
    }
 shutdown() {
        // ★★★ シーン終了時に、イベントリスナーを解除 ★★★
       
        super.shutdown();
    }
}


