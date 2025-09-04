const Container = Phaser.GameObjects.Container;

export default class MessageWindow extends Container {
    /**
     * @param {Phaser.Scene} scene 
     * @param {object} config - レイアウトJSONから渡される設定オブジェクト (x, y, width, heightなど)
     */
    constructor(scene, config) {
        // コンテナ自身の位置はUISceneが設定するので、ここでは(0,0)で初期化
        super(scene, 0, 0);

        this.scene = scene;

        // --- 依存サービスの取得 ---
        // データ駆動のルールに従い、コンストラクタ引数ではなくレジストリから取得
        this.soundManager = scene.registry.get('soundManager');
        this.configManager = scene.registry.get('configManager');

        // --- 状態管理プロパティ ---
        this.charByCharTimer = null;
        this.isTyping = false;
        this.typingResolve = null; // Promiseの解決関数を保持
        this.currentText = '';     // セーブ/ロード用
        this.currentSpeaker = null;  // セーブ/ロード用
        this.fullText = '';        // スキップ処理用

        // --- ウィンドウ背景 ---
        // コンテナの原点(0,0)に配置
        this.windowImage = scene.add.image(0, 0, 'message_window');

        // --- テキストオブジェクト ---
        const padding = 35;
        const textWidth = this.windowImage.width - (padding * 2);
        const textHeight = this.windowImage.height - (padding * 2);

        this.textObject = scene.add.text(
            this.windowImage.x - (this.windowImage.width / 2) + padding,
            this.windowImage.y - (this.windowImage.height / 2) + padding,
            '',
            {
                fontFamily: '"Noto Sans JP", sans-serif',
                fontSize: '36px',
                fill: '#ffffff',
                wordWrap: { width: textWidth, useAdvancedWrap: true },
                fixedWidth: textWidth,
                fixedHeight: textHeight
            }
        );

        // --- クリック待ちアイコン ---
        const iconX = (this.windowImage.width / 2) - 60;
        const iconY = (this.windowImage.height / 2) - 50;
        this.nextArrow = scene.add.image(iconX, iconY, 'next_arrow');
        this.nextArrow.setScale(0.5).setVisible(false);
        this.arrowTween = scene.tweens.add({
            targets: this.nextArrow,
            y: this.nextArrow.y - 10,
            duration: 400,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
            paused: true
        });

        // --- コンフィグと連携 ---
        this.textDelay = 50;
        this.updateTextSpeed();
        this.configManager.on('change:textSpeed', this.updateTextSpeed, this);

        // --- 全ての要素をコンテナに追加 ---
        this.add([this.windowImage, this.textObject, this.nextArrow]);
        // ★★★ UISceneのadd.existing(this)が呼ばれるので、ここでは不要 ★★★
        // scene.add.existing(this);
    }
    
    updateTextSpeed() {
        const textSpeedValue = this.configManager.getValue('textSpeed');
        this.textDelay = 100 - textSpeedValue;
    }

    setTypingSpeed(newSpeed) {
        this.textDelay = newSpeed;
    }

    setText(text, useTyping = true, speaker = null) {
        this.typingResolve = null;

        return new Promise(resolve => {
            this.typingResolve = resolve;
            this.currentText = text;
            this.currentSpeaker = speaker;
            this.fullText = text;

            if (this.charByCharTimer) {
                this.charByCharTimer.remove();
                this.charByCharTimer = null;
            }
            this.textObject.setText('');
            this.hideNextArrow();

            const typeSoundMode = this.configManager.getValue('typeSound');

            if (!useTyping || text.length === 0 || this.textDelay <= 0) {
                this.textObject.setText(text);
                this.isTyping = false;
                if (this.typingResolve) this.typingResolve();
                return;
            }
            
            this.isTyping = true;
            let index = 0;
            
            this.charByCharTimer = this.scene.time.addEvent({
                delay: this.textDelay,
                callback: () => {
                    if (typeSoundMode === 'se') {
                        this.soundManager.playSe('popopo');
                    }
                    this.textObject.text += this.fullText[index];
                    index++;
                    if (index === this.fullText.length) {
                        if(this.charByCharTimer) this.charByCharTimer.remove();
                        this.charByCharTimer = null;
                        this.isTyping = false;
                        if (this.typingResolve) this.typingResolve();
                    }
                },
                callbackScope: this,
                loop: true
            });
        });
    }

    skipTyping() {
        if (!this.isTyping || !this.charByCharTimer) return;

        this.charByCharTimer.remove();
        this.charByCharTimer = null;
        this.isTyping = false;
        
        this.textObject.setText(this.fullText);
        
        if (this.typingResolve) {
            this.typingResolve();
            this.typingResolve = null;
        }
    }

    reset() {
        this.textObject.setText('');
        this.currentText = '';
        this.currentSpeaker = null;
        this.isTyping = false;
        if (this.charByCharTimer) {
            this.charByCharTimer.remove();
            this.charByCharTimer = null;
        }
        this.hideNextArrow();
    }

    showNextArrow() {
        this.nextArrow.setVisible(true);
        if (this.arrowTween && this.arrowTween.isPaused()) {
            this.arrowTween.resume();
        }
    }
    
    hideNextArrow() {
        this.nextArrow.setVisible(false);
        if (this.arrowTween && this.arrowTween.isPlaying()) {
            this.arrowTween.pause();
        }
    }
}