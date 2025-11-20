import EngineAPI from '../core/EngineAPI.js'; 
import { ComponentRegistry } from '../components/index.js';

export default class OverlayScene extends Phaser.Scene {
    
    constructor() {
        super({ key: 'OverlayScene' }); 
        this.layoutDataKey = null;
        this.uiElements = new Map(); // 編集用に保持
    }

    init(data) {
        this.layoutDataKey = data.layoutKey || null;
    }

    create() {
        this.scene.bringToTop();
        
        // --- IDE連携: 編集モードを強制 ---
        const editor = this.plugins.get('EditorPlugin');
        if (editor && editor.isEnabled) {
            this.registry.set('editor_mode', 'select');
        }

        if (!this.layoutDataKey) {
            console.warn('[OverlayScene] No layout key provided.');
            return;
        }

        const layoutData = this.cache.json.get(this.layoutDataKey);
        
        // --- 動的リスト生成ロジック ---
        // (evidence_listの場合のみ、ボタン定義を動的に追加)
        let finalLayoutData = layoutData;
        if (layoutData && this.layoutDataKey === 'evidence_list') {
            // コピーを作成
            finalLayoutData = JSON.parse(JSON.stringify(layoutData));
            
            const evidenceMaster = this.cache.json.get('evidence_master');
            const systemRegistry = this.scene.manager.getScene('SystemScene')?.registry;
            const stateManager = systemRegistry ? systemRegistry.get('stateManager') : null;
            const playerEvidence = stateManager ? stateManager.getValue('f.player_evidence') : [];
            
            const dynamicObjects = [];
            if (playerEvidence && evidenceMaster) {
                playerEvidence.forEach((evidenceId, index) => {
                    const evidenceData = evidenceMaster[evidenceId];
                    if (evidenceData) {
                        dynamicObjects.push({
    "name": `evidence_${evidenceId}`,
    "type": "Button",
    "x": 640,
    "y": 200 + (index * 80),
    "label": evidenceData.name,
    "data": { "registryKey": "generic_button" },
    "events": [
        {
            "trigger": "onClick",
            "id": `event_${evidenceId}`,
            "nodes": [
                // ★★★ 修正: [eval] の代わりに [set_variable] を使う ★★★
                { 
                    "id": `set_${evidenceId}`, 
                    "type": "set_variable", 
                    "params": { 
                        "var": "f.selected_evidence", 
                        "value": `"${evidenceId}"` // 値をダブルクォートで囲む
                    } 
                },
                { "id": `close_${evidenceId}`, "type": "close_menu", "params": {} }
            ],
            "connections": [
             //   { "fromNode": "start", "fromPin": "output", "toNode": `set_${evidenceId}`, "toPin": "input" },
                { "fromNode": `set_${evidenceId}`, "fromPin": "output", "toNode": `close_${evidenceId}`, "toPin": "input" }
            ]
        }
    ]
});
                        // ラベルテキスト
                        dynamicObjects.push({
                            "name": `label_${evidenceId}`,
                            "type": "Text",
                            "x": 640,
                            "y": 200 + (index * 80),
                            "text": evidenceData.name,
                            "style": { "fontSize": "24px", "fill": "#ffffff" },
                            "originX": 0.5, "originY": 0.5
                        });
                    }
                });
            }
            finalLayoutData.objects = (finalLayoutData.objects || []).concat(dynamicObjects);
        }

        // --- UI構築 ---
        if (finalLayoutData && finalLayoutData.objects) {
            this.buildUiFromLayout(finalLayoutData);
        }
    }

    /**
     * JSONデータからUIを一括生成する
     */
    buildUiFromLayout(layoutData) {
        layoutData.objects.forEach((layout) => {
            try {
                let element = null;

                if (layout.type === 'Text') {
                    const style = layout.style || { fontSize: '24px', fill: '#ffffff' };
                    element = this.add.text(layout.x, layout.y, layout.text || 'Text', style);
                    if (layout.originX !== undefined) element.setOrigin(layout.originX, layout.originY);
                } else {
                    // Image, Button, Panel などはすべてImageとして生成
                    const texture = layout.texture || '__DEFAULT';
                    element = this.add.image(layout.x, layout.y, texture);
                }

                if (element) {
                    // 共通設定メソッドを呼び出す（ここが重要！）
                    this.registerUiElement(layout.name, element, layout);
                }

            } catch (e) {
                console.error(`[OverlayScene] Error creating ${layout.name}:`, e);
            }
        });
    }

    /**
     * ★★★ 重要：全てのオブジェクト設定をここで行う ★★★
     * 名前設定、プロパティ適用、インタラクティブ化、IDE登録、イベント設定
     */
    registerUiElement(name, element, layout) {
        element.name = name;
        this.uiElements.set(name, element); // 管理用に保持

        // プロパティ適用
        if (layout.alpha !== undefined) element.setAlpha(layout.alpha);
        if (layout.depth !== undefined) element.setDepth(layout.depth);
        if (layout.scaleX !== undefined) element.setScale(layout.scaleX, layout.scaleY);
        if (layout.angle !== undefined) element.setAngle(layout.angle);

        // コンポーネントアタッチ
        if (layout.components) {
            element.setData('components', layout.components);
            layout.components.forEach(compDef => {
                this.addComponent(element, compDef.type, compDef.params);
            });
        }

        // --- インタラクティブ化 (IDE編集とクリック動作に必須) ---
        element.setInteractive();
        this.input.setDraggable(element); // ★これがないとドラッグできません

        // --- イベント設定 ---
        if (layout.events) {
            element.setData('events', layout.events);
            this.applyUiEvents(element);
        }

        // --- IDE登録 ---
        const editor = this.plugins.get('EditorPlugin');
        if (editor && editor.isEnabled) {
            editor.makeEditable(element, this);
        }
    }

    /**
     * IDEから画像を追加するための窓口
     */
    addObjectFromEditor(assetKey, newName, layerName) {
        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;
        const image = this.add.image(cx, cy, assetKey);
        
        // 共通設定メソッドを通す
        this.registerUiElement(newName, image, { 
            name: newName, type: 'Image', x: cx, y: cy, texture: assetKey 
        });
        return image;
    }

    /**
     * IDEからテキストを追加するための窓口
     */
    addTextUiFromEditor(newName) {
        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;
        const text = this.add.text(cx, cy, 'New Text', { fontSize: '32px', fill: '#fff' });
        text.setOrigin(0.5);

        // 共通設定メソッドを通す
        this.registerUiElement(newName, text, { 
            name: newName, type: 'Text', x: cx, y: cy 
        });
        return text;
    }

    /**
     * イベントリスナーの設定（pointerdownを使用）
     */
    applyUiEvents(uiElement) {
        const events = uiElement.getData('events') || [];
        uiElement.off('pointerdown'); // 重複防止

        events.forEach(eventData => {
            if (eventData.trigger === 'onClick') {
                uiElement.on('pointerdown', (pointer) => {
                    // プレイモードの時のみ実行したい場合はここで判定を入れる
                    // const mode = this.registry.get('editor_mode');
                    // if (mode !== 'play') return; 

                    pointer.event.stopPropagation();
                    const sysReg = this.scene.manager.getScene('SystemScene')?.registry;
                    const interpreter = sysReg?.get('actionInterpreter');
                    if (interpreter) {
                        interpreter.run(uiElement, eventData);
                    }
                });
            }
        });
    }

    /**
     * コンポーネントアタッチ用ヘルパー
     */
    addComponent(target, type, params) {
        const ComponentClass = ComponentRegistry[type];
        if (ComponentClass) {
            const instance = new ComponentClass(this, target, params);
            
            // コンポーネントをオブジェクトに保持
            if (!target.components) target.components = {};
            target.components[type] = instance;

            // ★★★ 修正: start() の実行を、全てのUI構築が終わるまで(0秒)遅らせる ★★★
            if (typeof instance.start === 'function') {
                this.time.delayedCall(0, () => {
                    instance.start();
                });
            }
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

            if (instance.update) {
                if (!this.updateList) this.updateList = [];
                this.updateList.push(instance);
            }
        }
    }
    update(time, delta) {
        if (this.updateList) {
            this.updateList.forEach(c => c.update(time, delta));
        }
    }

    close() {
       EngineAPI.fireGameFlowEvent('CLOSE_PAUSE_MENU');
    }
}