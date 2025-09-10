
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
    
       // --- 1. 変数を宣言し、オブジェクトを生成して格納する ---
        let allGameObjects = []; 
        if (layoutData.objects) {
            allGameObjects = layoutData.objects.map(layout => {
                const gameObject = this.createObjectFromLayout(layout);
                if (gameObject) {
                    this.applyProperties(gameObject, layout);
                }
                return gameObject;
            }).filter(Boolean);
        }
        
        console.log(`%c[LOG BOMB 1] buildSceneFromLayout: About to call finalizeSetup with ${allGameObjects.length} objects.`, 'color: yellow; font-weight: bold;', allGameObjects);
        
        // --- 2. finalizeSetupに、完成したリストを「引数」として渡す ---
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
     
// BaseGameScene.js (applyProperties メソッド内)

// --- 2. 物理ボディの生成 ---
// BaseGameScene.js (applyProperties メソッド内)

// --- 2. 物理ボディの生成 ---
if (data.physics) {
    const phys = data.physics;
    gameObject.setData('shape', phys.shape || 'rectangle');

    // ignoreGravity の状態をGameObjectのデータとして設定
    gameObject.setData('ignoreGravity', phys.ignoreGravity === true);

    const bodyOptions = {
        isStatic: phys.isStatic === true, // ★ isStaticを明示的にtrue/falseに
        friction: phys.friction !== undefined ? phys.friction : 0.1,
        restitution: phys.restitution !== undefined ? phys.restitution : 0,
        // collisionFilter: { group: 0, category: 1, mask: 1 }, // 必要であればここに追加
    };
    
    // gravityScale の設定はMatter.jsのオプションとして直接渡す
    // ignoreGravityがtrueの場合はgravityScaleを0にするのは、
    // beforeupdateのロジックがあるので不要（または冗長）
    // ただし、Matter.jsの内部でgravityScaleが0だと衝突が不安定になる場合もあるので、
    // beforeupdateのロジックを優先し、gravityScaleはJSONの値をそのまま適用する。
    bodyOptions.gravityScale = { x: 0, y: phys.gravityScale !== undefined ? phys.gravityScale : 1 };
    
    this.matter.add.gameObject(gameObject, bodyOptions);
    
    // ★重要: Matter.jsのbodyが生成された後、setStatic()を呼び出すのは安全ではない場合があります。
    // add.gameObjectにisStaticを渡していれば、通常は不要です。
    // もしここで落ちる現象が続くなら、この行をコメントアウトして試してください。
    // gameObject.setStatic(phys.isStatic === true); // ★一旦コメントアウト推奨
    
    // 形状に応じて、当たり判定を再設定 (既存のコード)
    if (phys.shape === 'circle') {
        const radius = (gameObject.width + gameObject.height) / 4;
        gameObject.setCircle(radius);
    } else {
        gameObject.setRectangle();
    }

    // ★追加: 最終的なボディの状態をログ出力
    if (gameObject.body) {
        console.log(`%c[BaseGameScene] Body created for '${gameObject.name}' - Final state: isStatic=${gameObject.body.isStatic}, ignoreGravity=${gameObject.getData('ignoreGravity')}, gravityScale.y=${gameObject.body.gravityScale.y}`, 'color: yellow;');
    }
}
// ... (残りのコードは変更なし)
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
      finalizeSetup(allGameObjects) { // ★★★ 3. 引数として、オブジェクトのリストを受け取る ★★★
    console.log(`%c[LOG BOMB 2] finalizeSetup: Received ${allGameObjects.length} objects. Starting onReady loop...`, 'color: yellow; font-weight: bold;', allGameObjects);

        for (const gameObject of allGameObjects) {
            const events = gameObject.getData('events');
            if (events) {
                for (const eventData of events) {
                    if (eventData.trigger === 'onReady') {
                        // ★★★ ログ爆弾 No.3 ★★★
                        console.log(`%c[LOG BOMB 3] finalizeSetup: Found onReady event for '${gameObject.name}'. Running actions...`, 'color: yellow; font-weight: bold;', eventData.actions);
                        if (this.actionInterpreter) {
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
