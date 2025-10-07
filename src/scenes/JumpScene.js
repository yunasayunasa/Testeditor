import BaseGameScene from './BaseGameScene.js';

export default class JumpScene extends BaseGameScene {

    constructor() {
        super({ key: 'JumpScene' });
        this.joystick = null;
        this.playerController = null;
    }

    create() {
        console.log("[JumpScene] Create started.");
        super.create(); // ★ 親クラスのcreateを先に呼ぶことを推奨します

        const soundManager = this.registry.get('soundManager');
        if (soundManager) soundManager.playBgm('bgm_action');

        const worldWidth = 3840;
        const worldHeight = 720;
        this.matter.world.setBounds(0, 0, worldWidth, worldHeight);
        this.matter.world.timeScale = 1;
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

        // データからシーンを構築
        this.initSceneWithData();
        
        // ★ 修正点 1: シーンの初期化後にジョイスティックを生成する
        this.joystick = this._initializeJoystick();

        // resumeイベントのリスナーを登録
        this.events.on('resume', this.onSceneResume, this);
    }

    /**
     * ★ 修正点 2: ジョイスティックの生成ロジックをこのメソッドに統合
     * プライベートメソッド（_で開始）として定義し、再利用可能にする
     * @returns {rex.virtualjoystick} 生成されたジョイスティックのインスタンス
     */
    _initializeJoystick() {
        // 既に存在する場合は何もしないで既存のインスタンスを返す
        if (this.joystick) {
            return this.joystick;
        }

        const joystickPlugin = this.plugins.get('rexvirtualjoystickplugin');
        if (!joystickPlugin) {
            console.error('CRITICAL: Virtual Joystick Plugin not loaded.');
            return null;
        }

        console.log("[JumpScene] Initializing joystick...");
        
        const newJoystick = joystickPlugin.add(this, {
            x: 150,
            y: this.cameras.main.height - 150,
            radius: 100,
            base: this.add.circle(0, 0, 100, 0x888888, 0.5).setScrollFactor(0).setDepth(1000),
            thumb: this.add.circle(0, 0, 50, 0xcccccc, 0.8).setScrollFactor(0).setDepth(1000),
            enable: true,
            // キーボード入力はPlayerControllerが管理するので、プラグイン側では無効化
            dir: '8dir',
            up: null, down: null, left: null, right: null,
        });

        return newJoystick;
    }

    /**
     * ★ 修正点 3: onSceneResumeを修正
     * 存在しないcreateJoystick()の代わりに、新しい_initializeJoystick()を呼び出す
     */
    onSceneResume() {
        console.log("[JumpScene] Resumed. Re-initializing joystick.");
        
        if (this.joystick) {
            this.joystick.destroy();
            this.joystick = null;
        }
        
        // 統合された新しいメソッドを呼び出して再生成する
        this.joystick = this._initializeJoystick(); 
    }
    
    update(time, delta) {
        super.update(time, delta);

        if (this.player && !this.player.active) {
            this.player = null;
            this.playerController = null;
        }

        if (!this.player) {
            this.setupPlayerAndCamera();
        }
        
        if (this.playerController) {
            this.attachJumpButtonListener();
        }
    }

    /**
     * ★ 修正点 4: setupJoystickを簡略化
     * 統合されたメソッドを呼び出すだけにする
     */
    setupJoystick() {
        if (this.joystick) return;
        this.joystick = this._initializeJoystick();
    }
    
    /**
     * ★ 修正点 5: addJoystickFromEditorを簡略化
     * こちらも統合されたメソッドを呼び出すようにする
     */
    addJoystickFromEditor(isFromEditor = true) {
        if (this.joystick) {
            if (isFromEditor) alert('ジョイスティックは既にシーンに存在します。');
            return;
        }

        this.joystick = this._initializeJoystick();

        if (this.joystick && isFromEditor) {
            console.log("ジョイスティックがシーンに追加されました。");
        }
    }

    // --------------------------------------------------------------------
    // 以下、変更のないメソッド群 (変更の必要がないためそのままです)
    // --------------------------------------------------------------------

    dumpJoyStickState() { }

    addObjectFromEditor(assetKey, newName, layerName) {
        const isSpriteSheet = this.game.cache.json.get(assetKey + '_spritesheet') ? true : false;
        const type = isSpriteSheet ? 'Sprite' : 'Image';
        return super._addObjectFromEditorCore({ texture: assetKey, type: type }, newName, layerName);
    }

    setupPlayerAndCamera() {
        if (this.player && this.player.active) return;
        this.player = this.children.getByName('player');
        if (this.player) {
            this.playerController = this.player.components?.PlayerController;
            this.player.setFixedRotation();
            if (this.cameras.main && !this.cameras.main.isFollowing) {
                this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
            }
        }
    }

    attachJumpButtonListener() {
        const uiScene = this.scene.get('UIScene');
        const jumpButton = uiScene?.uiElements?.get('jump_button');
        if (!jumpButton) return;
        jumpButton.off('button_pressed');
        jumpButton.on('button_pressed', () => {
            if (this.playerController) {
                this.playerController.jump();
            }
        }, this);
    }

onSetupComplete() {
    console.log("[JumpScene] onSetupComplete called. This is the final step in setup.");

    // ★★★ 1. ロードデータがあれば、シーンの状態を復元する ★★★
    if (this.loadData) {
        console.log("Restoring scene state from save data...", this.loadData);
        
        const stateManager = this.registry.get('stateManager');
        if (stateManager && this.loadData.variables) {
            stateManager.setState(this.loadData); 
        }
        
        if (this.loadData.sceneSnapshot && this.loadData.sceneSnapshot.objects) {
            for (const objectState of this.loadData.sceneSnapshot.objects) {
                const targetObject = this.children.getByName(objectState.name);
                if (targetObject) {
                    targetObject.setPosition(objectState.x, objectState.y);
                    targetObject.setScale(objectState.scaleX, objectState.scaleY);
                    targetObject.setAngle(objectState.angle);
                    targetObject.setAlpha(objectState.alpha);
                    
                    if (targetObject.components && objectState.components) {
                        for (const compName in objectState.components) {
                            const component = targetObject.components[compName];
                            const compData = objectState.components[compName];
                            if (component && typeof component.deserialize === 'function') {
                                component.deserialize(compData);
                            }
                        }
                    }
                }
            }
        }
    }

    // ▼▼▼【以下の2行をコメントアウト、または削除してください】▼▼▼
    // this.setupPlayerAndCamera();
    // this.attachJumpButtonListener();
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
}

    shutdown() {
        console.log("[JumpScene] Shutdown sequence started.");
        if (this.joystick) {
            this.joystick.destroy();
            this.joystick = null;
            console.log("[JumpScene] Joystick instance destroyed.");
        }
        this.events.off('resume', this.onSceneResume, this);
        super.shutdown();
        console.log("[JumpScene] Shutdown sequence complete.");
    }
}

    