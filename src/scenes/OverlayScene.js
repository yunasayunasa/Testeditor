import EngineAPI from '../core/EngineAPI.js'; 
// ★コンポーネントの登録簿を直接インポートして確実に使えるようにする
import { ComponentRegistry } from '../components/index.js';

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
     * UI構築メソッド
     */
    buildUiFromLayout(layoutData) {
        console.group('[OverlayScene] buildUiFromLayout');
        
        layoutData.objects.forEach((layout, index) => {
            try {
                console.log(`Processing object ${index}: '${layout.name}' (Type: ${layout.type})`);
                
                let element = null;

                // --- Textの生成 ---
                if (layout.type === 'Text') {
                    const safeStyle = { ...layout.style };
                    for (const key in safeStyle) {
                        if (safeStyle[key] === null) delete safeStyle[key];
                    }
                    if (!safeStyle.fontSize) safeStyle.fontSize = '24px';
                    if (!safeStyle.fill) safeStyle.fill = '#ffffff';

                    element = this.add.text(layout.x, layout.y, layout.text || 'Text', safeStyle);
                    if (layout.originX !== undefined) element.setOrigin(layout.originX, layout.originY);
                } 
                // --- Image / Panel / Button の生成 ---
                else {
                    const textureKey = this.textures.exists(layout.texture) ? layout.texture : '__DEFAULT';
                    element = this.add.image(layout.x, layout.y, textureKey);
                }

                if (element) {
                    element.name = layout.name;
                    if (layout.alpha !== undefined) element.setAlpha(layout.alpha);
                    if (layout.depth !== undefined) element.setDepth(layout.depth);
                    if (layout.scaleX !== undefined) element.setScale(layout.scaleX, layout.scaleY);
                    
                    element.setInteractive();
                    
                    // イベント設定
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
                    
                    // ▼▼▼【ここが復活させた重要機能です：コンポーネントのアタッチ】▼▼▼
                    if (layout.components) {
                        element.setData('components', layout.components);
                        layout.components.forEach(compDef => {
                            this.addComponent(element, compDef.type, compDef.params);
                        });
                    }
                    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

                    console.log(` -> SUCCESS: Created '${element.name}'`);
                }

            } catch (e) {
                console.error(` -> ERROR creating '${layout.name}':`, e);
            }
        });
        
        console.groupEnd();
    }

    /**
     * コンポーネントを追加して起動するヘルパー
     */
    addComponent(target, componentType, params = {}) {
        const ComponentClass = ComponentRegistry[componentType];
        if (ComponentClass) {
            console.log(`   -> Attaching component: ${componentType}`);
            const componentInstance = new ComponentClass(this, target, params);
            
            // コンポーネントをオブジェクトに保持させる
            if (!target.components) target.components = {};
            target.components[componentType] = componentInstance;

            // 即座に start() を呼び出して初期化処理を実行させる
            if (typeof componentInstance.start === 'function') {
                // 少し遅延させて、全てのUI構築が終わってから実行するのが安全
                this.time.delayedCall(0, () => {
                    componentInstance.start();
                });
            }
        } else {
            console.warn(`   -> Unknown component type: ${componentType}`);
        }
    }

    close() {
       EngineAPI.fireGameFlowEvent('CLOSE_PAUSE_MENU');
    }
}