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

   /**
     * ★★★ 以下のメソッドで、既存の onSetupComplete を完全に置き換えてください ★★★
     */
    onSetupComplete() {
        // --- 1. グループ名でプレイヤーと床オブジェクトを全て検索 ---
        const player = this.children.list.find(obj => obj.getData('group') === 'player');
        
        // ★★★ "ground" を "floor" に修正 ★★★
        // ★★★ find を filter に変更し、複数の床に対応 ★★★
        const floors = this.children.list.filter(obj => obj.getData('group') === 'floor');
        
        // --- 2. プレイヤーが見つかったら、カメラと衝突判定を設定 ---
        if (player) {
            this.cameras.main.startFollow(player, true, 0.1, 0.1);

            // --- 3. 見つかった全ての床オブジェクトに対して、衝突判定を追加 ---
            if (floors.length > 0) {
                // floorsは配列なので、colliderは配列をそのまま受け取れる
                this.physics.add.collider(player, floors);
                console.log(`[JumpScene] Collider created between 'player' and ${floors.length} 'floor' objects.`);
            } else {
                console.warn("[JumpScene] No 'floor' group objects found to collide with.");
            }
        } else {
            console.warn("[JumpScene] 'player' group object not found.");
        }
    }
    
    
   // src/scenes/JumpScene.js

// ... (他のメソッドは変更なし) ...

    /**
     * シーン上の全GameObjectを走査し、アタッチされたコンポーネントを更新する
     * ★★★ 以下のメソッドで、既存の update を完全に置き換えてください ★★★
     * (エラー捕捉機能付き・最終決戦バージョン)
     */
    update(time, delta) {
        try { // ★★★ 1. 全ての更新処理を try で囲む ★★★

            for (const gameObject of this.children.list) {
                if (gameObject.components) {
                    for (const key in gameObject.components) {
                        const component = gameObject.components[key];
                        if (component && typeof component.update === 'function') {
                            component.update(time, delta);
                        }
                    }
                }
            }

        } catch (error) { // ★★★ 2. 発生したエラーを捕捉する ★★★
            
            // ★★★ 3. エラーの詳細をコンソールに表示する ★★★
            console.error("!!! RUNTIME ERROR CAUGHT IN JUMPSCENE UPDATE !!!");
            console.error("Error Message:", error.message);
            console.error("Error Stack:", error.stack);
            console.error("Error Object:", error);
            
            // ★★★ 4. (重要) エラーの連鎖を防ぐため、ゲームを安全に停止する ★★★
            this.scene.pause(); 
            console.error("!!! To prevent further errors, the scene has been paused. !!!");
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