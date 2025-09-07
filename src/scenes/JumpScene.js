// src/scenes/JumpScene.js
//マリオやソニックのような横から見る２Dゲームシーン用のテンプレートシーンです。これをベースに作ってください。
// src/scenes/JumpScene.js

import BaseGameScene from './BaseGameScene.js';
import ActionInterpreter from '../core/ActionInterpreter.js';
import PlayerController from '../components/PlayerController.js';

export default class JumpScene extends BaseGameScene {

    constructor() {
        super({ key: 'JumpScene' });
        // ★ プロパティの初期化をここにまとめる
        this.components = [];
        this.actionInterpreter = null;
    }

    create() {
        console.log("[JumpScene] Create started.");
        
        this.actionInterpreter = new ActionInterpreter(this);
        this.cameras.main.setBackgroundColor('#4488cc');
        
        const soundManager = this.registry.get('soundManager');
        if (soundManager) soundManager.playBgm('bgm_action');

        // --- 世界の境界と、デバッグ用グリッドの描画 (変更なし) ---
        const worldWidth = 3840;
        const worldHeight = 1440;
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        // ... (グリッド描画のコードは省略) ...
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

        // --- 親の汎用ルーチンを呼び出して、JSONからシーンを構築 ---
        this.initSceneWithData();
    }

    /**
     * 【JumpScene専用】
     * エディタからオブジェクト追加の依頼を受けた時の処理 (変更なし)
     */
    addObjectFromEditor(assetKey, newName) {
        // ... (このメソッドは完璧です) ...
        const centerX = this.cameras.main.scrollX + this.cameras.main.width / 2;
        const centerY = this.cameras.main.scrollY + this.cameras.main.height / 2;
        
        const newImage = this.createObjectFromLayout({
            texture: assetKey,
            type: this.game.cache.json.get(assetKey + '_image') ? 'Image' : 'Sprite' // Spritesheetか判定
        });
        
        this.applyProperties(newImage, {
            name: newName,
            x: centerX, y: centerY
        });
        
        return newImage;
    }

    /**
     * BaseGameSceneから呼び出され、このシーン固有のコンポーネントを生成する
     * (重複していた定義を削除し、こちらに統一)
     */
    addComponent(target, componentType, params = {}) {
        let component = null;
        if (componentType === 'PlayerController') {
            component = new PlayerController(this, target, params);
        }
        // ... 将来、他のコンポーネント（EnemyAIなど）もここに追加 ...

        if (component) {
            this.components.push(component);
            
            if (!target.components) target.components = {};
            target.components[componentType] = component;

            // エディタ出力用のデータを保存
            const currentComps = target.getData('components') || [];
            if (!currentComps.some(c => c.type === componentType)) {
                currentComps.push({ type: componentType, params: params });
                target.setData('components', currentComps);
            }
        }
    }

    /**
     * 全てのオブジェクトとコンポーネントが配置された後に呼ばれる (変更なし)
     */
    onSetupComplete() {
        console.log("[JumpScene] onSetupComplete called.");
        
        const player = this.children.list.find(obj => obj.components?.PlayerController);
        
        if (player) {
            console.log("[JumpScene] Player object found. Setting up camera.");
            this.cameras.main.startFollow(player, true, 0.1, 0.1);
        } else {
            console.warn("[JumpScene] PlayerController component not found on any object.");
        }
    }
    
    update(time, delta) {
        // シーンに登録された、全てのコンポーネントのupdateを呼び出す
        for (const component of this.components) {
            if (component.update) {
                component.update(time, delta);
            }
        }
        
        // ★ onKeyPressイベントの処理はBaseGameSceneが担当するので、ここからは削除
    }

    /**
     * シーンが破棄される時の後片付け
     */
    shutdown() {
        console.log("[JumpScene] Shutdown.");
        
        // ★ コンポーネントが持つリソースを解放する
        for (const component of this.components) {
            if (component.destroy) component.destroy();
        }
        this.components = [];
        
        // ★ 親クラスのshutdownを呼び出す
        super.shutdown();
    }
}