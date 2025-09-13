
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
        this.tilemapData = {}; // ★ タイルマップデータを保持するオブジェクト
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
 * JSONデータに基づいてシーンの初期化を開始する。
 * create()メソッドから呼び出されることを想定。
 */
  /**
     * JSONデータに基づいてシーンの初期化を開始する (データキー動的選択版)
     */
    initSceneWithData() {
        // ▼▼▼【ここからが修正の核心です】▼▼▼
        // --------------------------------------------------------------------
        // --- 1. 読み込むべきJSONのキーを決定する ---
        // initで渡されたlayoutDataKeyがあればそれを使い、なければシーン自身のキーをフォールバックとして使う
        const keyToLoad = this.layoutDataKey || this.scene.key;

        console.log(`[${this.scene.key}] Attempting to build layout from JSON key: '${keyToLoad}'`);

        // --- 2. 決定したキーを使って、キャッシュからJSONデータを取得 ---
        const layoutData = this.cache.json.get(keyToLoad);
        // --------------------------------------------------------------------
   
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
     * エディタからの要求に応じて、新しいテキストオブジェクトを生成する
     * @param {string} newName - 新しいオブジェクトに付ける一意な名前
     * @returns {Phaser.GameObjects.Text} 生成されたテキストオブジェクト
     */
    addTextObjectFromEditor(newName) {
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
            }
        };

        const newGameObject = this.createObjectFromLayout(layout);
        this.applyProperties(newGameObject, layout);
        
        // ★ EditorUI側で選択状態にするので、ここではオブジェクトを返すだけで良い
        return newGameObject;
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
        

/**
 * 単体のオブジェクトにプロパティを適用し、シーンに追加する (センサー対応・最終確定版)
 * @param {Phaser.GameObjects.GameObject} gameObject - 生成されたGameObjectインスタンス
 * @param {object} layout - このオブジェクトのレイアウトデータ
 * @returns {Phaser.GameObjects.GameObject} プロパティ適用済みのGameObject
 */
applyProperties(gameObject, layout) {
    const data = layout || {};
    console.log(`%c[BaseGameScene] Applying properties for '${data.name}':`, 'color: lightgreen;', data);

    // --- 1. 基本プロパティ ---
    gameObject.name = data.name || 'untitled';
    if (data.group) gameObject.setData('group', data.group);

    // テキストオブジェクト以外の場合のみテクスチャを設定
    if (data.type !== 'Text' && data.texture) {
        gameObject.setTexture(data.texture);
    }

    // --- 2. シーンへの追加 ---
    this.add.existing(gameObject);

    // --- 3. Transformプロパティ ---
    gameObject.setPosition(data.x || 0, data.y || 0);
    gameObject.setScale(data.scaleX || 1, data.scaleY || 1);
    gameObject.setAngle(data.angle || 0);
    gameObject.setAlpha(data.alpha !== undefined ? data.alpha : 1);
    if (data.visible !== undefined) gameObject.setVisible(data.visible);
    if (data.depth !== undefined) gameObject.setDepth(data.depth);

    // --- 4. 物理ボディの生成と設定 ---
   // --- 4. 物理ボディの生成と設定 ---
    if (data.physics) {
        const phys = data.physics;
        
        // ▼▼▼【ここがテキスト物理の最終修正です】▼▼▼
        
        // ★★★ 1. オブジェクトをMatter Worldに追加する ★★★
        // これにより、gameObjectはsetExistingBodyなどのMatter用メソッドを使えるようになる
        this.matter.add.gameObject(gameObject);
        
        // ★★★ 2. オブジェクトがテキストの場合、ボディを再構築する ★★★
        if (gameObject instanceof Phaser.GameObjects.Text) {
            // テキストの表示原点を中心に設定
            gameObject.setOrigin(0.5, 0.5);
            
            // 重要：既存のボディを一度削除
            this.matter.world.remove(gameObject.body);

            // テキストのサイズに基づいて、新しい長方形ボディを生成
            const body = this.matter.bodies.rectangle(gameObject.x, gameObject.y, gameObject.width, gameObject.height, { isSensor: phys.isSensor });
            
            // 新しく作った正しいサイズのボディをセットする
            gameObject.setExistingBody(body);
        }
        
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

       
        

        // --- 4b. ボディが存在すれば、プロパティを順番に設定 ---
        if (gameObject.body) {
            
            // --- 1. JSONから読み込んだ 'ignoreGravity' の値をデータとして保存 ---
            // これが、'beforeupdate'ループで参照される唯一の正しい情報源となる
            gameObject.setData('ignoreGravity', phys.ignoreGravity === true);

            // --- 2. isSensorの場合は、強制的に重力無視リストに追加 ---
            if (phys.isSensor) {
                gameObject.setSensor(true);
                gameObject.setData('ignoreGravity', true); // ★ PhaserのAPIではなく、setDataを使う
            }
            
            // --- 3. isStaticを設定 ---
            gameObject.setStatic(phys.isStatic || false);

            // --- 4. ★★★ PhaserのsetIgnoreGravity()は、一切呼び出さない ★★★ ---
            // ★★★ 4. その他の物理プロパティを設定 ★★★
            gameObject.setFriction(phys.friction !== undefined ? phys.friction : 0.1);
            gameObject.setFrictionAir(phys.frictionAir !== undefined ? phys.frictionAir : 0.01); // 空気抵抗も適用
            gameObject.setBounce(phys.restitution !== undefined ? phys.restitution : 0);
            
            const gravityY = phys.gravityScale !== undefined ? phys.gravityScale : 1;
            gameObject.body.gravityScale.y = gravityY;

            // ★★★ 5. 永続化用のデータを保存 ★★★
            gameObject.setData('shape', phys.shape || 'rectangle');
            // ignoreGravityはJSONの値を正として保存
            gameObject.setData('ignoreGravity', phys.ignoreGravity === true);

            // ★★★ 6. 最後に、ボディの形状を設定 ★★★
            if (phys.shape === 'circle') {
                const radius = (gameObject.width * gameObject.scaleX + gameObject.height * gameObject.scaleY) / 4;
                gameObject.setCircle(radius);
            } else {
                gameObject.setRectangle();
            }
            
            // ★★★ 7. 形状変更後にプロパティがリセットされる可能性に備え、再設定 ★★★
            if (phys.isSensor) gameObject.setSensor(true);
            gameObject.setStatic(phys.isStatic || false);
            
            // --- 4d. 最終確認ログ ---
           console.log(`[BaseGameScene] Body configured for '${data.name}'. isStatic: ${gameObject.body.isStatic}, isSensor: ${gameObject.body.isSensor}, ignoreGravity: ${gameObject.getData('ignoreGravity')}`);
        }
    }
    
    // --- 5. アニメーション、コンポーネント、イベント ---
    if (data.animation && gameObject.play) {
        gameObject.setData('animation_data', data.animation);
        if (data.animation.default && this.anims.exists(data.animation.default)) {
            gameObject.play(data.animation.default);
        }
    }

    if (data.components && typeof this.addComponent === 'function') {
        data.components.forEach(comp => {
            this.addComponent(gameObject, comp.type, comp.params);
        });
    }

    this.applyEventsAndEditorFunctions(gameObject, data.events);

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
// in src/scenes/BaseGameScene.js

    finalizeSetup(allGameObjects) {
        console.log(`[BaseGameScene] Finalizing setup with ${allGameObjects.length} objects.`);

        for (const gameObject of allGameObjects) {
            const events = gameObject.getData('events');
            if (events) {
                for (const eventData of events) {
                    if (eventData.trigger === 'onReady') {
                        if (this.actionInterpreter) {
                            this.actionInterpreter.run(gameObject, eventData.actions, gameObject);
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
        if (!this.actionInterpreter || !sourceObject.getData) return;
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
                    this.actionInterpreter.run(sourceObject, eventData.actions, targetObject);
                }
            }
        } else if (phase === 'end' && wasOverlapping) {
            // --- Overlap End ---
            sourceObject.setData(overlapKey, false); // 重なりが解消したことを記録
            for (const eventData of events) {
                if (eventData.trigger === 'onOverlap_End' && eventData.targetGroup === targetObject.getData('group')) {
                    this.actionInterpreter.run(sourceObject, eventData.actions, targetObject);
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
        if (!this.actionInterpreter || !sourceObject.getData) return;
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
                this.actionInterpreter.run(sourceObject, eventData.actions, targetObject);
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
                    this.actionInterpreter.run(sourceObject, eventData.actions, targetObject);
                }
                else if (trigger === 'onHit' && isHit) {
                    console.log(`%c[Collision] HIT Event: '${sourceObject.name}' was hit by '${targetObject.name}'`, 'color: orange');
                    this.actionInterpreter.run(sourceObject, eventData.actions, targetObject);
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

    
    /**
     * ★★★ 新規メソッド ★★★
     * エディタからの要求に応じて、プレハブをシーンにインスタンス化する
     * @param {string} prefabKey - 生成するプレハブのキー
     * @param {string} newName - 新しいオブジェクトに付ける一意な名前
     * @returns {Phaser.GameObjects.GameObject | null} 生成されたオブジェクト
     */
    addPrefabFromEditor(prefabKey, newName) {
        const prefabData = this.cache.json.get(prefabKey);
        if (!prefabData) {
            console.error(`[BaseGameScene] Prefab data for key '${prefabKey}' not found.`);
            return null;
        }

        const centerX = this.cameras.main.scrollX + this.cameras.main.width / 2;
        const centerY = this.cameras.main.scrollY + this.cameras.main.height / 2;

        const newObjectLayout = { ...prefabData };
        newObjectLayout.name = newName;
        newObjectLayout.x = Math.round(centerX);
        newObjectLayout.y = Math.round(centerY);

        const newGameObject = this.createObjectFromLayout(newObjectLayout);
        this.applyProperties(newGameObject, newObjectLayout);
        
        return newGameObject;
    }

   // in BaseGameScene.js

   // in BaseGameScene.js

    /**
     * ★★★ 新規・最終実装 ★★★
     * 始点オブジェクトを元に、終点までの矩形範囲をオブジェクトで塗りつぶす。
     * @param {Phaser.GameObjects.GameObject} sourceObject - 塗りつぶしの元となるブラシオブジェクト
     * @param {{x: number, y: number}} endPoint - クリックされた終点のワールド座標
     */
    fillObjectRange(sourceObject, endPoint) {
        if (!sourceObject || !sourceObject.scene) {
            console.error('[BaseGameScene] Source object is invalid.');
            return;
        }

        // --- 1. グリッドサイズの決定 ---
        // ブラシオブジェクトの表示サイズをグリッドの1マスのサイズとする
        const gridWidth = sourceObject.displayWidth;
        const gridHeight = sourceObject.displayHeight;

        // --- 2. 始点と終点のグリッド座標を計算 ---
        const startGridX = Math.round(sourceObject.x / gridWidth);
        const startGridY = Math.round(sourceObject.y / gridHeight);
        const endGridX = Math.round(endPoint.x / gridWidth);
        const endGridY = Math.round(endPoint.y / gridHeight);

        // --- 3. ループ範囲を決定 ---
        const fromX = Math.min(startGridX, endGridX);
        const toX = Math.max(startGridX, endGridX);
        const fromY = Math.min(startGridY, endGridY);
        const toY = Math.max(startGridY, endGridY);

        console.log(`[BaseGameScene] Filling range from grid (${fromX}, ${fromY}) to (${toX}, ${toY})`);

        // --- 4. 複製元のレイアウト情報を作成 ---
        // sourceObjectから、新しいオブジェクトを作るために必要な情報を抽出する
        const sourceLayout = this.extractLayoutFromObject(sourceObject);
        
        // --- 5. 矩形範囲をループして、オブジェクトを配置 ---
        for (let gx = fromX; gx <= toX; gx++) {
            for (let gy = fromY; gy <= toY; gy++) {
                
                // 新しいオブジェクト用のレイアウトを作成
                const newLayout = { ...sourceLayout }; // 基本情報をコピー
                
                // 新しい位置と名前を設定
                newLayout.x = gx * gridWidth;
                newLayout.y = gy * gridHeight;
                const uniqueId = Phaser.Math.RND.uuid().substr(0, 4);
                newLayout.name = `${sourceLayout.name}_${gx}_${gy}_${uniqueId}`;
                
                // 新しいオブジェクトを生成してシーンに追加
                const newGameObject = this.createObjectFromLayout(newLayout);
                if (newGameObject) {
                    this.applyProperties(newGameObject, newLayout);
                }
            }
        }

        // --- 6. ブラシとして使った始点オブジェクトを破棄 ---
        sourceObject.destroy();
    }
    
    /**
     * ★★★ 新規ヘルパーメソッド ★★★
     * 既存のGameObjectから、複製に使えるようなプレーンなレイアウトオブジェクトを抽出する。
     * @param {Phaser.GameObjects.GameObject} gameObject - 抽出元のオブジェクト
     * @returns {object} 抽出されたレイアウト情報
     */
    extractLayoutFromObject(gameObject) {
        const layout = {
            name: gameObject.name,
            type: gameObject.type.charAt(0).toUpperCase() + gameObject.type.slice(1), // 'Image', 'Sprite', 'Text'
            
            // Transform
            scaleX: gameObject.scaleX,
            scaleY: gameObject.scaleY,
            angle: gameObject.angle,
            alpha: gameObject.alpha,
            depth: gameObject.depth,

            // Data
            group: gameObject.getData('group'),
            components: gameObject.getData('components'),
            // ... 他にコピーしたいgetData()の値があればここに追加 ...
        };

        // タイプに応じたプロパティを追加
        if (gameObject instanceof Phaser.GameObjects.Text) {
            layout.text = gameObject.text;
            layout.style = gameObject.style.toJSON();
        } else {
            layout.texture = gameObject.texture.key;
            // スプライトの場合、現在のフレームを保持
            if (gameObject instanceof Phaser.GameObjects.Sprite) {
                layout.frame = gameObject.frame.name;
            }
        }
        
        // 物理ボディ情報もコピー
        if (gameObject.body) {
            layout.physics = {
                isStatic: gameObject.body.isStatic,
                isSensor: gameObject.body.isSensor,
                shape: gameObject.getData('shape') || 'rectangle',
                // ... 他の物理プロパティも ...
            };
        }
        
        return layout;
    }
    shutdown() {
        super.shutdown();
    }
}