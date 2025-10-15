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
    
    startListening() {
         if (!this.systemEvents || !this.eventsToListen) return; // ← 空文字列なら何もしないガード節を追加
      

        this.eventsToListen.split(',').forEach(eventName => {
            const trimmedEvent = eventName.trim();
            if (trimmedEvent) {
                this.systemEvents.on(trimmedEvent, (data) => {
                    this.gameObject.emit(trimmedEvent, data);
                }, this);
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