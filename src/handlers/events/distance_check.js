// src/handlers/events/distance_check.js

/**
 * [distance_check]タグ ... (コメントはそのまま)
 */
export default async function distance_check(interpreter, params) {
    const scene = interpreter.scene;
    const source = interpreter.currentSource;
    const target = interpreter.currentTarget;

    const objA = interpreter.findTarget(params.target_a, scene, source, target);
    const objB = interpreter.findTarget(params.target_b, scene, source, target);
    const distance = parseFloat(params.distance);

    if (!objA || !objB || isNaN(distance)) {
        console.error("[distance_check] パラメータが不正です。", params);
        return;
    }

    const currentDistance = Phaser.Math.Distance.Between(objA.x, objA.y, objB.x, objB.y);

    if (currentDistance <= distance) {
        return 'output_near';
    } else {
        return 'output_far';
    }
};

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