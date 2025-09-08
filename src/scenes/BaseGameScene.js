
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
    }
   
    /**
     * JSONデータに基づいてシーンの初期化を開始する。
     * create()メソッドから呼び出されることを想定。
     */
    initSceneWithData() {
        const sceneKey = this.scene.key;
        console.log(`[${sceneKey}] Initializing with data-driven routine...`);
        const layoutData = this.cache.json.get(sceneKey);
        this.buildSceneFromLayout(layoutData);
    }
    
    /**
     * レイアウトデータからシーンのオブジェクトを構築する。
     * @param {object} layoutData - シーンのレイアウトを定義するJSONオブジェクト。
     */
    buildSceneFromLayout(layoutData) {
        if (!layoutData) {
            this.finalizeSetup();
            return;
        }

        // アニメーションの登録
        if (layoutData.animations) {
            layoutData.animations.forEach(animData => {
                if (!this.anims.exists(animData.key)) {
                    this.anims.create({
                        key: animData.key,
                        frames: this.anims.generateFrameNumbers(animData.texture, animData.frames),
                        frameRate: animData.frameRate,
                        repeat: animData.repeat
                    });
                }
            });
        }
        
        // オブジェクトの生成とプロパティ適用
        if (layoutData.objects) {
            // 先にすべてのオブジェクトを生成し、後からプロパティを適用することで、
            // オブジェクト間の依存関係による問題を回避する。
            const createdObjects = layoutData.objects.map(layout => {
                const gameObject = this.createObjectFromLayout(layout);
                return { gameObject, layout };
            });

            createdObjects.forEach(item => {
                if (item.gameObject) {
                    this.applyProperties(item.gameObject, item.layout);
                }
            });
        }
        
        this.finalizeSetup();
    }
    
    /**
     * レイアウト定義に基づいてゲームオブジェクトを生成する。
     * @param {object} layout - 単一オブジェクトのレイアウト定義。
     * @returns {Phaser.GameObjects.GameObject} 生成されたゲームオブジェクト。
     */
    createObjectFromLayout(layout) {
        // テクスチャキーが存在しない場合でもエラーにならないようにデフォルト値を設定
        const textureKey = layout.texture || '__DEFAULT';
        
        if (layout.type === 'Sprite') {
            return new Phaser.GameObjects.Sprite(this, 0, 0, textureKey);
        }
        return new Phaser.GameObjects.Image(this, 0, 0, textureKey);
    }

    /**
     * 単体のゲームオブジェクトにレイアウトデータからプロパティを適用する。
     * @param {Phaser.GameObjects.GameObject} gameObject - プロパティを適用する対象。
     * @param {object} layout - 適用するプロパティが記述されたレイアウトデータ。
     */
    applyProperties(gameObject, layout) {
        // --- 1. 基本プロパティ ---
        gameObject.name = layout.name || 'untitled_object';
        if (layout.texture) gameObject.setTexture(layout.texture);
        if (layout.group) gameObject.setData('group', layout.group);

        // --- 2. シーンへの追加 (これ以降の処理はオブジェクトがシーンに存在することが前提) ---
        this.add.existing(gameObject);
        
        // --- 3. 物理ボディの適用 (Matter.js) ---
        if (layout.physics) {
            const phys = layout.physics;
            // ボディの形状データをGameObjectに保存しておく（エディタでの再表示に利用）
            gameObject.setData('shape', phys.shape || 'rectangle');

            this.matter.add.gameObject(gameObject, {
                isStatic: phys.isStatic || false,
                friction: phys.friction !== undefined ? phys.friction : 0.1,
                restitution: phys.restitution !== undefined ? phys.restitution : 0,
            });
            
            // JSONで定義された形状を適用
            if (phys.shape === 'circle') {
                const radius = (gameObject.width + gameObject.height) / 4;
                gameObject.setCircle(radius);
            }
            // 'rectangle'はデフォルトなので特別な処理は不要
        }

        // --- 4. Transformプロパティ (物理ボディ設定後に適用するのが安全) ---
        gameObject.setPosition(layout.x || 0, layout.y || 0);
        gameObject.setScale(layout.scaleX || 1, layout.scaleY || 1);
        gameObject.setAngle(layout.angle || 0);
        gameObject.setAlpha(layout.alpha !== undefined ? layout.alpha : 1);
        if (layout.visible !== undefined) gameObject.setVisible(layout.visible);
        if (layout.depth !== undefined) gameObject.setDepth(layout.depth);

        // --- 5. アニメーション ---
        if (layout.animation && gameObject.play) {
            gameObject.setData('animation_data', layout.animation);
            if (layout.animation.default && this.anims.exists(layout.animation.default)) {
                gameObject.play(layout.animation.default);
            }
        }

        // --- 6. コンポーネント ---
        if (layout.components && typeof this.addComponent === 'function') {
            layout.components.forEach(comp => {
                this.addComponent(gameObject, comp.type, comp.params);
            });
        }
        
        // --- 7. イベントリスナーとエディタ登録 ---
        this.applyEventsAndEditorFunctions(gameObject, layout.events);
            return gameObject;
    }
    
    /**
     * オブジェクトにイベントリスナーとエディタ機能を設定する。
     * @param {Phaser.GameObjects.GameObject} gameObject - 対象オブジェクト。
     * @param {object[]} eventsData - イベント定義の配列。
     */
    applyEventsAndEditorFunctions(gameObject, eventsData) {
        const events = eventsData || [];
        gameObject.setData('events', events); // 最新のイベントデータを保存
        
        // 既存のゲームプレイ用リスナーをクリア
        gameObject.off('pointerdown');

        // ゲームプレイ用リスナーを設定
        events.forEach(eventData => {
            if (eventData.trigger === 'onClick') {
                gameObject.on('pointerdown', () => {
                    const systemScene = this.game.scene.getScene('SystemScene');
                    const editorUI = systemScene ? systemScene.editorUI : null;
                    
                    // エディタが存在しないか、Playモードの時だけアクションを実行
                    if (!editorUI || editorUI.currentMode === 'play') {
                        if (this.actionInterpreter) {
                            this.actionInterpreter.run(gameObject, eventData.actions);
                        }
                    }
                });
            }
        });

        // エディタプラグインにオブジェクトを登録
        const editor = this.plugins.get('EditorPlugin');
        if (editor && editor.isEnabled) {
            editor.makeEditable(gameObject, this);
        }
    }

 
    /**
     * シーンのセットアップが完了した最終段階で呼ばれる
     */
    finalizeSetup() {
        // --- Matter.jsの衝突イベント監視を開始 ---
        this.matter.world.on('collisionstart', (event) => {
            // event.pairs には、このフレームで衝突を開始したペアが全て含まれる
            for (const pair of event.pairs) {
                const { bodyA, bodyB } = pair;
                
                // bodyからGameObjectを取得
                const objA = bodyA.gameObject;
                const objB = bodyB.gameObject;

                if (objA && objB) {
                    // 両方向の衝突をチェック
                    // (AがBにぶつかったイベント、BがAにぶつかったイベント)
                    this.handleCollision(objA, objB);
                    this.handleCollision(objB, objA);
                }
            }
        });
        
        // (オプション) onOverlapに対応させたい場合は、'collisionactive'も監視する
        
        console.log("[BaseGameScene] Matter.js collision listeners activated.");

        // --- 従来の完了処理 ---
        if (this.onSetupComplete) {
            this.onSetupComplete();
        }
        this.events.emit('scene-ready');
    }

    /**
     * 衝突を処理するコアロジック
     * @param {Phaser.GameObjects.GameObject} sourceObject - イベントの起点
     * @param {Phaser.GameObjects.GameObject} targetObject - 衝突相手
     */
    handleCollision(sourceObject, targetObject) {
        // ActionInterpreterがなければ何もしない
        if (!this.actionInterpreter) return;

        const events = sourceObject.getData('events');
        if (!events) return;

        // sourceObjectに設定されたイベント定義をループ
        for (const eventData of events) {
            // トリガーが'onCollide_Start'で、かつ衝突相手のグループ名が一致するか
            if (eventData.trigger === 'onCollide_Start' && eventData.targetGroup === targetObject.getData('group')) {
                console.log(`[Collision] Event triggered: '${sourceObject.name}' collided with group '${eventData.targetGroup}'.`);
                // 条件が一致したら、ActionInterpreterを実行
                this.actionInterpreter.run(sourceObject, eventData.actions);
            }
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

    // addObjectFromEditor, handleKeyPressEvents, shutdown は変更なし
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