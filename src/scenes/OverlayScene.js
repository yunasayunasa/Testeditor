// src/scenes/OverlayScene.js (デバッグ強化・要塞化版)
import EngineAPI from '../core/EngineAPI.js'; 

export default class OverlayScene extends Phaser.Scene {
    
    constructor() {
        super({ key: 'OverlayScene' }); 
        this.layoutDataKey = null;
    }

    init(data) {
        this.layoutDataKey = data.layoutKey || null;
    }

    create() {
        this.scene.bringToTop();
        console.log(`[OverlayScene] create started. LayoutKey: ${this.layoutDataKey}`);

        const layoutData = this.cache.json.get(this.layoutDataKey);
        
        if (layoutData && layoutData.objects) {
            this.buildUiFromLayout(layoutData);
        } else {
            console.error(`[OverlayScene] Layout data missing or empty for '${this.layoutDataKey}'`);
        }

        // EditorPlugin連携
        const editor = this.plugins.get('EditorPlugin');
        if (editor && editor.isEnabled) {
            this.time.delayedCall(100, () => {
                this.registry.set('editor_mode', 'select');
                this.children.each(child => editor.makeEditable(child, this));
            });
        }
    }

    /**
     * UI構築メソッド（エラーガード付き）
     */
    buildUiFromLayout(layoutData) {
        console.group('[OverlayScene] buildUiFromLayout');
        
        layoutData.objects.forEach((layout, index) => {
            try {
                console.log(`Processing object ${index}: '${layout.name}' (Type: ${layout.type})`);
                
                let element = null;

                // --- Textの生成 ---
                if (layout.type === 'Text') {
                    // ★スタイルからnullのプロパティを除去する安全策
                    const safeStyle = { ...layout.style };
                    for (const key in safeStyle) {
                        if (safeStyle[key] === null) delete safeStyle[key];
                    }
                    // フォールバック
                    if (!safeStyle.fontSize) safeStyle.fontSize = '24px';
                    if (!safeStyle.fill) safeStyle.fill = '#ffffff';

                    element = this.add.text(layout.x, layout.y, layout.text || 'Text', safeStyle);
                    
                    if (layout.originX !== undefined) element.setOrigin(layout.originX, layout.originY);
                } 
                // --- Image / Panel / Button の生成 ---
                else {
                    // テクスチャがなければデフォルトを使用
                    const textureKey = this.textures.exists(layout.texture) ? layout.texture : '__DEFAULT';
                    element = this.add.image(layout.x, layout.y, textureKey);
                }

                if (element) {
                    element.name = layout.name;
                    if (layout.alpha !== undefined) element.setAlpha(layout.alpha);
                    if (layout.depth !== undefined) element.setDepth(layout.depth);
                    if (layout.scaleX !== undefined) element.setScale(layout.scaleX, layout.scaleY);
                    
                    // インタラクティブ設定
                    element.setInteractive();
                    
                    // イベント設定 (簡易版: 汎用性は一旦置いて、確実に動くようにする)
                    if (layout.events) {
                        element.setData('events', layout.events);
                        const onClickEvent = layout.events.find(e => e.trigger === 'onClick');
                        if (onClickEvent) {
                            element.on('pointerdown', (pointer) => {
                                pointer.event.stopPropagation();
                                const systemRegistry = this.scene.manager.getScene('SystemScene')?.registry;
                                const actionInterpreter = systemRegistry?.get('actionInterpreter');
                                if (actionInterpreter) {
                                    actionInterpreter.run(element, onClickEvent);
                                }
                            });
                        }
                    }
                    
                    console.log(` -> SUCCESS: Created '${element.name}'`);
                }

            } catch (e) {
                // ★エラーが出ても止まらずに次のオブジェクトへ！
                console.error(` -> ERROR creating '${layout.name}':`, e);
            }
        });
        
        console.groupEnd();
    }

    close() {
       EngineAPI.fireGameFlowEvent('CLOSE_PAUSE_MENU');
    }
}