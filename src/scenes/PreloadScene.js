// src/scenes/PreloadScene.js (真の最終確定・完成版)

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

    async preload() {
        console.log("PreloadScene: 起動。全アセットのロードを開始します。");
        
        // --- 1. ロード画面UIの表示 ---
        this.progressBox = this.add.graphics();
        this.progressBox.fillStyle(0x222222, 0.8).fillRect(340, 320, 600, 50);
        this.progressBar = this.add.graphics();
        this.percentText = this.add.text(640, 345, '0%', { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);
        this.loadingText = this.add.text(640, 280, 'Now Loading...', { fontSize: '36px', fill: '#ffffff' }).setOrigin(0.5);
        
        // ★★★ 変更点1: ロード全体の進捗を監視するリスナー ★★★
        this.load.on('progress', (value) => {
            if (this.percentText) this.percentText.setText(parseInt(value * 100) + '%');
            if (this.progressBar) this.progressBar.clear().fillStyle(0xffffff, 1).fillRect(350, 330, 580 * value, 30);
        });
        
        // --- 2. 最初に asset_define.json だけをロードし、完了を待つ ---
        this.load.json('asset_define', 'assets/asset_define.json');
        
        // ★★★ 変更点2: ここで一度、小規模なロードを開始・待機する ★★★
        await new Promise(resolve => {
            this.load.once('complete', resolve);
            this.load.start();
        });
        
        console.log("[PreloadScene] asset_define.json loaded.");
        const assetDefine = this.cache.json.get('asset_define');

        // --- 3. フォルダ内のファイルリストを非同期で取得 ---
        const scenarioFiles = await this.fetchFileList(assetDefine.scenarios ? assetDefine.scenarios.path : null);
        const sceneDataFiles = await this.fetchFileList(assetDefine.scene_data ? assetDefine.scene_data.path : null);

        // --- 4. 取得したリストと定義を元に、残りの全てのアセットをロードキューに追加 ---
        if (assetDefine.images) { for (const key in assetDefine.images) { this.load.image(key, assetDefine.images[key]); } }
        if (assetDefine.sounds) { for (const key in assetDefine.sounds) { this.load.audio(key, assetDefine.sounds[key]); } }
        
        if (scenarioFiles.length > 0) {
            for (const file of scenarioFiles) {
                if(!file.endsWith('.ks')) continue;
                const key = file.replace('.ks', '');
                this.load.text(key, `${assetDefine.scenarios.path}${file}`);
            }
        }
        if (sceneDataFiles.length > 0) {
            for (const file of sceneDataFiles) {
                if(!file.endsWith('.json')) continue;
                const key = file.replace('.json', '');
                this.load.json(key, `${assetDefine.scene_data.path}${file}`);
            }
        }

        // Webフォントなどの、リストに含まれない他のアセット
        this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
    }

    create() {
        console.log("PreloadScene: create開始。全アセットロード完了。");
        
        // --- 1. コアマネージャーの初期化 ---
        const configManager = new ConfigManager();
        this.sys.registry.set('configManager', configManager);
        const stateManager = new StateManager();
        this.sys.registry.set('stateManager', stateManager);

        // --- 2. 派生データの生成 ---
        const assetDefine = this.cache.json.get('asset_define');
        
        // キャラクター定義の生成
        const charaDefs = {};
        if (assetDefine.images) {
            for (const key in assetDefine.images) {
                const parts = key.split('_');
                if (parts.length >= 2) {
                    const [charaName, faceName] = parts;
                    if (!charaDefs[charaName]) charaDefs[charaName] = { jname: charaName, face: {} };
                    charaDefs[charaName].face[faceName] = key;
                }
            }
        }
        
        // グローバルなアセットリストの生成
        const assetList = [];
        if (assetDefine.images) {
            for (const key in assetDefine.images) {
                assetList.push({ key: key, type: 'image', path: assetDefine.images[key] });
            }
        }
        if (assetDefine.sounds) {
             for (const key in assetDefine.sounds) {
                assetList.push({ key: key, type: 'sound', path: assetDefine.sounds[key] });
            }
        }
        this.registry.set('asset_list', assetList);
        console.log(`[PreloadScene] ${assetList.length}個のアセット情報をレジストリに登録しました。`);
        
        // --- 3. SystemSceneの起動 ---
        this.scene.launch('SystemScene', { initialGameData: {
            charaDefs: charaDefs,
            startScenario: 'test' // .ksは不要
        }});
        
        // 自身の役目は終わったので停止する
        this.scene.stop(this.scene.key);
    }

    async fetchFileList(dirPath) {
        if (!dirPath) return [];
        try {
            const response = await fetch(`filelist.php?dir=${dirPath}`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error(`[PreloadScene] Failed to fetch file list for ${dirPath}`, error);
            return [];
        }
    }

    stop() {
        super.stop();
        console.log("PreloadScene: stop されました。ロード画面UIを破棄します。");
        if (this.progressBar) { this.progressBar.destroy(); this.progressBar = null; }
        if (this.progressBox) { this.progressBox.destroy(); this.progressBox = null; }
        if (this.percentText) { this.percentText.destroy(); this.percentText = null; }
        if (this.loadingText) { this.loadingText.destroy(); this.loadingText = null; }
    }
}