import BaseNovelScene from './BaseNovelScene.js';
import handleOverlayEnd from '../handlers/scenario/overlay_end.js'; // パスを修正

export default class NovelOverlayScene extends BaseNovelScene {
    constructor() {
        super({ key: 'NovelOverlayScene' });
        this.returnTo = null;
        this.inputWasBlocked = false;
    }

    init(data) {
        this.scene.bringToTop(); // ★ 自身を最前面に持ってくる
        this.charaDefs = data.charaDefs;
        this.startScenario = data.scenario;
        this.returnTo = data.returnTo;
        this.inputWasBlocked = data.inputWasBlocked;
    }

    preload() {
        if (this.startScenario) {
            this.load.text(this.startScenario, `assets/data/scenario/${this.startScenario}`);
        }
    }

    create() {
        // 親のcreateメソッドを呼び出して、共通のセットアップを実行
        super.create();
    }
    
    // BaseNovelSceneのフックメソッドをオーバーライドして、専用タグを登録
    registerCustomTags() {
        this.scenarioManager.registerTag('overlay_end', handleOverlayEnd);
    }

    shutdown() {
        // 親のshutdownを呼び出す
        super.shutdown();
        
        // ★ SystemSceneに入力制御の解除を依頼
        this.scene.get('SystemScene').events.emit('end-overlay', {
            from: this.scene.key,
            returnTo: this.returnTo,
            inputWasBlocked: this.inputWasBlocked
        });
    }
}