export default class SoundManager {
    constructor(game) {
        this.game = game;
        this.sound = game.sound;
        this.configManager = this.game.registry.get('configManager');
        if (!this.configManager) {
            console.error("SoundManager: ConfigManagerが見つかりません！");
        }
        
        this.currentBgm = null;
        this.currentBgmKey = null;

        this.configManager.on('change:bgmVolume', this.onBgmVolumeChange, this);
        this.game.events.once(Phaser.Core.Events.DESTROY, this.destroy, this);
    }

    // AudioContextを安全に再開
    resumeContext() {
        if (this.sound.context.state === 'suspended') {
            this.sound.context.resume().then(() => console.log("SoundManager: AudioContextが再開されました。"));
        }
    }
    
    // コンフィグ画面からの音量変更を即時反映
    onBgmVolumeChange(newVolume) {
        if (this.currentBgm && this.currentBgm.isPlaying) {
            this.currentBgm.setVolume(newVolume);
        }
    }

    /**
     * BGMを再生する (フェード対応・Promise版)
     * @param {string} key - 再生するBGMのアセットキー
     * @param {number} [fadeinTime=0] - フェードイン時間(ms)
     * @returns {Promise<void>} フェードイン完了時に解決されるPromise
     */
    playBgm(key, fadeinTime = 0) {
        return new Promise(resolve => {
            this.resumeContext();

            // 同じ曲が既に再生中の場合は、何もしないで即座に完了
            if (this.currentBgm && this.currentBgmKey === key && this.currentBgm.isPlaying) {
                resolve();
                return;
            }

            // 既存のBGMがあれば、まずフェードアウトさせて止める
            this.stopBgm(fadeinTime); // 新しい曲のフェードイン時間と同じ時間でクロスフェード

            // 新しいBGMを再生
            const targetVolume = this.configManager.getValue('bgmVolume');
            const newBgm = this.sound.add(key, { loop: true, volume: 0 }); // 最初は音量0
            newBgm.play();

            this.currentBgm = newBgm;
            this.currentBgmKey = key;

            // フェードインTween
            this.game.scene.getScene('SystemScene').tweens.add({
                targets: newBgm,
                volume: targetVolume,
                duration: fadeinTime,
                ease: 'Linear',
                onComplete: () => {
                    resolve(); // フェードイン完了でPromiseを解決
                }
            });
        });
    }

    /**
     * BGMを停止する (フェード対応版)
     * @param {number} [fadeoutTime=0] - フェードアウト時間(ms)
     */
    stopBgm(fadeoutTime = 0) {
        if (this.currentBgm) {
            const bgmToStop = this.currentBgm; // クロージャで参照を保持
            
            if (fadeoutTime > 0) {
                // フェードアウト
                this.game.scene.getScene('SystemScene').tweens.add({
                    targets: bgmToStop,
                    volume: 0,
                    duration: fadeoutTime,
                    ease: 'Linear',
                    onComplete: () => {
                        bgmToStop.stop();
                        bgmToStop.destroy();
                    }
                });
            } else {
                // 即時停止
                bgmToStop.stop();
                bgmToStop.destroy();
            }

            this.currentBgm = null;
            this.currentBgmKey = null;
        }
    }

   // in src/core/SoundManager.js

    /**
     * 効果音を再生する (個別音量指定対応・Promise対応版)
     * @param {string} key - 再生するSEのアセットキー
     * @param {object} [config] - 追加の設定 (volume, loopなど)
     * @returns {Promise<Phaser.Sound.BaseSound>} 再生完了時に解決されるPromise
     */
    playSe(key, config = {}) {
        return new Promise(resolve => {
            this.resumeContext();
            
            // 1. グローバルSE音量を基本音量とする
            const baseVolume = this.configManager.getValue('seVolume');

            // 2. configで個別のvolumeが指定されていれば、それをグローバル音量に乗算する
            //    例: グローバル=0.8, 個別=0.5 -> 最終音量=0.4
            const finalVolume = (config.volume !== undefined)
                ? baseVolume * config.volume
                : baseVolume;

            // 3. 最終的な設定オブジェクトを作成
            const finalConfig = { ...config, volume: finalVolume };

            const se = this.sound.add(key, finalConfig);
            
            se.once('complete', (sound) => {
                resolve(sound);
                sound.destroy(); // 再生完了後にサウンドオブジェクトを破棄してメモリを解放
            });
            
            se.play();
        });
    }
    getCurrentBgmKey() {
        // isPlayingのチェックは、シーン遷移直後などに不安定になることがあるため、
        // プロパティの存在だけで判断する方が安定する
        return this.currentBgmKey;
    }
    
    // ゲーム終了時に呼ばれるクリーンアップ処理
    destroy() {
        if (this.configManager) {
            this.configManager.off('change:bgmVolume', this.onBgmVolumeChange, this);
        }
        this.stopBgm(); // 引数なし
        console.log("SoundManager: 破棄されました。");
    }
}
