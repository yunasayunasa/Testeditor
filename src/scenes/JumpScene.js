// src/scenes/JumpScene.js (最終確定版)

import BaseGameScene from './BaseGameScene.js';
import ActionInterpreter from '../core/ActionInterpreter.js';
import PlayerController from '../components/PlayerController.js';

export default class JumpScene extends BaseGameScene {

    constructor() {
        super({ key: 'JumpScene' });
 this.movePointer = null;     // 移動操作を担当する指
        this.actionPointer = null;   // アクション操作を担当する指
        this.virtualStick = null;    // VirtualStickのインスタンスへの参照
        this.playerController = null; // PlayerControllerのインスタンスへの参照
        this.actionInterpreter = null;
    }

    create() {
        console.log("[JumpScene] Create started.");
            this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointermove', this.handlePointerMove, this);
        this.input.on('pointerup', this.handlePointerUp, this);
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
  onSetupComplete() {
        const player = this.children.list.find(obj => obj.getData('group') === 'player');
        if (player) {
            this.cameras.main.startFollow(player, true, 0.1, 0.1);
            // ★ PlayerControllerのインスタンスをシーン変数に格納
            this.playerController = player.components?.PlayerController;
        }

        const floors = this.children.list.filter(obj => obj.getData('group') === 'floor');
        if (player && floors.length > 0) {
            this.physics.add.collider(player, floors);
        }
        
        // ★ UISceneからVirtualStickのインスタンスを取得
        const uiScene = this.scene.get('UIScene');
        if (uiScene) {
            this.virtualStick = uiScene.uiElements.get('virtual_stick');
        }
    }

    handlePointerDown(pointer) {
        const screenHalfX = this.scale.width / 2;

        if (pointer.x < screenHalfX) {
            // --- 画面左側がタッチされた ---
            // 既に移動用の指がなければ、この指を移動用として割り当てる
            if (this.movePointer === null) {
                this.movePointer = pointer;
                if (this.virtualStick) {
                    this.virtualStick.show(pointer.x, pointer.y); // スティックをタッチ位置に表示
                }
            }
        } else {
            // --- 画面右側がタッチされた ---
            if (this.actionPointer === null) {
                this.actionPointer = pointer;
                if (this.playerController) {
                    this.playerController.jump(); // PlayerControllerにジャンプを命令
                }
                 // (お好みで) JumpButtonの見た目を変える命令もここに追加できる
            }
        }
    }

    handlePointerMove(pointer) {
        // この指が、登録された移動用の指である場合のみ処理
        if (this.movePointer && pointer.id === this.movePointer.id) {
            if (this.virtualStick) {
                // スティックに、現在の指の位置を渡して更新させる
                this.virtualStick.updatePosition(pointer);
            }
        }
    }

    handlePointerUp(pointer) {
        // この指が移動用の指だった場合
        if (this.movePointer && pointer.id === this.movePointer.id) {
            this.movePointer = null; // 割り当てを解除
            if (this.virtualStick) {
                this.virtualStick.hideAndReset(); // スティックを隠してリセット
            }
        }
        
        // この指がアクション用の指だった場合
        if (this.actionPointer && pointer.id === this.actionPointer.id) {
            this.actionPointer = null; // 割り当てを解除
            // (お好みで) JumpButtonの見た目を元に戻す命令もここに追加できる
        }
    }

    update(time, delta) {
        // ★ PlayerControllerの更新処理を、シーンから直接呼び出す
        if (this.playerController && this.virtualStick) {
            // PlayerControllerにスティックの現在の方向を渡す
            this.playerController.updateWithStick(this.virtualStick.direction);
        } else if(this.playerController) {
             // スティックがない場合も考慮 (PCキーボード操作など)
             this.playerController.updateWithStick(new Phaser.Math.Vector2(0, 0));
        }
    }
    
// ... (他のメソッドは変更なし) ...

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