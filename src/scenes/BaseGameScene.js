export default class BaseGameScene extends Phaser.Scene {

    constructor(config) {
        super(config);
        this.dynamicColliders = [];
        this.actionInterpreter = null;
        this.keyPressEvents = new Map();
    }

    initSceneWithData() {
        const sceneKey = this.scene.key;
        console.log(`[${sceneKey}] Initializing with data-driven routine...`);
        const layoutData = this.cache.json.get(sceneKey);
        this.buildSceneFromLayout(layoutData);
    }

    buildSceneFromLayout(layoutData) {
        if (!layoutData) {
            this.finalizeSetup();
            return;
        }

        if (layoutData.animations) {
            for (const animData of layoutData.animations) {
                if (this.anims.exists(animData.key)) continue;
                let frameConfig = Array.isArray(animData.frames) ? { frames: animData.frames } : animData.frames;
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
    
    createObjectFromLayout(layout) {
        const textureKey = layout.texture || (layout.name ? layout.name.split('_')[0] : '__DEFAULT');
        return (layout.type === 'Sprite') 
            ? new Phaser.GameObjects.Sprite(this, 0, 0, textureKey) 
            : new Phaser.GameObjects.Image(this, 0, 0, textureKey);
    }

    /**
     * 単体のオブジェクトにプロパティを適用し、シーンに追加する (重複解消・修正版)
     */
    applyProperties(gameObject, layout) {
        const data = layout || {};

        // --- 1. 基本プロパティ ---
        gameObject.name = data.name || gameObject.name;
        if (data.group) gameObject.setData('group', data.group);
        if (data.texture) gameObject.setTexture(data.texture);
        this.add.existing(gameObject);

        // --- 2. Transform ---
        gameObject.setPosition(data.x || 0, data.y || 0);
        gameObject.setScale(data.scaleX || 1, data.scaleY || 1);
        gameObject.setAngle(data.angle || 0);
        gameObject.setAlpha(data.alpha || 1);
        if (data.visible !== undefined) gameObject.setVisible(data.visible);

        // --- 3. 物理ボディ ---
        if (data.physics) {
            const phys = data.physics;
            this.physics.add.existing(gameObject, phys.isStatic || false);
            if (gameObject.body) {
                if (!gameObject.body.isStatic) {
                    gameObject.body.setSize(phys.width, phys.height);
                    gameObject.body.setOffset(phys.offsetX, phys.offsetY);
                    gameObject.body.allowGravity = phys.allowGravity;
                    gameObject.body.bounce.setTo(phys.bounceX, phys.bounceY);
                }
                gameObject.body.collideWorldBounds = phys.collideWorldBounds;
            }
        }
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ ここからが修正されたロジックです ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // --- 4. ゲームプレイ用イベントの適用 ---
        this.applyEvents(gameObject, data.events);
           
        // --- 5. インタラクティブ化とエディタへの登録 ---
        try {
            if (gameObject.width === 0 || gameObject.height === 0) {
                gameObject.once('textureupdate', () => gameObject.setSize(gameObject.width, gameObject.height).setInteractive());
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
        
        // --- 6. アニメーションプロパティ ---
        if (data.animation && gameObject.play) {
            gameObject.setData('animation_data', data.animation);
            if (data.animation.default && this.anims.exists(data.animation.default)) {
                gameObject.play(data.animation.default);
            }
        }
    }

    /**
     * 単一オブジェクトのゲームプレイ用イベントリスナーをクリア＆再設定する
     */
    applyEvents(gameObject, eventsData) {
        const events = eventsData || gameObject.getData('events') || [];
        gameObject.setData('events', events);
        
        gameObject.off('pointerdown');

        events.forEach(eventData => {
            if (eventData.trigger === 'onClick') {
                gameObject.setInteractive();
                gameObject.on('pointerdown', () => {
                    const editor = this.plugins.get('EditorPlugin');
                    const shiftKey = this.input.keyboard.addKey('SHIFT');
                    
                    if (!editor || !editor.isEnabled || shiftKey.isDown) {
                        if (this.actionInterpreter) this.actionInterpreter.run(gameObject, eventData.actions);
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
        this.applyEvents(targetObject);
        this.rebuildPhysicsInteractions();
    }

    /**
     * シーン全体の物理的な相互作用（衝突・接触）を再構築する
     */
    rebuildPhysicsInteractions() {
        if (!this.dynamicColliders) this.dynamicColliders = [];
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
                    if (this.actionInterpreter) this.actionInterpreter.run(sourceObject, eventInfo.actions);
                });
                this.dynamicColliders.push(newCollider);
            }
        });
    }

    finalizeSetup() {
        if (this.onSetupComplete) this.onSetupComplete();
        this.rebuildPhysicsInteractions();
        this.events.emit('scene-ready');
        console.log(`[${this.scene.key}] Setup complete. Scene is ready.`);
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