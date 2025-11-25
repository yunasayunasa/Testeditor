import { ComponentRegistry } from '../components/index.js';
/**・､
 */
export default class BaseGameScene extends Phaser.Scene {

    constructor(config) {
        super(config);
        this.dynamicColliders = [];
        this.actionInterpreter = null;
        this.keyPressEvents = new Map();
        this.layoutDataKey = null;
        this.updatableComponents = new Set(); 
        this._deferredActions = []; 
        this.joystick = null; 

        this.isUiScene = false; 
       
        this._sceneSettingsApplied = false;
        this.ySortEnabled = false; // 笘・繧ｷ繝ｼ繝ｳ縺ｮY繧ｽ繝ｼ繝医′譛牙柑縺九←縺・°縺ｮ繝輔Λ繧ｰ
        this.ySortableObjects = []; // 笘・Y繧ｽ繝ｼ繝亥ｯｾ雎｡縺ｮ繧ｪ繝悶ず繧ｧ繧ｯ繝医ｒ菫晄戟縺吶ｋ驟榊・
       
    }
     /**
     */
   init(data) {
    
    if (data && data.isUiScene) {
        this.isUiScene = true;
    }
        if (data && data.layoutDataKey) {
            this.layoutDataKey = data.layoutDataKey;
            // console.log(`[${this.scene.key}] Initialized with specific layout data key: '${this.layoutDataKey}'`);
        } else {
            this.layoutDataKey = null;
            // console.log(`[${this.scene.key}] Initialized without specific layout data key.`);
        }
         this.loadData = data.loadData || null; // 笘・繝ｭ繝ｼ繝峨ョ繝ｼ繧ｿ繧貞女縺大叙繧・
    const systemScene = this.scene.get('SystemScene');
    if (systemScene) {
        this.actionInterpreter = systemScene.registry.get('actionInterpreter');
    }
    if (!this.actionInterpreter) {
        console.error(`[${this.scene.key}] CRITICAL: ActionInterpreter not found in SystemScene registry!`);
    }
    }
 create() {
    this.actionInterpreter = this.actionInterpreter;
    if (!this.actionInterpreter) {
        console.error(`[${this.scene.key}] CRITICAL: ActionInterpreter not found in registry!`);
    }
        const keyToLoad = this.layoutDataKey || this.scene.key;
        const layoutData = this.cache.json.get(keyToLoad);
        this.sceneSettings = layoutData?.scene_settings || {}; 
        this.ySortEnabled = layoutData?.scene_settings?.ySortEnabled === true;

        if (this.ySortEnabled) {
            // console.log("[BaseGameScene] Y-Sort is enabled for this scene.");
        }
        this.applySceneSettings(); 

    }
/**
     */
    addJoystickFromEditor(isFromEditor = true) {
        if (isFromEditor) {
            alert(`This scene type (${this.scene.key}) does not support adding a joystick.`);
        }
        console.warn(`[BaseGameScene] addJoystickFromEditor was called on a scene that does not support it.`);
    }

/** 笘・・笘・譁ｰ險ｭ 笘・・笘・
 */
applySceneSettings() {
  

    const keyToLoad = this.layoutDataKey || this.scene.key;
    const layoutData = this.cache.json.get(keyToLoad);

    if (layoutData && layoutData.scene_settings) {
        const settings = layoutData.scene_settings;

        if (settings.backgroundColor) {
            this.cameras.main.setBackgroundColor(settings.backgroundColor);
        }

        if (this.matter && this.matter.world && settings.gravity) {
            if (settings.gravity.enabled !== undefined) {
                this.matter.world.engine.gravity.x = settings.gravity.enabled ? (settings.gravity.x || 0) : 0;
                this.matter.world.engine.gravity.y = settings.gravity.enabled ? (settings.gravity.y || 0) : 0;
                this.matter.world.engine.gravity.scale = settings.gravity.enabled ? (settings.gravity.scale !== undefined ? settings.gravity.scale : 0.001) : 0;
            } else if (settings.gravity.y !== undefined) {
                this.matter.world.engine.gravity.y = settings.gravity.y;
            }
        }
        
       
        
    }
}
/**
 */
initSceneWithData() {
    const systemEvents = this.scene.get('SystemScene').events;

    systemEvents.off('start_tutorial', this.handleStartTutorial, this);
    systemEvents.on('start_tutorial', this.handleStartTutorial, this);

    const keyToLoad = this.layoutDataKey || this.scene.key;

    // console.log(`[${this.scene.key}] Attempting to build layout from JSON key: '${keyToLoad}'`);

    const layoutData = this.cache.json.get(keyToLoad);
     

    if (layoutData) {
       
        // --------------------------------------------------------------------
        this.createAnimationsFromLayout(layoutData); 
        // --------------------------------------------------------------------
        
        this.buildSceneFromLayout(layoutData);

    } else {
        console.warn(`[${this.scene.key}] No layout data found for JSON key: '${keyToLoad}'`);
        this.finalizeSetup();
    }

    this.matter.world.on('beforeupdate', (event) => {
        const engine = this.matter.world.engine;
        const gravity = engine.gravity;

        for (const gameObject of this.children.list) {
            if (gameObject.body && gameObject.getData('ignoreGravity') === true) {
                const bodyGravity = {
                    x: gameObject.body.mass * gravity.x * gravity.scale,
                    y: gameObject.body.mass * gravity.y * gravity.scale
                };
                const counterForce = {
                    x: -bodyGravity.x,
                    y: -bodyGravity.y
                };
                Phaser.Physics.Matter.Matter.Body.applyForce(
                    gameObject.body,
                    gameObject.body.position,
                    counterForce
                );
            }
        }
    });
}


createAnimationsFromLayout(layoutData) {
    if (!layoutData.animations || !Array.isArray(layoutData.animations)) {
        return; // animations驟榊・縺後↑縺代ｌ縺ｰ菴輔ｂ縺励↑縺・
    }

    layoutData.animations.forEach(animData => {
        if (this.anims.exists(animData.key)) {
            console.warn(`Animation with key '${animData.key}' already exists. Skipping creation.`);
            return;
        }

        this.anims.create({
            key: animData.key,
            frames: this.anims.generateFrameNumbers(animData.texture, { 
                start: animData.frames.start, 
                end: animData.frames.end 
            }),
            frameRate: animData.frameRate,
            repeat: animData.repeat
        });

        const createdAnim = this.anims.get(animData.key);
        // console.log(`[BaseGameScene] VERIFY: Animation '${animData.key}' was just created. Is it accessible?`, createdAnim ? 'YES' : 'NO');
    });
}

    deferAction(action) {
        this._deferredActions.push(action);
    }
    /**
     */
    handleStartTutorial(tutorialFile) {
        if (!tutorialFile) return;

        // console.log(`[${this.scene.key}] Caught 'start_tutorial' event for file: ${tutorialFile}`);
        
        this.scene.get('SystemScene').events.emit('request-overlay', {
            from: this.scene.key,
            scenario: tutorialFile,
            block_input: false
        });
    }
    /*
*/

/**
 */

addCroppedTilemapChunk(tilemapKey, cropRect) {
    if (cropRect.width <= 0 || cropRect.height <= 0) return null;

    const rt = this.make.renderTexture({ width: cropRect.width, height: cropRect.height }, false);
    const tempImage = this.add.image(-9999, -9999, tilemapKey).setOrigin(0, 0).setCrop(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
    rt.draw(tempImage, 0, 0);
    tempImage.destroy();
    
    const newTextureKey = `${tilemapKey}_chunk_${Date.now()}`;
    rt.saveTexture(newTextureKey);
    rt.destroy();

    const centerX = this.cameras.main.scrollX + this.cameras.main.width / 2;
    const centerY = this.cameras.main.scrollY + this.cameras.main.height / 2;
    const chunkImage = this.add.image(centerX, centerY, newTextureKey);
    chunkImage.name = newTextureKey;
    chunkImage.setData('cropSource', { key: tilemapKey, rect: cropRect });

    const layout = {
        name: chunkImage.name, type: 'Image',
        x: Math.round(centerX), y: Math.round(centerY),
        layer: this.editorUI?.activeLayerName || 'Gameplay',
        physics: { isStatic: true, width: cropRect.width, height: cropRect.height }
    };
    this.applyProperties(chunkImage, layout);
    this.initComponentsAndEvents(chunkImage);

    return chunkImage;
}


    /**
     */
    addTextUiFromEditor(newName, layerName) {
    const centerX = this.cameras.main.scrollX + this.cameras.main.width / 2;
    const centerY = this.cameras.main.scrollY + this.cameras.main.height / 2;
    
    const layout = {
        name: newName,
        type: 'Text',
        text: 'New Text',
        x: Math.round(centerX),
        y: Math.round(centerY),
        style: { fontSize: '32px', fill: '#ffffff' },
        layer: layerName
    };

    const newGameObject = this.createObjectFromLayout(layout);
    this.applyProperties(newGameObject, layout);
    this.initComponentsAndEvents(newGameObject); // 縺薙ｌ縺ｧ邱ｨ髮・庄閭ｽ縺ｫ縺ｪ繧・
    
    return newGameObject;
}

    
    /**
     */

/**
 */

/**
 */
buildSceneFromLayout(layoutData) {
    if (!layoutData) {
        this.finalizeSetup([]);
        return;
    }

    if (this.editorUI && layoutData.layers) {
        this.editorUI.setLayers(layoutData.layers);
    }

    const allGameObjects = [];

    if (layoutData.objects) {
        for (const layout of layoutData.objects) {
            const gameObject = this.createObjectFromLayout(layout);
            if (gameObject) {
                this.applyProperties(gameObject, layout);
                this.initComponentsAndEvents(gameObject);
                
                allGameObjects.push(gameObject);
            }
        }
    }

    /*
    // console.log(`%c[BaseGameScene] Starting ${allComponentsToStart.length} components...`);
    allComponentsToStart.forEach(component => { ... });
    */

    this.finalizeSetup(allGameObjects);
}
   
createObjectFromLayout(layout) {
    const systemRegistry = this.scene.get('SystemScene')?.registry;
    const uiRegistry = systemRegistry ? systemRegistry.get('uiRegistry') : null;
    const stateManager = systemRegistry ? systemRegistry.get('stateManager') : null;

    const registryKey = layout.registryKey || (layout.data && layout.data.registryKey) || layout.name;

    let gameObject = null;

    if (uiRegistry && uiRegistry[registryKey]) {
        const definition = uiRegistry[registryKey];
        if (definition.component) {
            const UiComponentClass = definition.component;
            const paramsForConstructor = { ...layout, stateManager: stateManager };
            gameObject = new UiComponentClass(this, paramsForConstructor);
        }
    }
    else {
        let textureKey = layout.texture || '__DEFAULT';
        if (layout.textureData) {
            const newTextureKey = `chunk_restored_${Date.now()}_${Math.random()}`;
            try {
                this.textures.addBase64(newTextureKey, layout.textureData);
                textureKey = newTextureKey;
            } catch (e) {
                console.error(`[Import] Failed to restore texture from Base64 data.`, e);
            }
        }
        
        if (layout.type === 'Container') {
        gameObject = this.add.container(0, 0);

        if (Array.isArray(layout.objects)) {
            layout.objects.forEach(childLayout => {
                const childObject = this.createObjectFromLayout(childLayout);
                if (childObject) {
                    this.applyProperties(childObject, childLayout);
                    this.initComponentsAndEvents(childObject);
                    gameObject.add(childObject);
                }
            });
        }
    }
    else if (layout.type === 'Text') {
            const style = layout.style || { fontSize: '32px', fill: '#fff' };
            const textObject = this.add.text(0, 0, layout.text || '', style); // 笘・add.text 繧剃ｽｿ縺・
            if (style.shadow && style.shadow.color) {
                textObject.setShadow(style.shadow.offsetX, style.shadow.offsetY, style.shadow.color, style.shadow.blur);
            }
            gameObject = textObject;
        }
        else if (layout.type === 'Sprite') {
            gameObject = this.add.sprite(0, 0, textureKey); // 笘・add.sprite 繧剃ｽｿ縺・
        }
        else { // 繝・ヵ繧ｩ繝ｫ繝医・ Image
            gameObject = this.add.image(0, 0, textureKey); // 笘・add.image 繧剃ｽｿ縺・
        }
    }

    if (gameObject) {
        gameObject.setData('registryKey', registryKey);
    }

    return gameObject;
}
        



/**
 */
initComponentsAndEvents(gameObject) {
    const componentsToStart = [];

    if (gameObject.components) {
        for (const key in gameObject.components) {
            const component = gameObject.components[key];
            if (this.updatableComponents.has(component)) {
                this.updatableComponents.delete(component);
            }
            if (component && typeof component.destroy === 'function') {
                component.destroy();
            }
        }
    }
    gameObject.components = {};

    const componentsData = gameObject.getData('components');
    if (componentsData) {
        for (const compData of componentsData) {
            const componentInstance = this.addComponent(gameObject, compData.type, compData.params);
            
            if (componentInstance) {
                if (typeof componentInstance.update === 'function') {
                    this.updatableComponents.add(componentInstance);
                }
                if (typeof componentInstance.start === 'function') {
                    componentsToStart.push(componentInstance);
                }
            }
        }
    }

    const eventsData = gameObject.getData('events');
    this.applyEventsAndEditorFunctions(gameObject, eventsData);

    const editor = this.plugins.get('EditorPlugin');
    if (editor && editor.isEnabled) {
        editor.makeEditable(gameObject, this);
    }

const stateMachine = gameObject.components?.StateMachineComponent;
if (stateMachine && typeof stateMachine.init === 'function') {
    const stateMachineData = gameObject.getData('stateMachine');
    if (stateMachineData) {
        stateMachine.init(stateMachineData);
    }
}

    
    if (componentsToStart.length > 0) {
        // console.log(`%c[initComponentsAndEvents] Starting ${componentsToStart.length} components for '${gameObject.name}'...`, 'color: orange;');
        componentsToStart.forEach(component => {
            try {
                component.start();
            } catch (e) {
                console.error(`Error during start() of component on object '${component.gameObject.name}':`, e);
            }
        });
    }
 

}
/**
 */

applyProperties(gameObject, layout) {
    const data = layout || {};
    gameObject.name = data.name || 'untitled';

    if (data.data) for (const key in data.data) gameObject.setData(key, data.data[key]);
    if (data.components) gameObject.setData('components', data.components);
    if (data.events) gameObject.setData('events', data.events);
    if (data.layer) gameObject.setData('layer', data.layer);
    if (data.group) gameObject.setData('group', data.group);
    if (data.anim_prefix) gameObject.setData('anim_prefix', data.anim_prefix);
    if (data.cropSource) gameObject.setData('cropSource', data.cropSource);
    if (data.isYSortable) gameObject.setData('isYSortable', true);

    this.add.existing(gameObject);
    
    let finalTextureKey = data.texture;
    if (data.cropSource) {
        try {
            const { key, rect } = data.cropSource;
            if (rect.width > 0 && rect.height > 0) {
                const rt = this.make.renderTexture({ width: rect.width, height: rect.height }, false);
                const tempImage = this.add.image(-9999, -9999, key).setOrigin(0, 0).setCrop(rect.x, rect.y, rect.width, rect.height);
                rt.draw(tempImage, 0, 0);
                tempImage.destroy();
                const newTextureKey = `${key}_chunk_restored_${Date.now()}`;
                rt.saveTexture(newTextureKey);
                rt.destroy();
                finalTextureKey = newTextureKey;
            }
        } catch (e) { console.error("Failed to recreate texture from cropSource:", e); finalTextureKey = '__DEFAULT'; }
    }
    if (finalTextureKey && gameObject.setTexture) {
        gameObject.setTexture(finalTextureKey);
    }
    
    gameObject.setPosition(data.x || 0, data.y || 0);
    if (gameObject instanceof Phaser.GameObjects.Container) {
    if (data.width && data.height) {
        gameObject.setSize(data.width, data.height);
    }
}
    gameObject.setAngle(data.angle || 0);
    gameObject.setAlpha(data.alpha ?? 1);
    
    if (data.depth !== undefined) gameObject.setDepth(data.depth);

    if (gameObject.getData('isYSortable') === true) {
        gameObject.setOrigin(0.5, 1);
        if (!this.ySortableObjects.includes(gameObject)) {
            this.ySortableObjects.push(gameObject);
        }
    }
    if (data.originX !== undefined || data.originY !== undefined) {
        gameObject.setOrigin(data.originX ?? 0.5, data.originY ?? 0.5);
    }

    if (data.physics) {
        const phys = data.physics;
        
        if (gameObject.body) this.matter.world.remove(gameObject.body);
        
        this.matter.add.gameObject(gameObject, {
            isStatic: phys.isStatic,
            isSensor: phys.isSensor
        });

        if (gameObject.body) {
            gameObject.setScale(data.scaleX ?? 1, data.scaleY ?? 1);

            if (phys.collisionFilter) {
                gameObject.setCollisionCategory(phys.collisionFilter.category);
                gameObject.setCollidesWith(phys.collisionFilter.mask);
                gameObject.setData('collision_category', phys.collisionFilter.category);
                gameObject.setData('collision_mask', phys.collisionFilter.mask);
            }

            gameObject.setFriction(phys.friction ?? 0.1);
            gameObject.setFrictionAir(phys.frictionAir ?? 0.01);
            gameObject.setBounce(phys.restitution ?? 0);
            if (phys.fixedRotation !== undefined) {
                gameObject.setFixedRotation(phys.fixedRotation);
                gameObject.setData('fixedRotation', phys.fixedRotation);
            }
            gameObject.setData('ignoreGravity', phys.ignoreGravity === true);
            gameObject.setData('shape', phys.shape || 'rectangle');
        }
    } else {
        gameObject.setScale(data.scaleX ?? 1, data.scaleY ?? 1);
    }

    if (this.isUiScene) {
        gameObject.setVisible(true); // 蝠冗ｭ皮┌逕ｨ縺ｧ陦ｨ遉ｺ
        
        if (data.depth === undefined) {
            gameObject.setDepth(10000 + this.children.list.length);
        }
    }
    
    return gameObject;
}
    
  
/**
 */
applyEventsAndEditorFunctions(gameObject, eventsData) {
    const events = eventsData || [];
    gameObject.setData('events', events);
    
    gameObject.off('pointerdown');
    gameObject.off('onStateChange');
    gameObject.off('onDirectionChange');



events.forEach(eventData => {
        
        if (eventData.trigger === 'onClick') {
            gameObject.setInteractive({ useHandCursor: true });
        gameObject.on('pointerdown', () => {
                console.log(`%c[DEBUG] onClick fired for '${gameObject.name}' WITHOUT mode check!`, 'color: red; font-weight: bold;');
                
                if (this.actionInterpreter) {
                    this.actionInterpreter.run(gameObject, eventData, null);
                } else {
                    console.error('[DEBUG] ActionInterpreter not found!');
                }
            });
        }
    /*const hasOnClick = events.some(e => e.trigger === 'onClick');
    if (hasOnClick) {
        gameObject.setInteractive({ useHandCursor: true });
    }

    events.forEach(eventData => {
        
        if (eventData.trigger === 'onClick') {
            gameObject.on('pointerdown', () => {
                const editorPlugin = this.plugins.get('EditorPlugin');
                
                if (!editorPlugin || editorPlugin.isEnabled && editorPlugin.mode === 'play') { 
                    if (this.actionInterpreter) {
                        console.log(`[ApplyEvents] onClick fired for '${gameObject.name}'`);
                        this.actionInterpreter.run(gameObject, eventData, null); // 陦晉ｪ∫嶌謇九・縺・↑縺・・縺ｧnull
                    }
                }
            });
        }
          */
        if (eventData.trigger === 'onReady') {
            if (this.actionInterpreter) {
                console.log(`[ApplyEvents] onReady fired for '${gameObject.name}'`);
                this.actionInterpreter.run(gameObject, eventData, null); // 陦晉ｪ∫嶌謇九・縺・↑縺・・縺ｧnull
            }
        }
        
        if (eventData.trigger === 'onStateChange') {
            gameObject.on('onStateChange', (newState, oldState) => {
                this.evaluateConditionAndRun(gameObject, eventData, { state: newState, oldState: oldState });
            });
        }
        
        if (eventData.trigger === 'onDirectionChange') {
            gameObject.on('onDirectionChange', (newDirection) => {
                this.evaluateConditionAndRun(gameObject, eventData, { direction: newDirection });
            });
        }
        // --- testimony-system custom triggers ---
    if (eventData.trigger === 'REQUEST_PRESS' || eventData.trigger === 'REQUEST_PRESENT') {
        gameObject.on(eventData.trigger, (data) => {
            if (this.actionInterpreter) {
                this.actionInterpreter.run(gameObject, eventData, data);
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
 */

/**
 */
addComponent(target, componentType, params = {}) {
    if (target.components && target.components[componentType]) {
        console.warn(`[BaseGameScene] Component '${componentType}' already exists on '${target.name}'.`);
        return target.components[componentType]; // 譌｢蟄倥・繧､繝ｳ繧ｹ繧ｿ繝ｳ繧ｹ繧定ｿ斐☆
    }

    const ComponentClass = ComponentRegistry[componentType];
    if (!ComponentClass) {
        console.warn(`[BaseGameScene] Unknown component: '${componentType}'`);
        return null;
    }

    const componentInstance = new ComponentClass(this, target, params);

    if (!target.components) target.components = {};
    target.components[componentType] = componentInstance;

   
    

    const currentData = target.getData('components') || [];
    if (!currentData.some(c => c.type === componentType)) {
        currentData.push({ type: componentType, params: params });
        target.setData('components', currentData);
    }

    const editor = this.plugins.get('EditorPlugin');
    if (editor && editor.isEnabled && typeof editor.onComponentAdded === 'function') {
        editor.onComponentAdded(target, componentType, params);
    }
    
    return componentInstance;
} 
update(time, delta) {
   

    if (this._deferredActions.length > 0) {
        const actionsToRun = [...this._deferredActions];
        this._deferredActions.length = 0;
        actionsToRun.forEach(action => action());
    }

    if (this.updatableComponents) {
        this.updatableComponents.forEach(component => {
            if (component.gameObject.scene && component.gameObject.active) {
                component.update(time, delta);
            }
        });
    }
    if (!this._debugOnce) {
        // console.log("--- BASEGAME SCENE UPDATE CALLED ---");
        // console.log("this.ySortEnabled:", this.ySortEnabled);
        // console.log("this.ySortableObjects:", this.ySortableObjects);
        this._debugOnce = true;
    }

    if (this.ySortEnabled) {
        for (const obj of this.ySortableObjects) {
            if (obj.active) {
                const sortY = obj.body ? Math.round(obj.body.position.y) : Math.round(obj.y);
                if (obj.depth !== sortY) {
                    obj.setDepth(sortY);

                    if(obj.name === 'player') {
                        // console.log(`[Y-Sort] player depth updated to: ${sortY}`);
                    }
                }
            }
        }
    }

}


 
/**
 */
evaluateConditionAndRun(gameObject, eventData, context) {
    let conditionMet = true; // 繝・ヵ繧ｩ繝ｫ繝医・true

    if (eventData.condition) {
        const varNames = Object.keys(context); // 萓・ ['state', 'oldState']
        const varValues = Object.values(context); // 萓・ ['walk', 'idle']

        try {
            const func = new Function(...varNames, `'use strict'; return (${eventData.condition});`);
            
            conditionMet = func(...varValues);

        } catch (e) {
            console.warn(`[Event System] Failed to evaluate condition: "${eventData.condition}"`, e);
            conditionMet = false;
        }
    }

    if (conditionMet) {
        const actionInterpreter = this.actionInterpreter;
        if (actionInterpreter) {
            actionInterpreter.run(gameObject, eventData, gameObject);
        }
    }
}

    finalizeSetup(allGameObjects) {
        // console.log(`[BaseGameScene] Finalizing setup with ${allGameObjects.length} objects.`);

        for (const gameObject of allGameObjects) {
            const events = gameObject.getData('events');
            if (events) {
                for (const eventData of events) {
                        if (eventData.trigger === 'onReady') {
        const actionInterpreter = this.actionInterpreter;
        if (actionInterpreter) {
            actionInterpreter.run(gameObject, eventData, gameObject);
        }
    }
                }
            }
        }
        
        this.matter.world.on('collisionstart', (event) => {
            for (const pair of event.pairs) {
                const objA = pair.bodyA.gameObject;
                const objB = pair.bodyB.gameObject;

                if (objA && objB) {
                    this.handleCollision(objA, objB, pair);
                    this.handleCollision(objB, objA, pair);
                }
            }
        });

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
        
        // console.log("[BaseGameScene] All collision and overlap listeners activated.");

        if (this.onSetupComplete) { this.onSetupComplete(); }
        this.events.emit('scene-ready');
    }

    /**
     */
    handleOverlap(sourceObject, targetObject, phase) {
        const actionInterpreter = this.actionInterpreter;
        if (!actionInterpreter || !sourceObject.getData) return;
        
        const events = sourceObject.getData('events');
        if (!events) return;
     

        const overlapKey = `overlap_${targetObject.name || targetObject.id}`;
        const wasOverlapping = sourceObject.getData(overlapKey);

        if (phase === 'active' && !wasOverlapping) {
            // --- Overlap Start ---
            sourceObject.setData(overlapKey, true); // 莉翫・㍾縺ｪ縺｣縺溘％縺ｨ繧定ｨ倬鹸
            for (const eventData of events) {
                if (eventData.trigger === 'onOverlap_Start' && eventData.targetGroup === targetObject.getData('group')) {
                    actionInterpreter.run(sourceObject, eventData, targetObject);
                }
            }
        } else if (phase === 'end' && wasOverlapping) {
            // --- Overlap End ---
            sourceObject.setData(overlapKey, false); // 驥阪↑繧翫′隗｣豸医＠縺溘％縺ｨ繧定ｨ倬鹸
            for (const eventData of events) {
                if (eventData.trigger === 'onOverlap_End' && eventData.targetGroup === targetObject.getData('group')) {
                   actionInterpreter.run(sourceObject, eventData, targetObject);
                }
            }
        }
    }


      /**
     */
    
handleCollision(sourceObject, targetObject, pair) {
        const actionInterpreter = this.actionInterpreter;
        if (!actionInterpreter || !sourceObject.getData) return;
        
        const events = sourceObject.getData('events');
        if (!events) return;

        for (const eventData of events) {
            if (eventData.targetGroup !== targetObject.getData('group')) {
                continue;
            }


            const trigger = eventData.trigger;

            if (trigger === 'onCollide_Start') {
                // console.log(`%c[Collision] COLLIDE Event: '${sourceObject.name}' collided with '${targetObject.name}'`, 'color: yellow');
              actionInterpreter.run(sourceObject, eventData, targetObject);
                continue; 
            }

            if (trigger === 'onStomp' || trigger === 'onHit') {
                
                let collisionNormal = pair.collision.normal;
                if (sourceObject.body === pair.bodyB) {
                    collisionNormal = { x: -collisionNormal.x, y: -collisionNormal.y };
                }

                const isStomp = collisionNormal.y < -0.7; // 縺ｻ縺ｼ逵滉ｸ翫°繧峨・陦晉ｪ・
                const isHit = !isStomp; // 縺昴ｌ莉･螟悶・蜈ｨ縺ｦ 'Hit' 縺ｨ縺吶ｋ

                if (trigger === 'onStomp' && isStomp) {
                    // console.log(`%c[Collision] STOMP Event: '${sourceObject.name}' stomped on '${targetObject.name}'`, 'color: lightgreen');
                   actionInterpreter.run(sourceObject, eventData, targetObject);
                }
                else if (trigger === 'onHit' && isHit) {
                    // console.log(`%c[Collision] HIT Event: '${sourceObject.name}' was hit by '${targetObject.name}'`, 'color: orange');
                    actionInterpreter.run(sourceObject, eventData, targetObject);
                }
            }
            
        }
    }

    /**
     */
    onEditorEventChanged(targetObject) {
        // console.log(`[${this.scene.key}] Rebuilding events for '${targetObject.name}'.`);
        this.applyEventsAndEditorFunctions(targetObject, targetObject.getData('events'));
    }

     /**
     * @returns {Phaser.GameObjects.GameObject}
     */

/**
 */
_addObjectFromEditorCore(createLayout, newName, layerName) {
    const centerX = this.cameras.main.scrollX + this.cameras.main.width / 2;
    const centerY = this.cameras.main.scrollY + this.cameras.main.height / 2;
    
    const newObjectLayout = {
        ...createLayout, // { texture, type } 縺ｪ縺ｩ縺ｮ諠・ｱ
        name: newName,
        x: Math.round(centerX), 
        y: Math.round(centerY),
        layer: layerName
    };
    
    const newGameObject = this.createObjectFromLayout(newObjectLayout);

    if (newGameObject) {
        this.applyProperties(newGameObject, newObjectLayout);

        this.initComponentsAndEvents(newGameObject);
    }
    
    return newGameObject;
}

    /**
     */
    addObjectFromEditor(assetKey, newName, layerName) {
        console.warn(`[BaseGameScene] addObjectFromEditor is not implemented in '${this.scene.key}'. Using default image implementation.`);
        return this._addObjectFromEditorCore({ texture: assetKey, type: 'Image' }, newName, layerName);
    }
    

    handleKeyPressEvents() {
       const actionInterpreter = this.actionInterpreter;
        if (!actionInterpreter || !sourceObject.getData) return;
        
        const events = sourceObject.getData('events');
        if (!events) return;
        for (const [key, events] of this.keyPressEvents.entries()) {
            const keyObject = this.input.keyboard.addKey(key);
            if (Phaser.Input.Keyboard.JustDown(keyObject)) {
                events.forEach(event => {
                    if(actionInterpreter) this.actionInterpreter.run(sourceObject, eventData, targetObject);
                });
            }
        }
    }

    

 /**
     */
    addPrefabFromEditor(prefabKey, newName, layerName) {
        const prefabData = this.cache.json.get(prefabKey);
        if (!prefabData) return null;

        const spawnPos = {
            x: this.cameras.main.scrollX + this.cameras.main.width / 2,
            y: this.cameras.main.scrollY + this.cameras.main.height / 2
        };

        const editorPlugin = this.plugins.get('EditorPlugin');

        if (prefabData.type === 'GroupPrefab') {
            const newGroupId = `group_${newName}_${Phaser.Math.RND.uuid().substr(0,4)}`;
            const createdObjects = [];

            prefabData.objects.forEach(childLayout => {
                const newLayout = { ...childLayout };
                newLayout.x = spawnPos.x + (childLayout.x || 0);
                newLayout.y = spawnPos.y + (childLayout.y || 0);
                newLayout.group = newGroupId;
                newLayout.layer = layerName;

                const newGameObject = this.createObjectFromLayout(newLayout);
                if (newGameObject) {
                    this.applyProperties(newGameObject, newLayout);
                    
                    if (editorPlugin && editorPlugin.isEnabled) {
                        editorPlugin.makeEditable(newGameObject, this);
                    }
                    
                    createdObjects.push(newGameObject);
                }
            });
            return createdObjects;

        } else { // 蜊倅ｸ繝励Ξ繝上ヶ縺ｮ蝣ｴ蜷・
            const newObjectLayout = { ...prefabData };
            newObjectLayout.name = newName;
            newObjectLayout.x = spawnPos.x;
            newObjectLayout.y = spawnPos.y;
            newObjectLayout.layer = layerName;

            const newGameObject = this.createObjectFromLayout(newObjectLayout);
            if (newGameObject) { // 笘・繧ｪ繝悶ず繧ｧ繧ｯ繝医′逕滓・縺ｧ縺阪◆縺狗｢ｺ隱・
                this.applyProperties(newGameObject, newObjectLayout);
                
                if (editorPlugin && editorPlugin.isEnabled) {
                    editorPlugin.makeEditable(newGameObject, this);
                }
            }
            return newGameObject;
        }
    }

fillObjectRange(sourceObject, endPoint) {
    if (!sourceObject || !sourceObject.scene) return;

    const gridWidth = sourceObject.displayWidth;
    const gridHeight = sourceObject.displayHeight;
    const startGridX = Math.round(sourceObject.x / gridWidth);
    const startGridY = Math.round(sourceObject.y / gridHeight);
    const endGridX = Math.round(endPoint.x / gridWidth);
    const endGridY = Math.round(endPoint.y / gridHeight);
    const fromX = Math.min(startGridX, endGridX);
    const toX = Math.max(startGridX, endGridX);
    const fromY = Math.min(startGridY, endGridY);
    const toY = Math.max(startGridY, endGridY);

    const sourceLayout = this.extractLayoutFromObject(sourceObject);
    
    const groupId = `fill_group_${Phaser.Math.RND.uuid()}`;
    
    for (let gx = fromX; gx <= toX; gx++) {
        for (let gy = fromY; gy <= toY; gy++) {
            const newLayout = { ...sourceLayout };
            newLayout.x = gx * gridWidth + (sourceLayout.originX === 0 ? 0 : gridWidth / 2); // 蜴溽せ繧定・・
            newLayout.y = gy * gridHeight + (sourceLayout.originY === 0 ? 0 : gridHeight / 2);
            newLayout.name = `${sourceLayout.name}_${gx}_${gy}`;
            newLayout.group = groupId;

            const newGameObject = this.createObjectFromLayout(newLayout);
            if (newGameObject) {
                this.applyProperties(newGameObject, newLayout);
                this.initComponentsAndEvents(newGameObject);
            }
        }
    }

    sourceObject.destroy();
    const editor = this.plugins.get('EditorPlugin');
    if (editor) {
        this.time.delayedCall(10, () => {
            editor.deselectAll();
        });
    }
}

    /**
     * @returns {Array<Phaser.GameObjects.GameObject>}
     */
    getObjectsByGroup(groupId) {
        if (!groupId) return [];
        return this.children.list.filter(obj => obj.getData('group') === groupId);
    }
    

    /**
     */
    extractLayoutFromObject(gameObject) {
        if (!gameObject || !gameObject.scene) {
            return {}; // 螳牙・縺ｮ縺溘ａ遨ｺ繧ｪ繝悶ず繧ｧ繧ｯ繝医ｒ霑斐☆
        }

        const layout = {
            name: gameObject.name,
            type: gameObject.constructor.name, // 'Image', 'Sprite', 'Text', 'Container' 縺ｪ縺ｩ繧定・蜍輔〒蜿門ｾ・

            // --- Transform ---
            x: Math.round(gameObject.x),
            y: Math.round(gameObject.y),
            scaleX: parseFloat(gameObject.scaleX.toFixed(3)),
            scaleY: parseFloat(gameObject.scaleY.toFixed(3)),
            angle: Math.round(gameObject.angle),
            alpha: parseFloat(gameObject.alpha.toFixed(3)),
            depth: gameObject.depth,
            
            displayWidth: gameObject.displayWidth,
            displayHeight: gameObject.displayHeight,

            // --- Data ---
            group: gameObject.getData('group'),
            layer: gameObject.getData('layer'),
            components: gameObject.getData('components'),
            events: gameObject.getData('events'),
        };

        if (gameObject instanceof Phaser.GameObjects.Text) {
            layout.text = gameObject.text;
            layout.style = gameObject.style.toJSON();
        } 
        else if (gameObject instanceof Phaser.GameObjects.Sprite) {
            layout.texture = gameObject.texture.key;
            layout.frame = gameObject.frame.name;
        }
        else if (gameObject instanceof Phaser.GameObjects.Image) {
            layout.texture = gameObject.texture.key;
        }
        
        if (gameObject.body) {
            const body = gameObject.body;
            layout.physics = {
                isStatic: body.isStatic,
                isSensor: body.isSensor,
                fixedRotation: body.fixedRotation, // 笘・蝗櫁ｻ｢蝗ｺ螳壹・迥ｶ諷九ｒ菫晏ｭ・
                shape: gameObject.getData('shape') || 'rectangle',
                ignoreGravity: gameObject.getData('ignoreGravity') === true,
                friction: body.friction,
                restitution: body.restitution,
                collisionFilter: {
                    category: body.collisionFilter.category,
                    mask: body.collisionFilter.mask
                }
            };
        }
        
        return layout;
    }
    /**
     */
    createSceneSnapshot() {
        const snapshot = {
            sceneKey: this.scene.key,
            objects: []
        };

        for (const gameObject of this.children.list) {
            if (!gameObject.active || !gameObject.name || gameObject.name.startsWith('__')) {
                continue;
            }

            const objectState = {
                name: gameObject.name,
                x: Math.round(gameObject.x),
                y: Math.round(gameObject.y),
                scaleX: gameObject.scaleX,
                scaleY: gameObject.scaleY,
                angle: gameObject.angle,
                alpha: gameObject.alpha,
                components: {} // 繧ｳ繝ｳ繝昴・繝阪Φ繝医ョ繝ｼ繧ｿ繧剃ｿ晏ｭ倥☆繧句勣
            };

            if (gameObject.components) {
                for (const compName in gameObject.components) {
                    const component = gameObject.components[compName];
                    if (component && typeof component.serialize === 'function') {
                        objectState.components[compName] = component.serialize();
                    }
                }
            }

            snapshot.objects.push(objectState);
        }
        
        return snapshot;
    }

    /**
     */
    exportScene() {
        const sceneData = {
            scene_settings: this.sceneSettings || {},
            objects: [],
            layers: this.editorUI ? this.editorUI.layers : []
        };

        const objects = this.children.list;
        for (const obj of objects) {
            if (!obj.active || obj.name.startsWith('__') || obj.getData('doNotSave')) continue;

            const layout = this.extractLayoutFromObject(obj);
            sceneData.objects.push(layout);
        }

        return sceneData;
    }

    /**
     */
    clearScene() {
        const objects = [...this.children.list];
        for (const obj of objects) {
            if (!obj.getData('doNotSave')) {
                obj.destroy();
            }
        }
        
        this.ySortableObjects = [];
        this.updatableComponents.clear();
        this._deferredActions = [];
    }

    shutdown() {
        super.shutdown();
    }
}
