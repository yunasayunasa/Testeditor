export default class EvidenceDetailViewerComponent {
    constructor(scene, gameObject, params) {
        this.scene = scene;
        this.stateManager = this.scene.registry.get('stateManager');
        
        // --- 詳細表示エリアの「器」となるオブジェクトを探す ---
        this.detailIcon = this.scene.children.getByName('evidence_detail_icon');
        this.descriptionText = this.scene.children.getByName('evidence_description');
        
        // --- マスターデータをキャッシュから取得 ---
        this.evidenceMaster = this.scene.cache.json.get('evidence_master');

        if (this.stateManager) {
            // --- f.ui_selected_evidence の変更を監視する ---
            this.listener = (key, value) => {
                if (key === 'ui_selected_evidence') {
                    this.updateDetails(value);
                }
            };
            this.stateManager.on('f-variable-changed', this.listener);

            // --- 初期表示 ---
            // delayedCallで、他のUIの準備が整うのを待つ
            this.scene.time.delayedCall(0, () => {
                const initialId = this.stateManager.getValue('f.ui_selected_evidence');
                this.updateDetails(initialId);
            });
        }
    }

    static define = { params: [] }; // このコンポーネントに設定項目はない

    /**
     * 選択された証拠品IDに基づいて、詳細表示を更新する
     */
    updateDetails(evidenceId) {
        if (!evidenceId || !this.evidenceMaster) {
            // 何も選択されていない場合は、表示をクリアする
            if (this.detailIcon) this.detailIcon.setVisible(false);
            if (this.descriptionText) this.descriptionText.setText('');
            return;
        }

        const evidenceData = this.evidenceMaster[evidenceId];
        if (evidenceData) {
            if (this.detailIcon) {
                this.detailIcon.setTexture(evidenceData.icon || '__DEFAULT');
                this.detailIcon.setVisible(true);
            }
            if (this.descriptionText) {
                const formattedDesc = (evidenceData.description || '').replace(/\\n/g, '\n');
    this.descriptionText.setText(formattedDesc);
            }
        }
    }

    destroy() {
        if (this.stateManager && this.listener) {
            this.stateManager.off('f-variable-changed', this.listener);
        }
    }
}