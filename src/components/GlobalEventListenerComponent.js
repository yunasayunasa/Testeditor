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
                // gameObjectが破棄されていないか、念のためチェック
                if (!this.gameObject || !this.gameObject.scene) return;
                
                console.log(`%c[GlobalListener] '${this.gameObject.name}' が '${trimmedEvent}' を受信しました！これから gameObject.emit を実行します。`, 'color: #3f51b5; font-weight: bold;');
                this.gameObject.emit(trimmedEvent, data);
            };

            this.systemEvents.on(trimmedEvent, listenerCallback, this);

            console.log(`%c[GlobalListener] '${this.gameObject.name}' がグローバルイベント '${trimmedEvent}' のリスニングを（再）開始しました。`, 'color: #3f51b5;');
            // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
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