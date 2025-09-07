
import BaseGameScene from './BaseGameScene.js';
import ActionInterpreter from '../core/ActionInterpreter.js';
import PlayerController from '../components/PlayerController.js';

export default class JumpScene extends BaseGameScene {

    constructor() {
        super({ key: 'JumpScene' });
        // ★ プロパティをシンプルに
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

        // ★ データからシーンを構築する命令を一度だけ出す
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
     * シーン上の全GameObjectを走査し、アタッチされたコンポー-ネントを更新する
     * ★★★ これが、このシーンに残るべき唯一のupdateロジックです ★★★
     */
    update(time, delta) {
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