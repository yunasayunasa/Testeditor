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

startListening() {
    if (!this.systemEvents || !this.eventsToListen) return;

    this.eventsToListen.split(',').forEach(eventName => {
        const trimmedEvent = eventName.trim();
        if (trimmedEvent) {
            // ▼▼▼【ここからが重要な修正です】▼▼▼
            
            // 1. まず、このコンポーネントが過去に登録した可能性のあるリスナーをすべて削除する
            this.systemEvents.off(trimmedEvent, null, this);
            
            // 2. 新しいリスナーを登録する
            const listenerCallback = (data) => {
        if (!this.gameObject || !this.gameObject.scene) return;
        
        console.log(`%c[GlobalListener] '${this.gameObject.name}' が '${trimmedEvent}' を受信しました！`, 'color: #3f51b5; font-weight: bold;');

        // ▼▼▼【ここから下を、このように書き換えてください】▼▼▼
        
        // 1. このイベントをトリガーとするVSLデータを gameObject から探す
        const allEvents = this.gameObject.getData('events') || [];
        const eventData = allEvents.find(e => e.trigger === trimmedEvent);

        if (eventData) {
            // 2. ActionInterpreter を取得
            const actionInterpreter = this.scene.registry.get('actionInterpreter');
            if (actionInterpreter) {
                console.log(`%c[GlobalListener] ActionInterpreter を直接呼び出して、トリガー '${trimmedEvent}' のVSLを実行します。`, 'color: #4caf50; font-weight: bold;');
                
                // 3. ActionInterpreter を直接実行！
                actionInterpreter.run(this.gameObject, eventData, data);
            }
        } else {
            console.warn(`[GlobalListener] '${this.gameObject.name}' に、トリガー '${trimmedEvent}' のイベント定義が見つかりませんでした。`);
        }
        
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    };
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