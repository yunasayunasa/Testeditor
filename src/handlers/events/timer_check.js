
/**
 * [timer_check]タグ
 * 一定時間が経過したかをチェックし、ピンを分岐させる
 */
export default timer_check = async (interpreter, params) => {
    const source = interpreter.currentSource;
    const duration = parseFloat(params.duration);
    const timerId = `vsl_timer_${params.id || 'default'}`;
    const now = interpreter.scene.time.now;

    if (isNaN(duration)) {
        console.error("[timer_check] durationが不正です。");
        return 'output_finished'; // エラー時は完了として扱う
    }

    // sourceオブジェクトにタイマー情報が保存されているか確認
    let startTime = source.getData(timerId);

    // まだタイマーが開始されていなかったら、この瞬間に開始する
    if (!startTime) {
        startTime = now;
        source.setData(timerId, startTime);
    }

    // 経過時間を計算
    const elapsedTime = now - startTime;

    if (elapsedTime >= duration) {
        // 時間が経過していたら、タイマーをリセットして完了ピンに進む
        source.setData(timerId, null);
        return 'output_finished';
    } else {
        // まだ時間が残っていたら、実行中ピンに進む
        return 'output_running';
    }
};

/**
 * VSLエディタ用の定義
 */
timer_check.define = {
    description: "指定した時間が経過したかどうかをチェックします。初回実行時にタイマーを開始します。",
    params: [
        { key: "duration", type: "number", label: "時間(ms)", defaultValue: 1000 },
        { key: "id", type: "string", label: "タイマーID", defaultValue: "default" }
    ],
    pins: {
        inputs: [{ name: "input", label: "" }],
        outputs: [
            { name: "output_running", label: "実行中" },
            { name: "output_finished", label: "完了" }
        ]
    }
};