export default class EvidenceBinderComponent {
    constructor(scene, gameObject, params) {
        this.scene = scene;
        this.stateManager = this.scene.registry.get('stateManager');
        this.evidenceMaster = this.scene.cache.json.get('evidence_master');
    }

    static define = { params: [] };

    start() {
        if (!this.stateManager || !this.evidenceMaster) return;

        const playerEvidence = this.stateManager.getValue('f.player_evidence') || [];
        
        // ★デバッグ用: シーン内の全オブジェクト名をコンソールに出力
        console.groupCollapsed('[Binder] Debug: Existing Objects in Scene');
        this.scene.children.list.forEach(child => {
            console.log(`- Name: '${child.name}', Type: ${child.type}`);
            if (child.type === 'Container' && child.list) {
                child.list.forEach(grandChild => {
                     console.log(`  L Child Name: '${grandChild.name}', Type: ${grandChild.type}`);
                });
            }
        });
        console.groupEnd();
        // -------------------------------------------------------

        // --- 1. まず、全ての「器」を隠す ---
        for (let i = 1; i <= 8; i++) {
            const icon = this.findObjectByName(`evidence_icon_${i}`);
            const name = this.findObjectByName(`evidence_name_${i}`);
            if (icon) icon.setVisible(false);
            if (name) name.setVisible(false);
        }

        // --- 2. 所持している証拠品の分だけ、「器」にデータを設定 ---
        playerEvidence.forEach((evidenceId, index) => {
            const slotIndex = index + 1;
            if (slotIndex > 8) return;

            const evidenceData = this.evidenceMaster[evidenceId];
            if (evidenceData) {
                // ★ 再帰検索メソッドを使用
                const icon = this.findObjectByName(`evidence_icon_${slotIndex}`);
                const name = this.findObjectByName(`evidence_name_${slotIndex}`);
                
                console.log(`[Binder] Slot ${slotIndex}: ID=${evidenceId}, IconFound=${!!icon}, NameFound=${!!name}`);

                if (icon) {
                    icon.setTexture(evidenceData.icon || '__DEFAULT');
                    icon.setVisible(true);
                }
                if (name) {
                    name.setText(evidenceData.name);
                    name.setInteractive({ useHandCursor: true });
                    name.setVisible(true);
                    
                    name.off('pointerdown');
                    name.on('pointerdown', () => {
                        const myId = name.getData('evidenceId');
                        this.stateManager.setF('ui_selected_evidence', myId);
                    });
                    name.setData('evidenceId', evidenceId);
                }
            }
        });
        
        if (playerEvidence.length > 0) {
             this.stateManager.setF('ui_selected_evidence', playerEvidence[0]);
        } else {
             this.stateManager.setF('ui_selected_evidence', null);
        }
    }

    /**
     * ★ シーン内を深く探索してオブジェクトを見つけるヘルパーメソッド
     */
    findObjectByName(name) {
        // 1. シーン直下を探す
        let obj = this.scene.children.getByName(name);
        if (obj) return obj;

        // 2. コンテナの中を探す (1階層だけ深く)
        this.scene.children.list.forEach(child => {
            if (child.type === 'Container' && child.list) {
                const found = child.list.find(c => c.name === name);
                if (found) obj = found;
            }
        });
        return obj;
    }

    destroy() {}
}