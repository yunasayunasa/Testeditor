// src/scenes/PreloadScene.js (PHP不要・file_lists方式の最終確定版)

import ConfigManager from '../core/ConfigManager.js';
import StateManager from '../core/StateManager.js';

export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene', active: true });
        
        this.progressBar = null;
        this.progressBox = null;
        this.percentText = null;
        this.loadingText = null;
    }

    preload() {
        console.log("PreloadScene: 起動。全アセットのロードを開始します。");
        
        // --- 1. ロード画面UIの表示 ---
        this.setupLoadingUI();
        
        // --- 2. 最初に asset_define.json のみロード ---
        this.load.json('asset_define', 'assets/asset_define.json');
        //this.load.script('ui_definitions', 'src/ui/index.js');
        this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
    }

    create() {
        console.log("PreloadScene: create開始。アセット定義を解析します。");
        
        // --- 3. コアマネージャーの初期化 ---
        this.registry.set('configManager', new ConfigManager());
        this.registry.set('stateManager', new StateManager());

        const assetDefine = this.cache.json.get('asset_define');
        
        // --- 4. asset_define.json に基づいてロードキューを構築 ---
        this.buildLoadQueue(assetDefine);

        // --- 5. 全てのロードが完了した後の処理を定義 ---
        this.load.once('complete', () => this.onLoadComplete(assetDefine));
        
        // --- 6. ロードを開始 ---
        this.load.start();
    }

    /**
     * ロード画面のUIをセットアップする
     */
    setupLoadingUI() {
        this.progressBox = this.add.graphics();
        this.progressBox.fillStyle(0x222222, 0.8).fillRect(340, 320, 600, 50);
        this.progressBar = this.add.graphics();
        this.percentText = this.add.text(640, 345, '0%', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
        this.loadingText = this.add.text(640, 280, 'Now Loading...', { fontSize: '36px', fill: '#ffffff' }).setOrigin(0.5);
        
        this.load.on('progress', (value) => {
            if (this.percentText) this.percentText.setText(parseInt(value * 100) + '%');
            if (this.progressBar) this.progressBar.clear().fillStyle(0xffffff, 1).fillRect(350, 330, 580 * value, 30);
        });
    }

    /**
     * asset_define.json の定義を解析し、すべてのアセットをロードキューに追加する
     */
    buildLoadQueue(assetDefine) {
        // 個別ファイル (images, sounds, etc.)
        if (assetDefine.images) {
            for (const key in assetDefine.images) { this.load.image(key, assetDefine.images[key]); }
        }
        if (assetDefine.sounds) {
            for (const key in assetDefine.sounds) { this.load.audio(key, assetDefine.sounds[key]); }
        }
        if (assetDefine.videos) {
            for (const key in assetDefine.videos) { this.load.video(key, assetDefine.videos[key]); }
        }
        if (assetDefine.spritesheets) {
            for (const key in assetDefine.spritesheets) {
                const sheet = assetDefine.spritesheets[key];
                this.load.spritesheet(key, sheet.path, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
            }
        }

        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ ここが新しい file_lists を処理するロジックです ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        if (assetDefine.file_lists) {
            for (const groupKey in assetDefine.file_lists) {
                const group = assetDefine.file_lists[groupKey];
                if (group.path && group.type && Array.isArray(group.list)) {
                    for (const filename of group.list) {
                        const key = filename.split('.')[0]; // 'scene1.ks' -> 'scene1'
                        const path = group.path + filename;
                        this.load[group.type](key, path);
                        console.log(`[PreloadScene] Queued: ${group.type} - key='${key}', path='${path}'`);
                    }
                }
            }
        }
    }
    
    /**
     * 全てのアセットのロードが完了したときに呼び出される
     */
    onLoadComplete(assetDefine) {
        console.log("PreloadScene: 全アセットロード完了。");
        
        this.createGlobalAssetList();
        const charaDefs = this.createCharaDefs(assetDefine);

        this.scene.launch('SystemScene', { 
            // initialGameData は渡すが、中身はシンプルにする
        /*    initialGameData: {
                charaDefs: {}, // 空のオブジェクト
                startScenario: 'test'
            }
        });*/
           
            initialGameData: {
                charaDefs: charaDefs,
                startScenario: 'test' // .ksは不要
            }
        });
        
        this.scene.stop(this.scene.key);
    }

    /**
     * エディタ用のグローバルアセットリストを生成してRegistryに登録する (最終確定版)
     */
    createGlobalAssetList() {
        const assetList = [];
        const assetDefine = this.cache.json.get('asset_define');
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ これが、全てを解決する、最も確実なロジックです ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // --- 1. 'images' セクションから情報を取得 ---
        if (assetDefine.images) {
            for (const key in assetDefine.images) {
                assetList.push({ 
                    key: key, 
                    type: 'image', 
                    path: assetDefine.images[key] 
                });
            }
        }
        
        // --- 2. 'spritesheets' セクションから情報を取得 ---
        if (assetDefine.spritesheets) {
            for (const key in assetDefine.spritesheets) {
                assetList.push({ 
                    key: key, 
                    type: 'spritesheet', 
                    path: assetDefine.spritesheets[key].path 
                });
            }
        }

        // --- 3. 他のタイプのアセットも、必要であればここに追加 ---
        // (例: 音声ファイルなども、将来的にアセットブラウザで扱いたくなった場合)
        
        this.registry.set('asset_list', assetList);
        console.log(`[PreloadScene] ${assetList.length}個のアセット情報をレジストリに登録しました。`);
    }
    /**
     * キャラクター定義オブジェクトを生成する
     */
    createCharaDefs(assetDefine) {
        const charaDefs = {};
        if (assetDefine.images) {
            for (const key in assetDefine.images) {
                const parts = key.split('_');
                if (parts.length >= 2) {
                    const charaName = parts[0];
                    const faceName = parts.slice(1).join('_');
                    if (!charaDefs[charaName]) charaDefs[charaName] = { jname: charaName, face: {} };
                    charaDefs[charaName].face[faceName] = key;
                }
            }
        }
        return charaDefs;
    }

    /**
     * シーンが停止する際にUI要素をクリーンアップする
     */
    stop() {
        super.stop();
        console.log("PreloadScene: stop されました。ロード画面UIを破棄します。");
        if (this.progressBar) { this.progressBar.destroy(); this.progressBar = null; }
        if (this.progressBox) { this.progressBox.destroy(); this.progressBox = null; }
        if (this.percentText) { this.percentText.destroy(); this.percentText = null; }
        if (this.loadingText) { this.loadingText.destroy(); this.loadingText = null; }
    }
}