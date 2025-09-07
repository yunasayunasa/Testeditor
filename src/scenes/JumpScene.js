// src/scenes/JumpScene.js (最終確定版)

import BaseGameScene from './BaseGameScene.js';
import ActionInterpreter from '../core/ActionInterpreter.js';
import PlayerController from '../components/PlayerController.js';
export default class JumpScene extends BaseGameScene {

    constructor() {
        super({ key: 'JumpScene' });
        
        // --- 入力管理プロパティ ---
        this.movePointerId = null;     // 移動操作を担当する指のID
        this.actionPointerId = null;   // アクション操作を担当する指のID
        
        // --- 操作対象への参照 ---
        this.virtualStick = null;
        this.jumpButton = null;
        this.playerController = null;
    }

    create() {
        this.initSceneWithData();
        
        // ★★★ 唯一の入力リスナーを、シーン自身に設定 ★★★
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerup', this.handlePointerUp, this);
    }

    onSetupComplete() {
        // --- プレイヤーと床のセットアップ ---
        const player = this.children.list.find(obj => obj.getData('group') === 'player');
        if (player) {
            this.cameras.main.startFollow(player, true, 0.1, 0.1);
            this.playerController = player.components?.PlayerController;
        }
        const floors = this.children.list.filter(obj => obj.getData('group') === 'floor');
        if (player && floors.length > 0) this.physics.add.collider(player, floors);
        
        // --- UI部品への参照を取得 ---
        const uiScene = this.scene.get('UIScene');
        if (uiScene) {
            this.virtualStick = uiScene.uiElements.get('virtual_stick');
            this.jumpButton = uiScene.uiElements.get('jump_button');
        }
    }

    handlePointerDown(pointer) {
        const screenHalfX = this.scale.width / 2;

        if (pointer.x < screenHalfX) {
            // --- 画面左側 ---
            if (this.movePointerId === null) {
                this.movePointerId = pointer.id;
            }
        } else {
            // --- 画面右側 ---
            if (this.actionPointerId === null) {
                this.actionPointerId = pointer.id;
                if (this.playerController) this.playerController.jump();
                if (this.jumpButton) this.jumpButton.setPressed(true); // ★ JumpButtonに命令
            }
        }
    }

    handlePointerMove(pointer) {
        if (pointer.id === this.movePointerId) {
            if (this.virtualStick) this.virtualStick.updatePosition(pointer);
        }
    }

    handlePointerUp(pointer) {
        if (pointer.id === this.movePointerId) {
            this.movePointerId = null;
            if (this.virtualStick) this.virtualStick.reset();
        }
        if (pointer.id === this.actionPointerId) {
            this.actionPointerId = null;
            if (this.jumpButton) this.jumpButton.setPressed(false); // ★ JumpButtonに命令
        }
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

    /**
     * コンポーネントをGameObjectにアタッチする (責務を単一化)
     * ★★★ 以下のメソッドで、既存の addComponent を完全に置き換えてください ★★★
     */
    addComponent(target, componentType, params = {}) {
        let componentInstance = null;
        
        // --- 1. インスタンス生成 ---
        if (componentType === 'PlayerController') {
            componentInstance = new PlayerController(this, target, params);
        }
        // ... (将来、EnemyAIなどをここに追加) ...

        if (componentInstance) {
            // --- 2. GameObjectにインスタンスを格納 ---
            // これがコンポーネント管理の「唯一の正しい場所」
            if (!target.components) {
                target.components = {};
            }
            target.components[componentType] = componentInstance;

            // --- 3. 永続化用のデータも保存 ---
            const currentData = target.getData('components') || [];
            if (!currentData.some(c => c.type === componentType)) {
                currentData.push({ type: componentType, params: params });
                target.setData('components', currentData);
            }
            console.log(`[JumpScene] Component '${componentType}' added to '${target.name}'.`);
        }
    }

  

// ... (他のメソッドは変更なし) ...

   update() {
        if (this.playerController) {
            const stickDirection = this.virtualStick ? this.virtualStick.direction : new Phaser.Math.Vector2(0, 0);
            this.playerController.updateWithStick(stickDirection);
        }
    }
    
    /**
     * シーン終了時に、全GameObjectのコンポーネントを破棄する
     * ★★★ 以下のメソッドで、既存の shutdown を完全に置き換えてください ★★★
     */
    shutdown() {
        console.log("[JumpScene] Shutdown.");
        // シーン上の全GameObjectを走査
        if (this.children) { // シーンが正常に破棄されることを確認
            for (const gameObject of this.children.list) {
                if (gameObject.components) {
                    for (const key in gameObject.components) {
                        const component = gameObject.components[key];
                        if (component && typeof component.destroy === 'function') {
                            component.destroy();
                        }
                    }
                }
            }
        }
        super.shutdown();
    }
}