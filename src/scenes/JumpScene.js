// src/scenes/JumpScene.js (最終確定版)

import BaseGameScene from './BaseGameScene.js';
import ActionInterpreter from '../core/ActionInterpreter.js';
import PlayerController from '../components/PlayerController.js';

export default class JumpScene extends BaseGameScene {

    constructor() {
        super({ key: 'JumpScene' });
        this.components = [];
        this.actionInterpreter = null;
    }

    create() {
        console.log("[JumpScene] Create started.");
        
        this.actionInterpreter = new ActionInterpreter(this);
        this.cameras.main.setBackgroundColor('#4488cc');
        
        const soundManager = this.registry.get('soundManager');
        if (soundManager) soundManager.playBgm('bgm_action');

        const worldWidth = 3840;
        const worldHeight = 1440;
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

        // ★ JSONからシーンを構築する親のメソッドを呼ぶ (これがJumpSceneのcreateの本体)
        this.initSceneWithData();
    }

    addObjectFromEditor(assetKey, newName) {
        const centerX = this.cameras.main.scrollX + this.cameras.main.width / 2;
        const centerY = this.cameras.main.scrollY + this.cameras.main.height / 2;
        
        // SpritesheetかImageかを判定するロジックはEditorUI側に持たせた方が良いかもしれないが、
        // ここでも機能はする
        const isSpriteSheet = this.game.cache.json.get(assetKey + '_spritesheet') ? true : false;
        
        const newObject = this.createObjectFromLayout({
            texture: assetKey,
            type: isSpriteSheet ? 'Sprite' : 'Image'
        });
        
        this.applyProperties(newObject, {
            name: newName,
            x: Math.round(centerX), 
            y: Math.round(centerY)
        });
        
        return newObject;
    }

    addComponent(target, componentType, params = {}) {
        let component = null;
        if (componentType === 'PlayerController') {
            component = new PlayerController(this, target, params);
        }

        if (component) {
            this.components.push(component);
            if (!target.components) target.components = {};
            target.components[componentType] = component;
        }
    }

    onSetupComplete() {
        const player = this.children.list.find(obj => obj.components?.PlayerController);
        
        if (player) {
            this.cameras.main.startFollow(player, true, 0.1, 0.1);
        } else {
            console.warn("[JumpScene] PlayerController component not found on any object.");
        }
    }
    
    update(time, delta) {
        for (const component of this.components) {
            if (component.update) {
                component.update(time, delta);
            }
        }
    }

    shutdown() {
        console.log("[JumpScene] Shutdown.");
        for (const component of this.components) {
            if (component.destroy) component.destroy();
        }
        this.components = [];
        super.shutdown();
    }
}