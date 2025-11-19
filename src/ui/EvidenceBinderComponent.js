export default class EvidenceBinderComponent {
    constructor(scene, gameObject, params) {
        this.scene = scene;
        this.stateManager = this.scene.registry.get('stateManager');
        this.evidenceMaster = this.scene.cache.json.get('evidence_master');

        // start()が呼ばれるのを待つ
    }

    static define = { params: [] }; // このコンポーネントに設定項目はない

    /**
     * BaseGameSceneのライフサイクルによって、コンポーネントの準備ができた後に呼ばれる
     */
    start() {
        if (!this.stateManager || !this.evidenceMaster) return;

        const playerEvidence = this.stateManager.getValue('f.player_evidence') || [];

        // --- 1. まず、全ての「器」を隠す ---
        for (let i = 1; i <= 8; i++) { // 8はIDEで配置した最大数
            const icon = this.scene.children.getByName(`evidence_icon_${i}`);
            const name = this.scene.children.getByName(`evidence_name_${i}`);
            if (icon) icon.setVisible(false);
            if (name) name.setVisible(false);
        }

       
// --- 2. 所持している証拠品の分だけ、「器」にデータを設定 ---
playerEvidence.forEach((evidenceId, index) => {
    const slotIndex = index + 1;
    if (slotIndex > 8) return;

    const evidenceData = this.evidenceMaster[evidenceId];
    console.log(`[Binder] Slot ${slotIndex}: ID='${evidenceId}', DataFound=${!!evidenceData}`);

    if (evidenceData) {
        const iconName = `evidence_icon_${slotIndex}`;
        const icon = this.scene.children.getByName(iconName);
        
        console.log(`[Binder] Search for '${iconName}': Found=${!!icon}`);

        if (icon) {
            const textureKey = evidenceData.icon;
            console.log(`[Binder] Setting texture to: '${textureKey}'`);
            
            // ★ここでセットしている！
            icon.setTexture(textureKey || '__DEFAULT');
            icon.setVisible(true);
        }
                if (name) {
                    name.setText(evidenceData.name);
                    name.setInteractive({ useHandCursor: true }); // クリック可能にする
                    name.setVisible(true);
                    
                    // --- 3. クリックイベントを動的に設定 ---
                    name.off('pointerdown'); // 既存のリスナーをクリア
                    name.on('pointerdown', () => {
                        // f.ui_selected_evidence に、このアイテムのIDをセットする
                        this.stateManager.setF('ui_selected_evidence', evidenceId);
                    });
                }
            }
        });
        
        // --- 4. 最初のアイテムを選択状態にしておく ---
        if (playerEvidence.length > 0) {
             this.stateManager.setF('ui_selected_evidence', playerEvidence[0]);
        } else {
             this.stateManager.setF('ui_selected_evidence', null);
        }
    }

    destroy() {
        // start()で動的に追加したリスナーは、オブジェクトが破棄されれば自動で消えるので
        // ここで明示的にoffする必要は必ずしもない
    }
}