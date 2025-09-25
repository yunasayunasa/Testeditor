
import BaseGameScene from './BaseGameScene.js';


export default class JumpScene extends BaseGameScene {

     constructor() {
        super({ key: 'JumpScene' });
        this.joystick = null;
        this.playerController = null; // ★ playerControllerもnullで初期化
        
    }

  create() {
        console.log("[JumpScene] Create started.");
        
    
        this.cameras.main.setBackgroundColor('#4488cc');
        
        const soundManager = this.registry.get('soundManager');
        if (soundManager) soundManager.playBgm('bgm_action');

        const worldWidth = 3840;
        const worldHeight = 1440;

        // ★★★ ここからがMatter.jsへの対応です ★★★
        // 1. Matter.jsのAPIを使って、世界の境界を設定する
        this.matter.world.setBounds(0, 0, worldWidth, worldHeight);
    this.matter.world.timeScale = 1;
    console.log(`[JumpScene] Matter.js world time scale was set to: ${this.matter.world.timeScale}`);
        // 2. カメラの境界設定は、物理エンジンとは無関係なので、そのまま使える
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        // ★★★ ここまで ★★★

        // データからシーンを構築する命令は最後に呼ぶ
         this.initSceneWithData();
      const uiScene = this.scene.get('UIScene');

    /*    // --- 2. ゲーム開始時には、メッセージウィンドウは不要なので非表示にする ---
        if (uiScene) {
            uiScene.setElementVisible('message_window', false);
        }*/
     // --------------------------------------------------------------------
        // --- デバッグモードでない時だけ、ジョイスティックを生成する ---
        const isDebug = new URLSearchParams(window.location.search).has('debug');

       if (!isDebug) {
            this.joystick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
                x: 150, y: 550, radius: 100,
                base: this.add.circle(0, 0, 100, 0x888888, 0.5),
                thumb: this.add.circle(0, 0, 50, 0xcccccc, 0.8),
            });
        } else {
            // デバッグモードの時は、joystickをnullのままにしておく
            this.joystick = null;
        }
    }
     dumpJoyStickState() {
        // このメソッドは、PlayerControllerのupdateで直接参照するため、
        // デバッグ以外では空でも良い
    }
       /**
     * ★★★ 修正版 ★★★
     * JumpSceneに特有のロジック（SpriteかImageかの判定）だけを行い、
     * 残りの共通処理はすべて親クラスに委譲する。
     */
    addObjectFromEditor(assetKey, newName, layerName) {
        // --- JumpScene固有の処理 ---
        const isSpriteSheet = this.game.cache.json.get(assetKey + '_spritesheet') ? true : false;
        const type = isSpriteSheet ? 'Sprite' : 'Image';
        
        // --- 共通処理は親クラス(super)を呼び出す ---
        return super._addObjectFromEditorCore({ texture: assetKey, type: type }, newName, layerName);
    }

  /**
     * ★★★ 新しいヘルパーメソッド ★★★
     * プレイヤーとカメラのセットアップ処理を分離・共通化する。
     * onSetupCompleteとupdateの両方から呼び出せるようにする。
     */
    setupPlayerAndCamera() {
        // children.getByNameは少し重いので、playerが既に見つかっていれば実行しない
        if (this.player && this.player.active) return;

        this.player = this.children.getByName('player');
        
        if (this.player) {
            console.log("[JumpScene] Player object found or re-acquired.");
            this.playerController = this.player.components?.PlayerController;
            this.player.setFixedRotation();
            
            if (this.cameras.main && !this.cameras.main.isFollowing) {
                this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
            }
        }
    }
    
    /**
     * ★★★ リアルタイム編集に対応したメインループ (最終FIX版) ★★★
     */
    update(time, delta) {
        super.update(time, delta);
        
        if (this.player && !this.player.active) {
            this.player = null;
            this.playerController = null;
        }

        if (!this.player) {
            this.setupPlayerAndCamera();
        }
        
        // ★ attachJumpButtonListenerは、playerControllerが見つかってから呼び出す方が安全
        if (this.playerController) {
            this.playerController.updateWithJoystick(this.joystick);
            this.attachJumpButtonListener(); // ここに移動
        }
    }
    
    // ... (setupPlayerAndCameraは変更なし) ...
    
    /**
     * ★★★ hasListenersエラーを修正した最終FIX版 ★★★
     * ジャンプボタンのリスナーを、重複しないように安全に設定する。
     */
    attachJumpButtonListener() {
        // --- 1. 必要なオブジェクトを取得 ---
        const uiScene = this.scene.get('UIScene');
        const jumpButton = uiScene?.uiElements?.get('jump_button');
        
        // --- ガード節: ボタンがなければ何もしない ---
        if (!jumpButton) {
            return;
        }

        // ▼▼▼【ここがエラーを解決する核心部分です】▼▼▼
        // --------------------------------------------------------------------
        // --- 2. リスナーが重複しないように、まず既存のリスナーをすべてクリアする ---
        //    'button_pressed'というイベントに登録されている全リスナーを削除します。
        jumpButton.off('button_pressed');

        // --- 3. 新しいリスナーを1つだけ登録する ---
        jumpButton.on('button_pressed', () => {
            // リスナー内部では、常に最新のplayerControllerを参照します。
            // (updateループで毎フレーム更新されているため、常に最新が保証される)
            if (this.playerController) {
                this.playerController.jump();
            }
        }, this);
        // --------------------------------------------------------------------
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        
        // ★ ログは初回だけでいいので、フラグで管理する
        if (!this._jumpButtonListenerAttached) {
            this._jumpButtonListenerAttached = true;
            console.log("[JumpScene] Jump button listener is now active.");
        }
    }
    /**
     * onSetupCompleteはJSONロード時の初期化の起点として機能する。
     */
    onSetupComplete() {
        console.log("[JumpScene] onSetupComplete called.");
        this.setupPlayerAndCamera();
        this.attachJumpButtonListener();
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