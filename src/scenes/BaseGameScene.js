
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
    // --- ガード節: レイアウトデータがなければ、何もせず終了 ---
    if (!layoutData) {
        this.finalizeSetup([]); // 空のリストを渡して、シーンを正常に完了させる
        return;
    }

    // --- 1. アニメーションの登録 (変更なし) ---
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
    
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★★★ これが、全てを解決する、最後のロジックです ★★★
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

    // --- 2. オブジェクトの生成とプロパティ適用 ---
    const allGameObjects = []; // 生成されたGameObjectを格納する、信頼できるリスト

    if (layoutData.objects) {
        // a. 全てのオブジェクト定義をループする
        for (const layout of layoutData.objects) {
            // b. GameObjectを生成する
            const gameObject = this.createObjectFromLayout(layout);
            
            if (gameObject) {
                // c. 生成に成功したら、プロパティを適用する
                this.applyProperties(gameObject, layout);
                // d. そして、信頼できるリストに追加する
                allGameObjects.push(gameObject);
            }
        }
    }
    
    // --- 3. 全てのオブジェクトが揃った状態で、最終処理を呼び出す ---
    this.finalizeSetup(allGameObjects);
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
        
        if (layout.scrollable) {
            gameObject.setData('isScrollable', true);
        }
     
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
     * オブジェクトにイベントリスナーとエディタ機能を設定する (構文修正・最終完成版)
     * ★★★ 以下のメソッドで、既存のものを完全に置き換えてください ★★★
     */
    applyEventsAndEditorFunctions(gameObject, eventsData) {
        const events = eventsData || [];
        gameObject.setData('events', events);
        
        // --- 既存のゲームプレイ用リスナーを全てクリア ---
        gameObject.off('pointerdown');
        gameObject.off('onStateChange');
        gameObject.off('onDirectionChange');

        // --- 新しいリスナーを設定 ---
        events.forEach(eventData => {
            
         


            // --- 'onClick' トリガーの処理 ---
            if (eventData.trigger === 'onClick') {
                gameObject.on('pointerdown', () => {
                    const editorUI = this.game.scene.getScene('SystemScene')?.editorUI;
                    if (!editorUI || editorUI.currentMode === 'play') {
                        if (this.actionInterpreter) {
                            this.actioninterpreter.run(gameObject, eventData.actions, gameObject);
                        }
                    }
                });
            }

              // --- 'onStateChange' トリガーの処理 ---
            if (eventData.trigger === 'onStateChange') {
                gameObject.on('onStateChange', (newState, oldState) => {
                    // ★ 変数名を state, oldState で統一
                    this.evaluateConditionAndRun(gameObject, eventData, { state: newState, oldState: oldState });
                });
            }
            
            // --- 'onDirectionChange' トリガーの処理 ---
            if (eventData.trigger === 'onDirectionChange') {
                gameObject.on('onDirectionChange', (newDirection) => {
                    // ★ 変数名を direction で統一
                    this.evaluateConditionAndRun(gameObject, eventData, { direction: newDirection });
                });
            }
            
        }); // ★★★ ここが、forEach ループの正しい閉じ括弧です ★★★

        // --- エディタへの登録 (変更なし) ---
        const editor = this.plugins.get('EditorPlugin');
        if (editor && editor.isEnabled) {
            editor.makeEditable(gameObject, this);
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

    if (conditionMet && this.actionInterpreter) {
        this.actionInterpreter.run(gameObject, eventData.actions, gameObject);
    }
}
    /**
     * シーンのセットアップが完了した最終段階で呼ばれる
     */
    finalizeSetup() {
              // --- 1. まず、全てのオブジェクトに対して onReady イベントを実行する ---
            // --- 1. 全ての生成済みオブジェクトに対して onReady イベントを実行する ---
        for (const gameObject of allGameObjects) {
            const events = gameObject.getData('events');
            if (events) {
                for (const eventData of events) {
                    if (eventData.trigger === 'onReady') {
                        if (this.actionInterpreter) {
                            console.log(`[Event System] Firing 'onReady' event for '${gameObject.name}' in finalizeSetup.`);
                            this.actionInterpreter.run(gameObject, eventData.actions, gameObject);
                        }
                    }
                }
            }
        }
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