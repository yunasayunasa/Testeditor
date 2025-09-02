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

    buildSceneFromLayout(layoutData) {
        const sceneKey = this.scene.key;
        if (!layoutData || !layoutData.objects) {
            console.warn(`[${sceneKey}] No layout data found. Finalizing setup.`);
            this.finalizeSetup();
            return;
        }
        
        const createdObjects = [];
        for (const layout of layoutData.objects) {
            const gameObject = this.createObjectFromLayout(layout);
            if (gameObject) {
                createdObjects.push({ gameObject, layout });
            }
        }
        
        for (const item of createdObjects) {
            this.applyProperties(item.gameObject, item.layout);
        }
        
        this.finalizeSetup();
    }
    
    createObjectFromLayout(layout) {
        const textureKey = layout.texture || (layout.name ? layout.name.split('_')[0] : '__DEFAULT');
        const gameObject = new Phaser.GameObjects.Image(this, 0, 0, textureKey);
        return gameObject;
    }

      applyProperties(gameObject, layout) {
        const data = layout || { name: gameObject.name, x: gameObject.x, y: gameObject.y, scaleX: 1, scaleY: 1, angle: 0, alpha: 1, visible: true };

        // ★★★ 1. まず、名前とテクスチャを確定させる ★★★
        gameObject.name = data.name;
        if (data.texture) {
            gameObject.setTexture(data.texture);
        }
        
        // ★★★ 2. オブジェクトをシーンに「追加」する ★★★
        // これにより、オブジェクトのwidthとheightが確実に決まる
        this.add.existing(gameObject);

        // ★★★ 3. Transformプロパティを適用する ★★★
        gameObject.setPosition(data.x, data.y);
        gameObject.setScale(data.scaleX, data.scaleY);
        gameObject.setAngle(data.angle);
        gameObject.setAlpha(data.alpha);
        if (data.visible !== undefined) gameObject.setVisible(data.visible);

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

               // 5. 最後に、当たり判定の形状を「保証」して、インタラクティブ化とエディタ登録を行う
        //    'setSize' を呼ぶことで、テクスチャのサイズに合わせた当たり判定が強制的に作られる
        //    これにより、setInteractive() の自動推測の失敗を完全に防ぐ
        try {
            gameObject.setSize(gameObject.width, gameObject.height);
            gameObject.setInteractive();

            const editor = this.plugins.get('EditorPlugin');
            if (editor) {
                editor.makeEditable(gameObject, this);
            }
        } catch (e) {
            console.error(`[BaseGameScene] Failed to make object interactive: '${gameObject.name}'`, e);
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