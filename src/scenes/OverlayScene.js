// src/scenes/OverlayScene.js (最終完成形 Ver.2)
import BaseGameScene from './BaseGameScene.js';
import EngineAPI from '../core/EngineAPI.js'; 

export default class OverlayScene extends BaseGameScene {
    
    constructor() {
        // BaseGameSceneのコンストラクタを、自身のキーで呼び出す
        super({ key: 'OverlayScene' });
        
        // BaseGameSceneを継承したので、以下のプロパティは
        // 親クラスが管理してくれます。ここでは不要です。
        // this.uiElements = new Map();
        // this.componentsToUpdate = [];
    }

    /**
     * OverlayManagerから launch される際にデータを受け取る
     */
    // in OverlayScene.js
init(data) {
    // 1. まず、親である BaseGameScene の init を呼び出す
    //    isUiScene フラグを必ず渡す
    super.init({ ...data, isUiScene: true }); 

    // 2. 次に、この OverlayScene 自身が必要なデータを取得する
    //    BaseGameScene は layoutDataKey を参照するため、そちらにセットする
    if (data && data.layoutKey) {
        this.layoutDataKey = data.layoutKey;
    }
}

    /**
     * シーンが起動する際のメインロジック
     */
    create() {
        this.scene.bringToTop(this.scene.key);

        if (!this.layoutDataKey) {
            console.error('[OverlayScene] create called, but layoutDataKey is missing. Aborting.');
            return;
        }

        // BaseGameSceneが持つ、JSONからシーンを構築する魔法のメソッドを呼び出す
        this.initSceneWithData();
    }

    /**
     * このオーバーレイシーンを閉じるよう依頼する
     */
    close() {
       EngineAPI.fireGameFlowEvent('CLOSE_PAUSE_MENU');
    }

    //
    // buildUiFromLayout, registerUiElement, addComponent, update, applyUiEvents といった
    // メソッドは、すべて継承元の BaseGameScene が持っているため、
    // このファイルからは「完全に削除」します。
    //
}