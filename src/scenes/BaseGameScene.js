export default class BaseGameScene extends Phaser.Scene {

    /**
     * 汎用初期化ルーチン：シーンキーと同じ名前のJSONデータを読み込み、
     * シーンのレイアウトと物理を構築する。
     * このメソッドは、データ駆動シーン（JumpSceneなど）のcreateから呼び出される。
     */
    initSceneFromData() {
        const sceneKey = this.scene.key;
        console.log(`[${sceneKey}] Initializing from data...`);

        // データはPreloadSceneでロード済みなので、キャッシュから直接取得
        const layoutData = this.cache.json.get(sceneKey);
        
        // データの構築処理を呼び出す
        this.buildSceneFromLayout(layoutData);
    }

    /**
     * 読み込み済みのレイアウトデータを使って、シーンを構築する
     * @param {object} layoutData - シーンのレイアウトデータ
     */
    buildSceneFromLayout(layoutData) {
        const sceneKey = this.scene.key;
        if (!layoutData || !layoutData.objects) {
            console.warn(`[${sceneKey}] No layout data found for this scene. Finalizing setup.`);
            this.finalizeSetup();
            return;
        }

        console.log(`[${sceneKey}] Building scene from ${layoutData.objects.length} layout objects...`);
        
        // 1. まず、JSONに基づいて全てのオブジェクトを「生成」だけして、配列に溜め込む
        const createdObjects = [];
        for (const layout of layoutData.objects) {
            // 子クラスでオーバーライドされることを想定した、オブジェクト生成メソッドを呼び出す
            const gameObject = this.createObjectFromLayout(layout);
            if (gameObject) {
                createdObjects.push({ gameObject, layout });
            }
        }
        
        // 2. 全てのオブジェクトが生成された後で、プロパティを「適用」する
        for (const item of createdObjects) {
            this.applyProperties(item.gameObject, item.layout);
        }
        
        // 3. 最後に、最終セットアップを呼び出す
        this.finalizeSetup();
    }
    
    /**
     * 単一のレイアウト定義から、ゲームオブジェクトを「生成」する。
     * このメソッドは、子シーンでオーバーライドされることを想定している。
     * @param {object} layout - 単一オブジェクトのレイアウト定義
     * @returns {Phaser.GameObjects.GameObject} 生成されたゲームオブジェクト
     */
    createObjectFromLayout(layout) {
        // デフォルトでは、Imageオブジェクトを生成する
        const textureKey = layout.texture || (layout.name ? layout.name.split('_')[0] : '__DEFAULT');
        const gameObject = new Phaser.GameObjects.Image(this, 0, 0, textureKey);
        
        // ★★★重要★★★
        // ここではまだシーンに追加しない！ `new` でメモリ上に作るだけ。
        // 追加は `applyProperties` の中で、 `add.existing` を使って行う。
        
        return gameObject;
    }

    /**
     * 単体のオブジェクトに、JSONから読み込んだプロパティを「適用」し、シーンに追加する
     * @param {Phaser.GameObjects.GameObject} gameObject - 対象のオブジェクト
     * @param {object} layout - 単一オブジェクトのレイアウト定義
     */
    applyProperties(gameObject, layout) {
        gameObject.name = layout.name;
        
        // Transformプロパティを適用
        gameObject.setPosition(layout.x, layout.y);
        gameObject.setScale(layout.scaleX, layout.scaleY);
        gameObject.setAngle(layout.angle);
        gameObject.setAlpha(layout.alpha);
        if (layout.visible !== undefined) gameObject.setVisible(layout.visible);
        
        // ★★★ オブジェクトをシーンの表示リストに正式に追加 ★★★
        this.add.existing(gameObject);

        // インタラクティブ化
        gameObject.setInteractive();

        // 物理プロパティを適用
        if (layout.physics) {
            const phys = layout.physics;
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

        // エディタに登録
        const editor = this.plugins.get('EditorPlugin');
        if (editor) {
            editor.makeEditable(gameObject, this);
        }
    }

    /**
     * レイアウト適用後に行う、シーンの最終セットアップ。
     */
    finalizeSetup() {
        // シーン固有の最終処理を呼び出す (もしあれば)
        if (this.onSetupComplete) {
            this.onSetupComplete();
        }
    
        // 全てのセットアップが完了したことを、SystemSceneに通知する
        this.events.emit('scene-ready');
        
        console.log(`[${this.scene.key}] Setup complete. Scene is ready.`);
    }
}