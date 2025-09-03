// src/scenes/BaseGameScene.js (データ駆動シーン専用の親クラス)

export default class BaseGameScene extends Phaser.Scene {
   
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
                // 今は onClick トリガーだけを実装
                if (eventData.trigger === 'onClick') {
                    // オブジェクトがクリックされたら...
                    gameObject.on('pointerdown', () => {
                        // ...インタープリタに実行を依頼する
                        this.actionInterpreter.run(gameObject, eventData.actions);
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
            if (editor) {
                editor.makeEditable(gameObject, this);
            }
        } catch (e) {
            console.error(`[BaseGameScene] Failed to make object interactive: '${gameObject.name}'`, e);
        }
        
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
       const editor = this.plugins.get('EditorPlugin');
        if (editor) {
            editor.makeEditable(gameObject, this);
        }
    }

    
    /**
     * エディタからオブジェクト追加の依頼を受けた時の、デフォルトの処理。
     * 子クラスで、このメソッドをオーバーライドすることを想定。
     */
    addObjectFromEditor(assetKey, newName) {
        console.warn(`[BaseGameScene] addObjectFromEditor is not implemented in '${this.scene.key}'.`);
        return null;
    }

    finalizeSetup() {
        if (this.onSetupComplete) {
            this.onSetupComplete();
        }
        this.events.emit('scene-ready');
        console.log(`[${this.scene.key}] Setup complete. Scene is ready.`);
    }
}
