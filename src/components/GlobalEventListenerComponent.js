import EngineAPI from '../core/EngineAPI.js';

export default class GlobalEventListenerComponent {
    constructor(scene, gameObject, params) {
        this.scene = scene;
        this.gameObject = gameObject;
         this.eventsToListen = params.events || ''; // 配列ではなく、必ず空文字列''をデフォルトにする
        this.systemEvents = null;

        if (EngineAPI.isReady()) {
            this.systemEvents = EngineAPI.systemScene.events;
            this.startListening();
        } else {
            // EngineAPIが準備できていない場合、少し待つ
            this.scene.time.delayedCall(0, () => {
                if (EngineAPI.isReady()) {
                    this.systemEvents = EngineAPI.systemScene.events;
                    this.startListening();
                }
            });
        }
    }

    static define = {
        params: [
            { 
                key: 'events',
                type: 'text',
                label: 'Listen to Events (カンマ区切り)',
                defaultValue: ''
            }
        ]
    };
    
   // in GlobalEventListenerComponent.js

// in GlobalEventListenerComponent.js
startListening() {
    if (!this.systemEvents || !this.eventsToListen) return;

    this.eventsToListen.split(',').forEach(eventName => {
        const trimmedEvent = eventName.trim();
        if (trimmedEvent) {
            // 1. まず、このコンポーネントが過去に登録した可能性のあるリスナーをすべて削除する
            this.systemEvents.off(trimmedEvent, null, this);
            
            // 2. 新しいコールバック関数を定義する
            const listenerCallback = (data) => {
    // ▼▼▼【ここから下を、完全に置き換えてください】▼▼▼
    
    console.groupCollapsed(`%c[LOG BOMB] GlobalListener Event Received: '${trimmedEvent}'`, 'background: #222; color: #ffeb3b;');
    
    if (!this.gameObject || !this.gameObject.scene) {
        console.error("BOMB INFO: this.gameObject または this.gameObject.scene が存在しません！");
        console.log("this.gameObject:", this.gameObject);
        console.groupEnd();
        return;
    }
    
    console.log("BOMB INFO: Event received by:", this.gameObject.name);
    console.log("BOMB INFO: gameObject.scene:", this.gameObject.scene.scene.key);

    const allEvents = this.gameObject.getData('events') || [];
    const eventData = allEvents.find(e => e.trigger === trimmedEvent);

    if (!eventData) {
        console.warn(`BOMB INFO: トリガー '${trimmedEvent}' に対応するVSLイベント定義が見つかりませんでした。`);
        console.groupEnd();
        return;
    }

    console.log("BOMB INFO: Found VSL eventData:", eventData);
    
    const systemRegistry = this.scene.scene.manager.getScene('SystemScene')?.registry;
    if (!systemRegistry) {
        console.error("BOMB INFO: SystemScene registry が見つかりません！");
        console.groupEnd();
        return;
    }
    
    const actionInterpreter = systemRegistry.get('actionInterpreter');
    if (!actionInterpreter) {
        console.error("BOMB INFO: ActionInterpreter が見つかりません！");
        console.groupEnd();
        return;
    }

    console.log("BOMB INFO: ActionInterpreterが見つかりました。これから run() を呼び出します。");
    console.log("BOMB INFO: run()に渡す引数 (source):", this.gameObject);
    console.log("BOMB INFO: run()に渡す引数 (eventData):", eventData);
    console.log("BOMB INFO: run()に渡す引数 (collidedTarget):", data);
    
    console.groupEnd();

    // 実行
    actionInterpreter.run(this.gameObject, eventData, data);
    
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
};
            // ▼▼▼【これが欠けていた一行です】▼▼▼
            this.systemEvents.on(trimmedEvent, listenerCallback, this);
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

            console.log(`%c[GlobalListener] '${this.gameObject.name}' がグローバルイベント '${trimmedEvent}' のリスニングを（再）開始しました。`, 'color: #3f51b5;');
        }
    });
}

    destroy() {
        if (!this.systemEvents || !this.eventsToListen) return; // ← 空文字列なら何もしないガード節を追加

        this.eventsToListen.split(',').forEach(eventName => {
            const trimmedEvent = eventName.trim();
            if (trimmedEvent) {
                this.systemEvents.off(trimmedEvent, null, this);
            }
        });
    }
}