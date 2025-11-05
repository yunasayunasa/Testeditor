/**
 * [check_evidence]
 * 「つきつける」専用タグ。
 * f.selected_evidence と現在の証言の correct_evidence を比較し、結果を分岐する。
 */
export default async function check_evidence(interpreter, params) {
    const stateManager = interpreter.scene.registry.get('stateManager');
    const scene = interpreter.scene;
    if (!stateManager || !scene) return 'output_false';

    // 1. プレイヤーが選択した証拠品を取得
    const selectedEvidence = stateManager.getValue('f.selected_evidence');

    // 2. 現在の証言データから、正解の証拠品を取得
    const testimonyId = stateManager.getValue('f.current_testimony_id');
    const statementIndex = stateManager.getValue('f.current_statement_index');
    const testimonyData = scene.cache.json.get(testimonyId);
    const statement = testimonyData?.statements?.[statementIndex];
    const correctEvidence = statement ? statement['correct_evidence'] : undefined;

    // 3. 比較して分岐
    if (selectedEvidence && selectedEvidence === correctEvidence) {
        return 'output_true'; // 正解
    } else {
        return 'output_false'; // 不正解
    }
}

check_evidence.define = {
    description: '「つきつける」専用。選択された証拠品が、現在の証言の矛盾を突くものか判定します。',
    // パラメータは一切なし！
    params: [],
    // 分岐することをIDEに教える
    pins: {
        outputs: [
            { name: 'output_true', label: '正解' },
            { name: 'output_false', label: '不正解' }
        ]
    }
};