import BaseGameScene from './BaseGameScene.js';

export default class JumpScene extends BaseGameScene {
    constructor() {
        super({ key: 'JumpScene' });
        this.player = null;
        this.cursors = null;
    }

    create() {
        console.log("[JumpScene] Create started.");
        this.cameras.main.setBackgroundColor('#4488cc');
        this.cursors = this.input.keyboard.createCursorKeys();
        
        //const soundManager = this.registry.get('soundManager');
        //if (soundManager) soundManager.playBgm('bgm_action');
        
        // 親の標準初期化ルーチンを呼び出す
        this.initSceneWithData();
    }

    /**
     * 【JumpScene専用】
     * エディタからオブジェクト追加の依頼を受けた時の処理
     */
    // src/scenes/JumpScene.js

    addObjectFromEditor(assetKey) {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        // 1. オブジェクトを「生成」するだけ
        const newImage = this.createObjectFromLayout({
            texture: assetKey
        });
        
        // 2. 「初期化＆登録」を親に任せる
        this.applyProperties(newImage, {
            name: `${assetKey}_${Date.now()}`,
            x: centerX, y: centerY, scaleX: 1, scaleY: 1, angle: 0, alpha: 1, visible: true
        });
        
        return newImage;
    }

    // onSetupCompleteから呼び出される、このシーンだけのロジック
    onSetupComplete() {
        this.player = this.children.list.find(c => c.name === 'player');
        const floors = this.children.list.filter(obj => obj.name.startsWith('ground'));
        if (this.player && floors.length > 0) {
            this.physics.add.collider(this.player, floors);
        }
    }
    
    update() {
        if (!this.player || !this.player.body) return;
        if (this.cursors.left.isDown) this.player.body.setVelocityX(-200);
        else if (this.cursors.right.isDown) this.player.body.setVelocityX(200);
        else this.player.body.setVelocityX(0);
        if (this.cursors.up.isDown && this.player.body.touching.down) this.player.body.setVelocityY(-350);
        if (this.player.y > this.cameras.main.height + 100) {
            this.scene.get('SystemScene').events.emit('return-to-novel', { from: this.scene.key });
        }
    }
}