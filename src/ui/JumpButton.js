const Container = Phaser.GameObjects.Container;
const Graphics = Phaser.GameObjects.Graphics;
const Text = Phaser.GameObjects.Text;
export default class JumpButton extends Container {
    static dependencies = [];

    constructor(scene, config) {
        super(scene, 0, 0);
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        this.pointerId = null; // ★ このボタンを押している指のIDを記憶
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        const radius = 65;
        // ... (グラフィック作成は変更なし) ...
        this.add([background, this.background_pressed, label]);
        
        this.setSize(radius * 2, radius * 2);
        this.setInteractive(new Phaser.Geom.Circle(radius, radius, radius), Circle.Contains);
        this.setScrollFactor(0);
        
        // --- イベントリスナーを修正 ---
        this.on('pointerdown', (pointer) => {
            // 誰も押していなければ、この指が所有者になる
            if (this.pointerId === null) {
                this.pointerId = pointer.id;
                this.background_pressed.setVisible(true);
                // ★ PlayerControllerへの通知はここで行う
                console.log("%c[JumpButton] Pointer Down Event FIRED!", "color: orange; font-weight: bold;");
            }
        });

        // ★ グローバルなupとoutで、所有権を解放する
        this.scene.input.on('pointerup', (pointer) => {
            if (pointer.id === this.pointerId) {
                this.pointerId = null;
                this.background_pressed.setVisible(false);
            }
        });

        // ★（念のため）シーンのシャットダウンでリスナーを解除
        this.scene.events.on('shutdown', () => {
             if (this.scene && this.scene.input) {
                this.scene.input.off('pointerup');
             }
        }, this);
    }
    
    // ★★★ 4. (推奨) 規約に準拠するため、空のupdateValueメソッドを追加 ★★★
    updateValue(state) {
        // このコンポーネントは状態変数に応じて表示を更新する必要はない
    }
}