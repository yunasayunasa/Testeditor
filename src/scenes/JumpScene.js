// src/scenes/JumpScene.js (新規作成)

import BaseGameScene from './BaseGameScene.js';

export default class JumpScene extends BaseGameScene {
    constructor() {
        super({ key: 'JumpScene' });
        this.player = null;
    }

    create() {
        console.log("[JumpScene] Create started.");
        
        // ★★★ 親の初期化メソッドを呼び出すだけ ★★★
        this.initSceneFromData();
    }

    // finalizeSetupから呼び出される、このシーン固有の最終処理
    onSetupComplete() {
        this.player = this.children.list.find(c => c.name === 'player');
        // ... (衝突判定などのゲームロジック)
    }
    
    update() {
        // ... (プレイヤー操作などのゲームロジック)
    }
}