// src/scenes/JumpScene.js

import BaseGameScene from './BaseGameScene.js';
import ActionInterpreter from '../core/ActionInterpreter.js';

export default class JumpScene extends BaseGameScene {

    constructor() {
        super({ key: 'JumpScene' });
        
        this.player = null;
        this.cursors = null;
        this.actionInterpreter = null;
    }

    /**
     * シーンが起動する時に、SystemSceneから渡されたデータを受け取る
     */
    init(data) {
        console.log(`[JumpScene] Initialized with data:`, data);
    }
    
    /**
     * シーン固有のアセットをロードする
     */
    preload() {
        // (注: ファイル自体はPreloadSceneでロード済み)
        this.load.image('player_char', 'assets/images/player_placeholder.png');
        this.load.image('ground_tile', 'assets/images/ground_placeholder.png');
    }

    /**
     * シーンが作成される時のメイン処理
     */
    create() {
        console.log("[JumpScene] Create started.");
        
        // --- 1. シーン固有の初期化 ---
        this.actionInterpreter = new ActionInterpreter(this);
        this.cameras.main.setBackgroundColor('#4488cc');
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // ★★★ 開発の5ヶ条: 第2条 - BGMはcreateで再生 ★★★
        const soundManager = this.registry.get('soundManager');
        if (soundManager) soundManager.playBgm('bgm_action');
        
        // --- 2. 世界の境界と、デバッグ用グリッドの描画 ---
        const worldWidth = 3840;
        const worldHeight = 720;
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        const gridGraphics = this.add.graphics();
        gridGraphics.lineStyle(1, 0x000000, 0.2);
        for (let x = 0; x < worldWidth; x += 100) {
            gridGraphics.moveTo(x, 0); gridGraphics.lineTo(x, worldHeight);
        }
        for (let y = 0; y < worldHeight; y += 100) {
            gridGraphics.moveTo(0, y); gridGraphics.lineTo(worldWidth, y);
        }
        gridGraphics.lineStyle(3, 0xff0000, 0.5);
        gridGraphics.strokeRect(0, 0, 1280, 720);
        gridGraphics.stroke();
        gridGraphics.setDepth(-10);

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
     * BaseGameSceneのfinalizeSetupから呼び出される、このシーン固有の最終処理
     */
    onSetupComplete() {
        console.log("[JumpScene] onSetupComplete called.");

        // --- 参照の取得 ---
        this.player = this.children.list.find(obj => obj.name === 'player');
        
        // --- 衝突判定の定義 ---
        const floors = this.children.list.filter(obj => obj.name.startsWith('ground'));

        if (this.player) {
            console.log("[JumpScene] Player object found. Setting up camera and physics.");
            if (floors.length > 0) {
                this.physics.add.collider(this.player, floors);
            }
            this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            this.cameras.main.setBounds(0, 0, 3840, 720);
        } else {
            console.warn("[JumpScene] Player object named 'player' not found. Player controls are disabled.");
        }
    }
    
    /**
     * 毎フレーム呼び出される更新処理
     */
    update(time, delta) {
        if (!this.player || !this.player.body) {
            return;
        }

        // --- プレイヤーの操作 ---
        if (this.cursors.left.isDown) this.player.body.setVelocityX(-200);
        else if (this.cursors.right.isDown) this.player.body.setVelocityX(200);
        else this.player.body.setVelocityX(0);

        if (this.cursors.up.isDown && this.player.body.touching.down) this.player.body.setVelocityY(-350);
        
        // --- ゲーム終了条件のチェック ---
        if (this.player.y > this.cameras.main.height + 100) {
            // ★★★ 開発の5ヶ条: 第3条 - ノベル復帰はSystemSceneに依頼 ★★★
            this.scene.get('SystemScene').events.emit('return-to-novel', { from: this.scene.key });
        }
    }

    /**
     * シーンが破棄される時の後片付け
     */
    shutdown() {
        // ★★★ 開発の5ヶ条: 第4条 - shutdownで後片付け ★★★
        console.log("[JumpScene] Shutdown.");
        super.shutdown();
    }
}
