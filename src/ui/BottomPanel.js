const Container = Phaser.GameObjects.Container;
const Rectangle = Phaser.GameObjects.Rectangle;
const Text = Phaser.GameObjects.Text;

export default class BottomPanel extends Container {
    // 依存関係はなし
    static dependencies = [];

    /**
     * @param {Phaser.Scene} scene - この場合はUISceneのインスタンス
     * @param {object} config - UISceneから渡される設定オブジェクト
     */
    constructor(scene, config) {
        super(scene, 0, 0);

        const gameWidth = scene.scale.width;

        // パネル背景
        const panelBg = new Rectangle(scene, gameWidth / 2, 0, gameWidth, 120, 0x000000, 0.8)
            .setInteractive();
        panelBg.on('pointerdown', event => event.stopPropagation());

        // 各ボタンを生成
        const buttonStyle = { fontSize: '32px', fill: '#fff' };
        const saveButton = new Text(scene, 0, 0, 'セーブ', buttonStyle).setOrigin(0.5).setInteractive();
        const loadButton = new Text(scene, 0, 0, 'ロード', buttonStyle).setOrigin(0.5).setInteractive();
        const backlogButton = new Text(scene, 0, 0, '履歴', buttonStyle).setOrigin(0.5).setInteractive();
        const configButton = new Text(scene, 0, 0, '設定', buttonStyle).setOrigin(0.5).setInteractive();
        const autoButton = new Text(scene, 0, 0, 'オート', buttonStyle).setOrigin(0.5).setInteractive();
        const skipButton = new Text(scene, 0, 0, 'スキップ', buttonStyle).setOrigin(0.5).setInteractive();
        
        this.add([panelBg, saveButton, loadButton, backlogButton, configButton, autoButton, skipButton]);

        // ボタンのレイアウト
        const buttons = [saveButton, loadButton, backlogButton, configButton, autoButton, skipButton];
        const areaStartX = 250;
        const areaWidth = gameWidth - areaStartX - 100;
        const buttonMargin = areaWidth / buttons.length;
        buttons.forEach((button, index) => {
            button.setX(areaStartX + (buttonMargin * index) + (buttonMargin / 2));
        });

        // イベントリスナーを設定 (UISceneのメソッドを呼び出す)
        saveButton.on('pointerdown', event => { scene.openScene('SaveLoadScene', { mode: 'save' }); event.stopPropagation(); });
        loadButton.on('pointerdown', event => { scene.openScene('SaveLoadScene', { mode: 'load' }); event.stopPropagation(); });
        backlogButton.on('pointerdown', event => { scene.openScene('BacklogScene'); event.stopPropagation(); });
        configButton.on('pointerdown', event => { scene.openScene('ConfigScene'); event.stopPropagation(); });
        autoButton.on('pointerdown', event => { scene.toggleGameMode('auto'); event.stopPropagation(); });
        skipButton.on('pointerdown', event => { scene.toggleGameMode('skip'); event.stopPropagation(); });
    }

    // 規約に準拠するためのお作法
    updateValue(state) {}
}