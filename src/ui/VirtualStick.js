const Container = Phaser.GameObjects.Container;
const Graphics = Phaser.GameObjects.Graphics;
const Vector2 = Phaser.Math.Vector2;

export default class VirtualStick extends Container {

static dependencies = [];

constructor(scene, config) {
    // configで渡された固定位置、あるいはデフォルト位置(150, 550)に表示
    super(scene, config.x || 150, config.y || 550);

    // --- プロパティ定義 ---
    this.baseRadius = 100;
    this.stickRadius = 50;
    this.direction = new Vector2(0, 0); // 方向ベクトルを初期化

    // --- 見た目の作成 ---
    const base = new Graphics(scene)
        .fillStyle(0x888888, 0.5)
        .fillCircle(0, 0, this.baseRadius);

    this.stick = new Graphics(scene)
        .fillStyle(0xcccccc, 0.8)
        .fillCircle(0, 0, this.stickRadius);
    
    this.add([base, this.stick]);

    // --- 入力機能は一切持たない ---
    // setInteractive() や .on() は、ここでは呼び出さない

    // --- シーンに追加 ---
    this.setScrollFactor(0);
    scene.add.existing(this);
}

/**
 * [JumpSceneから命令] ポインターの現在地に基づいて、ノブの位置と方向を更新する
 * @param {Phaser.Input.Pointer} pointer - JumpSceneが管理している移動用のポインター
 */
updatePosition(pointer) {
    // ワールド座標から、このコンテナの中心を(0,0)とするローカル座標に変換
    const localX = pointer.x - this.x;
    const localY = pointer.y - this.y;
    const vec = new Vector2(localX, localY);
    const distance = vec.length();
    const maxDistance = this.baseRadius;

    // ノブが土台からはみ出ないように制限
    if (distance > maxDistance) {
        vec.normalize().scale(maxDistance);
    }

    // ノブのグラフィックを移動
    this.stick.setPosition(vec.x, vec.y);
    
    // 方向ベクトルを-1から1の範囲で更新
    if (maxDistance > 0) {
        this.direction.x = Phaser.Math.Clamp(vec.x / maxDistance, -1, 1);
        this.direction.y = Phaser.Math.Clamp(vec.y / maxDistance, -1, 1);
    }
}

/**
 * [JumpSceneから命令] 操作が終了したので、ノブを中央に戻し、方向をリセットする
 */
reset() {
    this.stick.setPosition(0, 0);
    this.direction.setTo(0, 0);
}

// --- PlayerControllerが参照するためのゲッター ---
get isLeft() { return this.direction.x < -0.5; }
get isRight() { return this.direction.x > 0.5; }
get isUp() { return this.direction.y < -0.5; }
get isDown() { return this.direction.y > 0.5; }

}