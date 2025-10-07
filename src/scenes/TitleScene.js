// src/scenes/TitleScene.js
import EngineAPI from '../core/EngineAPI.js';

export default class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
    }

    create() {
        // 背景を黒く塗りつぶす
        this.cameras.main.setBackgroundColor('#000000');
        
        // "START GAME" というテキストを表示
        const startText = this.add.text(
            this.cameras.main.centerX, 
            this.cameras.main.centerY, 
            'START GAME', 
            { fontSize: '48px', fill: '#FFFFFF' }
        ).setOrigin(0.5);

        // テキストをクリック可能にする
        startText.setInteractive({ useHandCursor: true });

        // テキストがクリックされたら、ゲームフローステートマシンにイベントを送る
        startText.on('pointerdown', () => {
            console.log('[TitleScene] Start text clicked. Firing START_GAME event.');
            EngineAPI.fireGameFlowEvent('START_GAME');
        });

        // ★ 準備完了をシステムに通知
        this.events.emit('scene-ready');
    }
}