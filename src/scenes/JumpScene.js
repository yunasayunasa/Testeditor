// src/scenes/JumpScene.js
//マリオやソニックのような横から見る２Dゲームシーン用のテンプレートシーンです。これをベースに作ってください。

import BaseGameScene from './BaseGameScene.js';
import ActionInterpreter from '../core/ActionInterpreter.js';

import PlayerController from '../components/PlayerController.js'; // ★ 直接インポート
export default class JumpScene extends BaseGameScene {

    constructor() {
        super({ key: 'JumpScene' });
         this.components = [];
        this.player = null;
        this.cursors = null;
        this.actionInterpreter = null;
        this.keyPressEvents = new Map();
    }

    create() {
     
        console.log("[JumpScene] Create started.");
        
        // --- 1. シーン固有の初期化 ---
        this.actionInterpreter = new ActionInterpreter(this);
        this.cameras.main.setBackgroundColor('#4488cc');
        this.cursors = this.input.keyboard.createCursorKeys();
            this.components = [];
        const soundManager = this.registry.get('soundManager');
        if (soundManager) soundManager.playBgm('bgm_action');
         // ★★★ 2. 毎フレーム、キー入力イベントをチェックするリスナーを追加 ★★★
        this.events.on('update', this.handleKeyPressEvents, this);
        // --- 2. 世界の境界と、デバッグ用グリッドの描画 ---
        const worldWidth = 3840;
        const worldHeight = 1440;
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        const gridGraphics = this.add.graphics();
        gridGraphics.lineStyle(1, 0x000000, 0.2);
        for (let x = 0; x < worldWidth; x += 100) { gridGraphics.moveTo(x, 0); gridGraphics.lineTo(x, worldHeight); }
        for (let y = 0; y < worldHeight; y += 100) { gridGraphics.moveTo(0, y); gridGraphics.lineTo(worldWidth, y); }
        gridGraphics.lineStyle(3, 0xff0000, 0.5);
        gridGraphics.strokeRect(0, 0, 1280, 720);
        gridGraphics.stroke();
        gridGraphics.setDepth(-10);

      this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
       // --- 1. このシーン自身が、エディタからの「イベント変更」信号を監視する ---
        this.game.events.on('editor_event_changed', (data) => {
            // このシーンのオブジェクトが対象の場合のみ、イベントを再設定
            if (data.target && data.target.scene === this) {
                console.log(`[${this.scene.key}] Re-applying events for '${data.target.name}'...`);
                // ★ 親が持つ、安全なヘルパーメソッドを呼び出す
                this.applyEvents(data.target);
            }
        }, this); // ★ thisを渡して、コンテキストを束縛する

        // --- 3. 親の汎用ルーチンを呼び出して、JSONからシーンを構築 ---
        this.initSceneWithData();
    }

    /**
     * 【JumpScene専用】
     * エディタからオブジェクト追加の依頼を受けた時の処理
     */
    addObjectFromEditor(assetKey, newName) {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        const newImage = this.createObjectFromLayout({
            texture: assetKey
        });
        
        this.applyProperties(newImage, {
            name: newName,
            x: centerX, y: centerY, scaleX: 1, scaleY: 1, angle: 0, alpha: 1, visible: true
        });
        
        return newImage;
    }

  /**
     * BaseGameSceneから呼び出され、このシーン固有のコンポーネントを生成する
     */
    addComponent(target, componentType, params = {}) {
        let component = null;
        if (componentType === 'PlayerController') {
            component = new PlayerController(this, target, params);
        }
        // ... 将来、他のコンポーネント（EnemyAIなど）もここに追加 ...

        if (component) {
            this.components.push(component); // シーンの更新リストに追加
            
            // オブジェクト自身にも、コンポーネントへの参照を持たせると便利
            if (!target.components) target.components = {};
            target.components[componentType] = component;
        }
    }

    /**
     * 全てのオブジェクトとコンポーネントが配置された後に呼ばれる
     */
    onSetupComplete() {
        console.log("[JumpScene] onSetupComplete called.");
        
        // PlayerControllerコンポーネントを持つオブジェクトを「プレイヤー」として扱う
        const player = this.children.list.find(obj => obj.components?.PlayerController);
        
        if (player) {
            console.log("[JumpScene] Player object found. Setting up camera and physics.");
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
    
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // ゲーム終了条件のチェック
        if (this.player && this.player.y > this.physics.world.bounds.height + 100) {
            this.scene.get('SystemScene').events.emit('return-to-novel', { from: this.scene.key });
        }
    }

       /**
     * ★★★ 新規メソッド ★★★
     * 毎フレーム実行され、キーが押されているかをチェックし、イベントを発火させる
     */
    handleKeyPressEvents() {
        if (!this.input.keyboard.enabled) return;
        
        for (const [key, events] of this.keyPressEvents.entries()) {
            const keyObject = this.input.keyboard.addKey(key);
            
            if (Phaser.Input.Keyboard.JustDown(keyObject)) {
                events.forEach(event => {
                    // ★★★ 変更点: シーンが持つインタープリタを直接使う ★★★
                    this.actionInterpreter.run(event.target, event.actions);
                });
            }
        }
    }

      /**
     * ★★★ 新規メソッド ★★★
     * このシーンに、コンポーネントを追加する
     */
    addComponent(target, componentType, params = {}) {
        let component = null;

        if (componentType === 'PlayerController') {
            component = new PlayerController(this, target);
        }

       if (component) {
            // シーンの更新リストに追加
            this.components.push(component);
            
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            // ★★★ ここで、オブジェクト自身に情報を書き込みます ★★★
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            if (!target.components) {
                target.components = {};
            }
            target.components[componentType] = component;

            // ★ データとしても保存しておくと、より堅牢
            const currentComps = target.getData('components') || [];
            if (!currentComps.some(c => c.type === componentType)) {
                currentComps.push({ type: componentType, params: params });
                target.setData('components', currentComps);
            }
        }
    }


    /**
     * シーンが破棄される時の後片付け
     */
    shutdown() {
        // ★★★ 開発の5ヶ条: 第4条 - shutdownで後片付け ★★★
        console.log("[JumpScene] Shutdown.");
           this.game.events.off('editor_event_changed', null, this);
        // ★★★ 3. シーン終了時に、イベントリスナーを必ず解除 ★★★
        this.events.off('update', this.handleKeyPressEvents, this);
          for (const component of this.components) {
            if (component.destroy) component.destroy();
        }
        this.components = [];
        super.shutdown();
    }
}