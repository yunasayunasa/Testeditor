// src/scenes/OverlayScene.js (最終完成形)

import BaseGameScene from './BaseGameScene.js';
import EngineAPI from '../core/EngineAPI.js'; 

/**
 * メニューや証拠品リストなど、ゲームの上に重なるUIを専門に扱う、
 * データ駆動型で、かつIDEでの編集が可能な汎用オーバーレイシーンです。
 * BaseGameSceneを継承することで、IDE連携機能の全てを利用できます。
 */
export default class OverlayScene extends BaseGameScene {
    
    constructor() {
        // BaseGameSceneのコンストラクタを、自身のキーで呼び出す
        super({ key: 'OverlayScene' }); 
        
        // このシーンが読み込むべきレイアウトJSONのキーを保持するプロパティ
        // BaseGameSceneの layoutDataKey をそのまま利用します
    }

    /**
     * OverlayManagerから launch される際に、どのレイアウトを開くかデータを受け取る
     */
    init(data) {
        // BaseGameSceneが持つオリジナルのinitメソッドを呼び出すのが作法
        super.init(data); 

        // layoutKeyが渡された場合、それをこのシーンが読み込むべきデータキーとして設定
        if (data && data.layoutKey) {
            this.layoutDataKey = data.layoutKey;
        }
    }

    /**
     * シーンが起動する際のメインロジック
     */
    create() {
        // 他のシーンの最前面に表示されるようにする
        this.scene.bringToTop();

        // layoutDataKeyが設定されていない場合は、エラーを防ぐために処理を中断
        if (!this.layoutDataKey) {
            console.error('[OverlayScene] createが呼ばれましたが、layoutDataKeyが設定されていません。Aborting.');
            return;
        }

        // BaseGameSceneが持つ、JSONからシーンを構築する魔法のメソッドを呼び出す
        this.initSceneWithData();

        // --- EditorPluginとの連携 ---
        // IDEモードでこのシーンが起動・リスタートされた際に、
        // ゲーム全体の編集モードが 'select' であることを保証する
        const editor = this.plugins.get('EditorPlugin');
        if (editor && editor.isEnabled) {
            this.registry.set('editor_mode', 'select');
            editor.setAllObjectsDraggable(true);
        }
    }

    /**
     * このオーバーレイシーンを閉じるよう依頼する（主に[close_menu]タグから使われる）
     */
    close() {
       EngineAPI.fireGameFlowEvent('CLOSE_PAUSE_MENU');
    }

    //
    // ▼▼▼ 以下に、このシーン独自のメソッドを追加していくことができます ▼▼▼
    // (今回は不要です)
    //
    
    // buildUiFromLayout, registerUiElement, addComponent, update, applyUiEvents といった
    // メソッドは、すべて継承元の BaseGameScene が持っているため、
    // このファイルに記述する必要は一切ありません。
}