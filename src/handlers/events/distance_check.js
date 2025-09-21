/**
 * [distance_check]タグ
 * 2つのオブジェクト間の距離を測り、ピンを分岐させる
 */
export const distance_check = async (interpreter, params) => {
    const scene = interpreter.scene;
    const source = interpreter.currentSource;
    const target = interpreter.currentTarget; // 衝突相手など

    // ターゲットオブジェクトを見つける
    const objA = interpreter.findTarget(params.target_a, scene, source, target);
    const objB = interpreter.findTarget(params.target_b, scene, source, target);
    const distance = parseFloat(params.distance);

    if (!objA || !objB || isNaN(distance)) {
        console.error("[distance_check] パラメータが不正です。", params);
        // 失敗した場合、どちらに進むべきか？ デフォルトの'output'に進むのが無難
        return 'output';
    }

    // Phaserの機能を使って距離を計算
    const currentDistance = Phaser.Math.Distance.Between(objA.x, objA.y, objB.x, objB.y);

    // 距離を比較して、次に進むべき出力ピンの名前を返す
    if (currentDistance <= distance) {
        return 'output_near'; // 近い
    } else {
        return 'output_far';  // 遠い
    }
};

/**
 * VSLエディタ用の定義
 */
distance_check.define = {
    description: "2つのオブジェクト間の距離を比較し、結果に応じて処理を分岐します。",
    params: [
        { key: "target_a", type: "string", label: "対象A", defaultValue: "source" },
        { key: "target_b", type: "string", label: "対象B", defaultValue: "player" },
        { key: "distance", type: "number", label: "比較距離", defaultValue: 100 }
    ],
    pins: {
        inputs: [{ name: "input", label: "" }],
        outputs: [
            { name: "output_near", label: "近い" },
            { name: "output_far", label: "遠い" }
        ]
    }
};
