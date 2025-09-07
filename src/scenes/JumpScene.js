// src/scenes/JumpScene.js (最終確定版)

import BaseGameScene from './BaseGameScene.js';
import ActionInterpreter from '../core/ActionInterpreter.js';
import PlayerController from '../components/PlayerController.js';

export default class JumpScene extends BaseGameScene {

    constructor() {
        super({ key: 'JumpScene' });

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
        const player = this.children.list.find(obj => obj.components?.PlayerController);
        
        if (player) {
            this.cameras.main.startFollow(player, true, 0.1, 0.1);
        } else {
            console.warn("[JumpScene] PlayerController component not found on any object.");
        }
    }
    
   // src/scenes/JumpScene.js

// ... (他のメソッドは変更なし) ...

    /**
     * シーン上の全GameObjectを走査し、アタッチされたコンポーネントを更新する
     * ★★★ 以下のメソッドで、既存の update を完全に置き換えてください ★★★
     * (エラー捕捉機能付き・最終決戦バージョン)
     */
  // src/components/PlayerController.js (究極デバッグログ版)

export default class PlayerController {
    
    // ... (constructor, findUiElements は変更なし) ...
    
    update(time, delta) {
        // --- ステップ1: ターゲットの存在確認 ---
        if (!this.target || !this.target.active) {
            // console.log("[PC-Debug] Target is null or inactive. Skipping.");
            return;
        }
        
        // --- ステップ2: 物理ボディの存在確認 ---
        const body = this.target.body;
        if (!body) {
            console.warn(`[PC-Debug] Target '${this.target.name}' has NO physics body. Skipping.`);
            return;
        }

        // --- ステップ3: 入力状態の取得 ---
        let moveX = 0;
        if (this.cursors.left.isDown) moveX = -1;
        if (this.cursors.right.isDown) moveX = 1;

        if (this.virtualStick) {
            if (this.virtualStick.isLeft) moveX = -1;
            if (this.virtualStick.isRight) moveX = 1;
        }
        
        // ★★★ 核心となるデバッグログ ★★★
        if (moveX !== 0) {
            console.log(`[PC-Debug] Frame ${Math.round(time)}: Input detected. moveX = ${moveX}. Applying velocity...`);
            console.log(`[PC-Debug] Body before velocity change:`, {
                x: body.x,
                y: body.y,
                vx: body.velocity.x,
                vy: body.velocity.y,
                isStatic: body.isStatic,
                allowGravity: body.allowGravity,
                moves: body.moves
            });
        }
        // ★★★★★★★★★★★★★★★★★★★★★★

        // --- ステップ4: 物理ボディへの速度設定 ---
        body.setVelocityX(moveX * this.moveSpeed);

        // --- ステップ5: ジャンプ入力 ---
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.jump();
        }
    }

    jump() {
        if (this.target && this.target.body && this.target.body.touching.down) {
            console.log("[PC-Debug] Jump condition met. Applying velocity.");
            this.target.body.setVelocityY(this.jumpVelocity);
        }
    }

    // ... (destroy は変更なし) ...
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