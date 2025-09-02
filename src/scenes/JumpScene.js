// src/scenes/JumpScene.js

import BaseGameScene from './BaseGameScene.js';

export default class JumpScene extends BaseGameScene {

    constructor() {
        super({ key: 'JumpScene' });
        
        // このシーンで使うプロパティを初期化
        this.player = null;
        this.cursors = null;
    }

    /**
     * シーンが起動する時に、SystemSceneから渡されたデータを受け取る
     * (今回は使わないが、将来のために用意)
     */
    init(data) {
        console.log(`[JumpScene] Initialized with data:`, data);
    }
    
    /**
     * シーン固有のアセットをロードする
     * (注: ファイル自体はPreloadSceneでロード済み。これはPhaserに
     *  「このシーンはこのアセットを使います」と伝えるための儀式に近い)
     */
    preload() {
        this.load.image('player_char', 'assets/images/player_placeholder.png');
        this.load.image('ground_tile', 'assets/images/ground_placeholder.png');
    }

    /**
     * シーンが作成される時のメイン処理
     */
    create() {
        console.log("[JumpScene] Create started.");
        
        // --- 1. シーン固有の初期化 ---
        this.cameras.main.setBackgroundColor('#4488cc');
        this.cursors = this.input.keyboard.createCursorKeys();

        // ★★★ 開発の5ヶ条: 第2条 - BGMはcreateで再生 ★★★
        const soundManager = this.registry.get('soundManager');
        if (soundManager) {
            soundManager.playBgm('bgm_action'); // あなたのbgmキーに合わせてください
        }
        
        // --- 2. 親の汎用ルーチンを呼び出して、JSONからシーンを構築 ---
        this.initSceneFromData();
    }

    /**
     * BaseGameSceneのfinalizeSetupから呼び出される、このシーン固有の最終処理
     */
    onSetupComplete() {
        console.log("[JumpScene] onSetupComplete called.");

        // --- 参照の取得 ---
        // BaseGameSceneが配置してくれたオブジェクトの中から、'player'を探す
        this.player = this.children.list.find(obj => obj.name === 'player');
        
        // --- 衝突判定の定義 ---
        const floors = this.children.list.filter(obj => obj.name.startsWith('ground'));
        if (this.player && floors.length > 0) {
            this.physics.add.collider(this.player, floors);
        }
    }
    
    /**
     * 毎フレーム呼び出される更新処理
     */
    update(time, delta) {
        if (!this.player || !this.player.body) return;

        // --- プレイヤーの操作 ---
        if (this.cursors.left.isDown) {
            this.player.body.setVelocityX(-200);
        } else if (this.cursors.right.isDown) {
            this.player.body.setVelocityX(200);
        } else {
            this.player.body.setVelocityX(0);
        }

        // 地面に接している時だけジャンプ可能
        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.body.setVelocityY(-350);
        }
        
        // --- ゲーム終了条件のチェック (例：画面下に落ちたら) ---
        if (this.player.y > this.cameras.main.height + 100) {
            
            // ★★★ 開発の5ヶ条: 第3条 - ノベル復帰はSystemSceneに依頼 ★★★
            // 自分自身を止めるのではなく、SystemSceneにイベントを送る
            this.scene.get('SystemScene').events.emit('return-to-novel', {
                from: this.scene.key,
                params: { 'f.last_action_result': '"落下してしまった..."' } // 何か結果を渡す
            });
        }
    }

    /**
     * シーンが破棄される時の後片付け
     */
    shutdown() {
        // ★★★ 開発の5ヶ条: 第4条 - shutdownで後片付け ★★★
        // このシーンで独自に作成したイベントリスナーやタイマーがあれば、ここで解除する
        console.log("[JumpScene] Shutdown.");
        super.shutdown();
    }

    // ★★★ 開発の5ヶ条: 第5条 - HUDは操作しない ★★★
    // このシーンは、UISceneのHPバーなどを直接操作しない。
    // HPが減るなどのイベントは、stateManager.setF(...) で通知する。
    // (例: 敵に当たったら `this.registry.get('stateManager').setF('player_hp', newValue);`)
}