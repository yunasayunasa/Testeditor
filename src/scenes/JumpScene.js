
import BaseGameScene from './BaseGameScene.js';
import ActionInterpreter from '../core/ActionInterpreter.js';
import PlayerController from '../components/PlayerController.js';

export default class JumpScene extends BaseGameScene {

    constructor() {
        super({ key: 'JumpScene' });
      this.joystick = null;
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

        // ★★★ ここからがMatter.jsへの対応です ★★★
        // 1. Matter.jsのAPIを使って、世界の境界を設定する
        this.matter.world.setBounds(0, 0, worldWidth, worldHeight);

        // 2. カメラの境界設定は、物理エンジンとは無関係なので、そのまま使える
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        // ★★★ ここまで ★★★

        // データからシーンを構築する命令は最後に呼ぶ
        this.initSceneWithData();
       // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ ここで、Rex Virtual Joystick を生成します ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        this.joystick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
            x: 150,
            y: 550,
            radius: 100,
            base: this.add.circle(0, 0, 100, 0x888888, 0.5),
            thumb: this.add.circle(0, 0, 50, 0xcccccc, 0.8),
            // dir: '8dir',   // 8方向
            // forceMin: 16,
            // enable: true
        }).on('update', this.dumpJoyStickState, this);

        this.dumpJoyStickState(); // 初期状態をダンプ
    }
     dumpJoyStickState() {
        // このメソッドは、PlayerControllerのupdateで直接参照するため、
        // デバッグ以外では空でも良い
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
        // ★ Matter.jsでは、衝突はカテゴリ(category)とマスク(collidesWith)で管理する
        // ★ もしくは、単純な衝突であれば何もしなくても良い
        // ★ Arcade Physicsの collider のような明示的な設定は不要
        const player = this.children.list.find(obj => obj.getData('group') === 'player');
        if (player) {
            this.cameras.main.startFollow(player, true, 0.1, 0.1);
            this.playerController = player.components?.PlayerController;
        };
        
       
    }

    /**
     * シーン上の全GameObjectを走査し、アタッチされたコンポー-ネントを更新する
     * ★★★ これが、このシーンに残るべき唯一のupdateロジックです ★★★
     */
update(time, delta) {
        // ★★★ PlayerControllerに、joystickオブジェクトを直接渡す ★★★
        if (this.playerController) {
            this.playerController.updateWithJoystick(this.joystick);
        }
        // this.children.list には、このシーンに追加された全てのGameObjectが入っている
        for (const gameObject of this.children.list) {
            // そのGameObjectがcomponentsプロパティを持っているかチェック
            if (gameObject.components) {
                // 持っているコンポーネントを全てループ処理
                for (const key in gameObject.components) {
                    const component = gameObject.components[key];
                    // コンポーネントにupdateメソッドがあれば実行する
                    if (component && typeof component.update === 'function') {
                        component.update(time, delta);
                    }
                }
            }
        }
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