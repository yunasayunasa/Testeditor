
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

    // ▼▼▼【ここからが新しいコードです】▼▼▼
    // --- 物理エンジン更新前のイベントを捕捉する ---
    // このリスナーはシーンに一つだけあれば良い
   
// --- 物理エンジン更新前のイベントを捕捉する ---
this.matter.world.on('beforeupdate', (event) => {
    // このシーンの物理エンジンインスタンスを取得
    const engine = this.matter.world.engine;
    // ワールドの重力ベクトルを取得 (例: { x: 0, y: 1 })
    const gravity = engine.gravity;

    for (const gameObject of this.children.list) {
        if (gameObject.body && gameObject.getData('ignoreGravity') === true) {
            
            // ▼▼▼【ここをより強力な方法に書き換える】▼▼▼

            // 1. このボディにかかる重力加速度を計算する
            //    (ボディの質量 * ワールドの重力)
            const bodyGravity = {
                x: gameObject.body.mass * gravity.x * gravity.scale,
                y: gameObject.body.mass * gravity.y * gravity.scale
            };

            // 2. その重力を完全に打ち消す、真逆の力を計算する
            const counterForce = {
                x: -bodyGravity.x,
                y: -bodyGravity.y
            };

            // 3. Matter.jsの公式APIを使って、この力をボディに適用する
            Phaser.Physics.Matter.Matter.Body.applyForce(
                gameObject.body,      // 対象のボディ
                gameObject.body.position, // 力の中心点 (ボディの中心)
                counterForce          // 適用する力ベクトル
            );
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        }
    }
});
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

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
     * 単体のオブジェクトにプロパティを適用し、シーンに追加する (最終完成版)
     * ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
     * ★★★ これが、最後の完成版です ★★★
     * ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
     */
    applyProperties(gameObject, layout) {
        const data = layout || {};
   console.log(`%c[BaseGameScene] Applying properties for '${data.name}':`, 'color: lightgreen;', data);
        // --- 1. 基本プロパティ ---
        gameObject.name = data.name || 'untitled';
        if (data.group) gameObject.setData('group', data.group);
        if (data.texture) gameObject.setTexture(data.texture);
        
     
// --- 2. 物理ボディの生成 ---
 // --- 2. 物理ボディの生成 ---
    if (data.physics) {
        const phys = data.physics;
        gameObject.setData('shape', phys.shape || 'rectangle');

        // ▼▼▼【ここも修正します】▼▼▼
        // 物理ボディを生成する際は、もう ignoreGravity オプションに頼らない。
        // 代わりに、gameObject のデータとして ignoreGravity の状態を保存する。
        gameObject.setData('ignoreGravity', phys.ignoreGravity === true);

        const bodyOptions = {
            isStatic: phys.isStatic || false,
            friction: phys.friction !== undefined ? phys.friction : 0.1,
            restitution: phys.restitution !== undefined ? phys.restitution : 0,
        };
        
        // gravityScaleは通常通り設定する
        const gravityY = phys.gravityScale !== undefined ? phys.gravityScale : 1;
        bodyOptions.gravityScale = { x: 0, y: gravityY };
        
        this.matter.add.gameObject(gameObject, bodyOptions);
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
            
    // 形状に応じて、当たり判定を再設定
    if (phys.shape === 'circle') {
        const radius = (gameObject.width + gameObject.height) / 4;
        gameObject.setCircle(radius);
    } else {
        gameObject.setRectangle();
    }
}
        // --- 3. シーンへの追加 ---
        this.add.existing(gameObject);

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
     * オブジェクトにイベントリスナーとエディタ機能を設定する (最終完成版)
     */
    applyEventsAndEditorFunctions(gameObject, eventsData) {
        const events = eventsData || [];
        gameObject.setData('events', events);
        
        gameObject.off('pointerdown');
        gameObject.off('onStateChange');
        gameObject.off('onDirectionChange');

        events.forEach(eventData => {
            
            if (eventData.trigger === 'onClick') {
                gameObject.on('pointerdown', () => {
                    this.runActions(gameObject, eventData, gameObject);
                });
            }

            if (eventData.trigger === 'onStateChange') {
                gameObject.on('onStateChange', (newState, oldState) => {
                    // ★ StateManagerの安全なevalに、評価を依頼する
                    if (this.evaluateConditionWithStateManager(eventData.condition, { state: newState, oldState: oldState })) {
                        this.runActions(gameObject, eventData, gameObject);
                    }
                });
            }
            
            if (eventData.trigger === 'onDirectionChange') {
                gameObject.on('onDirectionChange', (newDirection) => {
                    if (this.evaluateConditionWithStateManager(eventData.condition, { direction: newDirection })) {
                        this.runActions(gameObject, eventData, gameObject);
                    }
                });
            }
        });

        const editor = this.plugins.get('EditorPlugin');
        if (editor && editor.isEnabled) {
            editor.makeEditable(gameObject, this);
        }
    }

    /**
     * ★★★ 新規メソッド：StateManagerの力を借りて、条件式を安全に評価する ★★★
     */
    evaluateConditionWithStateManager(conditionString, context) {
        if (!conditionString || conditionString.trim() === '') {
            return true;
        }
        
        const stateManager = this.registry.get('stateManager');
        if (!stateManager) {
            console.error("[Event System] StateManager not found for condition evaluation.");
            return false;
        }

        // --- 1. "state === 'walk'" のような式を、一時的な変数宣言に変換する ---
        // 例: "let state = 'walk'; let oldState = 'idle'; state === 'walk'"
        let fullExpression = '';
        for (const key in context) {
            const value = context[key];
            if (typeof value === 'string') {
                fullExpression += `let ${key} = '${value}'; `;
            } else {
                fullExpression += `let ${key} = ${value}; `;
            }
        }
        fullExpression += conditionString;

        // --- 2. StateManagerの安全なevalに、この完全な式を渡して評価させる ---
        try {
            return stateManager.eval(fullExpression);
        } catch (e) {
            console.warn(`[Event System] Failed to evaluate condition: "${conditionString}"`, e);
            return false;
        }
    }

    /**
     * ★★★ 新規ヘルパーメソッド ★★★
     * 条件式を安全に評価する
     * @param {string} conditionString - "state === 'walk'" のような条件式
     * @param {object} context - 式の中で利用可能にする変数
     * @returns {boolean} 条件が満たされたかどうか
     */
    evaluateCondition(conditionString, context) {
        // 条件が設定されていなければ、常にtrue (実行する)
        if (!conditionString || conditionString.trim() === '') {
            return true;
        }
        
        const varNames = Object.keys(context);   // 例: ['state', 'oldState']
        const varValues = Object.values(context); // 例: ['walk', 'idle']

        try {
            const func = new Function(...varNames, `'use strict'; return (${conditionString});`);
            return func(...varValues);
        } catch (e) {
            console.warn(`[Event System] Failed to evaluate condition: "${conditionString}"`, e);
            return false; // エラーの場合は実行しない
        }
    }
    
    /**
     * ★★★ 新規ヘルパーメソッド ★★★
     * アクションを実行するための共通処理
     */
    runActions(gameObject, eventData, collidedTarget) {
        const editorUI = this.game.scene.getScene('SystemScene')?.editorUI;
        if (!editorUI || editorUI.currentMode === 'play') {
            if (this.actionInterpreter) {
                // collidedTargetを渡すのを忘れない
                this.actionInterpreter.run(gameObject, eventData.actions, collidedTarget);
            }
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
        if (!this.actionInterpreter) return;
        const events = sourceObject.getData('events');
        if (!events) return;

        for (const eventData of events) {
            if (eventData.trigger === 'onCollide_Start' && eventData.targetGroup === targetObject.getData('group')) {
                console.log(`[Collision] Event triggered: '${sourceObject.name}' collided with group '${eventData.targetGroup}'.`);
                // ★★★ ここに、第3引数として targetObject を追加する ★★★
                this.actionInterpreter.run(sourceObject, eventData.actions, targetObject);
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