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

onSetupComplete() {
        console.log("[JumpScene] onSetupComplete called.");

        // --- プレイヤーと床オブジェクトの取得 ---
        this.player = this.children.list.find(obj => obj.getData('group') === 'player');
        const floors = this.children.list.filter(obj => obj.getData('group') === 'floor');

        if (this.player) {
            console.log("[JumpScene] Player object found. Setting up components, camera, and physics.");
            
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            // ★★★ 2. ここで PlayerController を生成し、登録する ★★★
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            const playerController = new PlayerController(this, this.player);
            this.components.push(playerController);
            
            // --- 物理とカメラの設定 (これは元のコードのまま) ---
            if (floors.length > 0) {
                this.physics.add.collider(this.player, floors);
            }
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            
        } else {
            console.warn("[JumpScene] No object with group 'player' found.");
        }
    }
    
    /**
     * 毎フレーム呼び出される更新処理
     */
    update(time, delta) {
        if (!this.player || !this.player.body) {
            return;
        }
 // 2. このシーンに登録された、全てのコンポーネントのupdateを呼び出す
        for (const component of this.components) {
            if (component.update) {
                component.update(time, delta);
            }
        }
      

      
        
        // --- ゲーム終了条件のチェック ---
        if (this.player.y > this.cameras.main.height + 100) {
            // ★★★ 開発の5ヶ条: 第3条 - ノベル復帰はSystemSceneに依頼 ★★★
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
            for (const key in params) {
                if (component[key] !== undefined) component[key] = params[key];
            }
            this.components.push(component);
            if (!target.components) target.components = {};
            target.components[componentType] = component;
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