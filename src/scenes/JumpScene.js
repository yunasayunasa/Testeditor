
import BaseGameScene from './BaseGameScene.js';


export default class JumpScene extends BaseGameScene {

     constructor() {
        super({ key: 'JumpScene' });
        this.joystick = null;
        this.playerController = null; // ★ playerControllerもnullで初期化
        this.lightSources = [];
    }

  create() {
        console.log("[JumpScene] Create started.");
        super.create();
    
        this.cameras.main.setBackgroundColor('#4488cc');
           //    'true'を指定すると、外側から内側に向かって暗くなるビネットになる
   /* const vignetteEffect = this.cameras.main.postFX.addVignette(0.5, 0.5, 0.7, true);

    // --- 2. (オプション) ビネットの見た目を調整 ---
    //    内側の明るい円の半径 (0.0 ～ 1.0)
    vignetteEffect.radius = 0.8; 
    //    ビネットの強さ (0.0 ～ 1.0)
    vignetteEffect.strength = 0.6; 
    
    console.log("[JumpScene] Vignette effect applied to the main camera.");*/
        const soundManager = this.registry.get('soundManager');
        if (soundManager) soundManager.playBgm('bgm_action');

        const worldWidth = 3840;
        const worldHeight = 720;

        // ★★★ ここからがMatter.jsへの対応です ★★★
        // 1. Matter.jsのAPIを使って、世界の境界を設定する
        this.matter.world.setBounds(0, 0, worldWidth, worldHeight);
    this.matter.world.timeScale = 1;
    console.log(`[JumpScene] Matter.js world time scale was set to: ${this.matter.world.timeScale}`);
        // 2. カメラの境界設定は、物理エンジンとは無関係なので、そのまま使える
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        // ★★★ ここまで ★★★
  // initSceneWithData を呼び出す「前」に、JSONデータを先読みする

    // 1. 読み込むべきJSONのキーを決定する
    const keyToLoad = this.layoutDataKey || this.scene.key;
    const layoutData = this.cache.json.get(keyToLoad);

    // 2. JSONデータ内に hasJoystick: true のフラグがあれば、ジョイスティックを生成
    if (layoutData && layoutData.hasJoystick) {
        console.log("[JumpScene] Joystick found in layout data. Re-creating joystick...");
        
        // ★ addJoystickFromEditorを、シーン自身の初期化のために再利用する
        //    (ただし、アラートは出ないように少し改修すると、より良い)
        this.addJoystickFromEditor(); 
    } else {
        // デバッグモードでない、かつJSONにもない場合は、従来のロジックで生成
        const isDebug = new URLSearchParams(window.location.search).has('debug');
        if (!isDebug) {
             this.addJoystickFromEditor(); // 常に表示する場合
        }
    }
        // データからシーンを構築する命令は最後に呼ぶ
         this.initSceneWithData();
      const uiScene = this.scene.get('UIScene');

   
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
        for (const source of this.lightSources) {
            if (source.object.active) {
                source.light.setPosition(source.object.x, source.object.y);
            }
        }
        // ★ attachJumpButtonListenerは、playerControllerが見つかってから呼び出す方が安全
        if (this.playerController) {
          
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
   onSetupComplete() {
    console.log("[JumpScene] onSetupComplete called.");

    // --- 1. JSONデータを読み込む (キーは動的に決定) ---
    const keyToLoad = this.layoutDataKey || this.scene.key;
    const layoutData = this.cache.json.get(keyToLoad);

    // --- 2. 読み込んだデータに基づいてジョイスティックを再生成 ---
    if (layoutData && layoutData.hasJoystick) {
        this.addJoystickFromEditor(false); 
    } else {
        // (IDEモードでないならデフォルトで表示、などのロジックはここに)
        const isDebug = new URLSearchParams(window.location.search).has('debug');
        if (!isDebug) {
             this.addJoystickFromEditor(false);
        }
    }
       // --- 1. 「照らされる」オブジェクトを設定 ---
    //    シーン上のすべてのImageとSpriteに、ライティングを適用する
    this.children.list.forEach(child => {
        if (child instanceof Phaser.GameObjects.Image || child instanceof Phaser.GameObjects.Sprite) {
            child.setPipeline('Light2D');
        }
    });

    // --- 2. 「光源」オブジェクトを探して、ライトを追加 ---
    const torchObjects = this.getObjectsByGroup('torch'); 

        for (const torchObject of torchObjects) {
            const torchLight = this.lights.addLight(torchObject.x, torchObject.y, 200);
            torchLight.setColor(0xffaa33);
            torchLight.setIntensity(2.0);

            // ★ 追従させるために、オブジェクトとライトのペアを配列に保存
            this.lightSources.push({
                object: torchObject,
                light: torchLight
            });
        }

    // --- 3. プレイヤーとカメラのセットアップ (変更なし) ---
    this.setupPlayerAndCamera(); // ★ onSetupComplete内でヘルパーを呼ぶ形に統一
    this.attachJumpButtonListener();
}
      /**
     * ★★★ 復活・確定版 ★★★
     * EditorUIからの要求に応じて、シーンにジョイスティックを生成する。
     * 冪等性（何度呼ばれても安全であること）を保証する。
     */
    addJoystickFromEditor(isFromEditor = true) { // ★ 引数を追加
    if (this.joystick && this.joystick.scene) {
        if (isFromEditor) alert('ジョイスティックは既にシーンに存在します。');
        return;
    }

        // --- 2. 必要なプラグインが利用可能かチェック ---
        const joystickPlugin = this.plugins.get('rexvirtualjoystickplugin');
        if (!joystickPlugin) {
            alert('エラー: Virtual Joystick Pluginがロードされていません。');
            return;
        }

        console.log("[JumpScene] Adding joystick from editor request...");

        // --- 3. ジョイスティックを生成・設定 ---
        this.joystick = joystickPlugin.add(this, {
            x: 150,
            y: this.cameras.main.height - 150, // カメラの表示範囲の左下に配置
            radius: 100,
            // ジョイスティックの各パーツはUIなので、カメラをスクロールしても動かないようにし、常に最前面に表示
            base: this.add.circle(0, 0, 100, 0x888888, 0.5).setScrollFactor(0).setDepth(1000),
            thumb: this.add.circle(0, 0, 50, 0xcccccc, 0.8).setScrollFactor(0).setDepth(1000),
        });

        // --- 4. 成功したことをユーザーに伝える ---
        // (アラートは少し煩わしいので、コンソールログの方が良いかもしれません)
        if (isFromEditor) console.log("ジョイスティックがシーンに追加されました。");
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