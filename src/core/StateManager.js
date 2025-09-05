
export default class StateManager extends Phaser.Events.EventEmitter {
    constructor() {
        super(); // ★★★ 追加: 親クラスのコンストラクタを呼び出す ★★★
        this.f = {};
        this.sf = this.loadSystemVariables(); 
        if (!this.sf.history) this.sf.history = [];
          // 1. 現在のページの完全なURLを取得する
        const currentURL = window.location.href;

        // 2. URLの中に '?debug=true' または '&debug=true' という文字列が含まれているか、
        //    単純な文字列検索でチェックする
        if (currentURL.includes('?debug=true') || currentURL.includes('&debug=true')) {
            this.sf.debug_mode = true;
        } else {
            this.sf.debug_mode = false;
        }
        
        // ★★★ これで、解釈の余地は一切ありません ★★★

        if (this.sf.debug_mode) {
            console.warn("[StateManager] Debug mode is ON (activated by URL parameter).");
        } else {
            console.log("[StateManager] Debug mode is OFF.");
        }
    }
    
      // --- f (ゲーム変数) の管理 ---

    /**
     * f変数を設定し、変更イベントを発行する
     * @param {string} key - f変数のキー
     * @param {*} value - 設定する値
     */
    setF(key, value) {
        const oldValue = this.f[key];
        if (oldValue !== value) {
            this.f[key] = value;
            this.emit('f-variable-changed', key, value, oldValue);
        }
    }

    // --- sf (システム変数) の管理 ---

    /**
     * sf変数を設定し、変更イベントを発行し、自動保存する
     * @param {string} key - sf変数のキー
     * @param {*} value - 設定する値
     */
      // --- sf (システム変数) の管理 ---
    setSF(key, value) {
        const oldValue = this.sf[key];
        // JSON.stringifyで比較し、オブジェクトや配列の変更も検知
        if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
            this.sf[key] = value;
            this.emit('sf-variable-changed', key, value, oldValue);
            this.saveSystemData(); // 変更があったら即座に保存
        }
    }

    /**
     * システムデータをlocalStorageに保存する
     */
    saveSystemData() {
        try {
            localStorage.setItem('my_novel_engine_system', JSON.stringify(this.sf));
            console.log("%c[StateManager] System data saved to localStorage.", "color: lightgreen; font-weight: bold;", this.sf);
        } catch (e) {
            console.error("システム変数の保存に失敗しました。", e);
        }
    }

    /**
     * システムデータをlocalStorageから読み込む
     * @returns {object} 読み込んだデータ、または空のオブジェクト
     */
      loadSystemData() {
        try {
            const data = localStorage.getItem('my_novel_engine_system');
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error("システム変数の読み込みに失敗しました。", e);
            return {};
        }
    }



    /**
     * ゲームの現在の状態をすべて収集して返す
     * @param {ScenarioManager} scenarioManager - 現在のシナリオの状態を取得するための参照
     * @returns {Object} 現在のゲーム状態のスナップショット
     */
    getState(scenarioManager) {
        const scene = scenarioManager.scene;
        
        const characterStates = {};
        for (const name in scene.characters) {
            const chara = scene.characters[name];
            if (chara && chara.visible && chara.alpha > 0) {
                characterStates[name] = {
                    storage: chara.texture.key,
                    x: chara.x, y: chara.y,
                    scaleX: chara.scaleX, scaleY: chara.scaleY,
                    alpha: chara.alpha, flipX: chara.flipX,
                    tint: chara.tintTopLeft,
                };
            }
        }
        
        const backgroundState = scenarioManager.layers.background.list.length > 0
            ? scenarioManager.layers.background.list[0].texture.key
            : null;

        const scenarioState = {
            fileName: scenarioManager.currentFile,
            line: scenarioManager.currentLine,
            ifStack: scenarioManager.ifStack,
            callStack: scenarioManager.callStack,
            isWaitingClick: scenarioManager.isWaitingClick,
            isWaitingChoice: scenarioManager.isWaitingChoice,
            pendingChoices: scene.pendingChoices,
            currentText: scenarioManager.messageWindow.currentText,
            speakerName: scenarioManager.messageWindow.currentSpeaker,
        };
          // ★★★ 1. デバッグしたい値をまず変数に格納する ★★★
        const currentBgmKey = scenarioManager.soundManager.getCurrentBgmKey();

        // ★★★ 2. 変数を使ってコンソールに出力する ★★★
        console.log(`[StateManager.getState] Saving BGM key: '${currentBgmKey}'`);

        return {
            saveDate: new Date().toLocaleString('ja-JP'),
            variables: { f: this.f }, 
            scenario: scenarioState,
            layers: {
                background: backgroundState,
                characters: characterStates,
            },
            sound: {
                // ★★★ 3. 変数をオブジェクトのプロパティとして設定する ★★★
                bgm: currentBgmKey
            }
        };
    
        
        return {
            saveDate: new Date().toLocaleString('ja-JP'),
            variables: { f: this.f }, 
            scenario: scenarioState,
            layers: {
                background: backgroundState,
                characters: characterStates,
            },
            sound: {
                bgm: scenarioManager.soundManager.getCurrentBgmKey(),
                
            }
        };
    }

     /**
     * ロードした状態から変数を復元する
     * @param {Object} loadedState - localStorageから読み込んだ状態オブジェクト
     */
    /**
     * ロードした状態から変数を復元する (改訂版)
     * @param {Object} loadedState - localStorageから読み込んだ状態オブジェクト
     */
    setState(loadedState) {
        // f変数を復元 (存在しない場合は空オブジェクト)
        this.f = loadedState.variables.f || {};
        
        // sf変数はシステムデータなので、ここでは復元しないのが一般的
        // 必要であれば、`this.sf = { ...this.sf, ...loadedState.variables.sf };` のようにマージする

        console.log("[StateManager] Game variables restored from save data.", this.f);
        
        // ロード完了後、すべてのf変数について「変更通知」を発行する
        // これにより、HUDなどが自分自身の表示を更新する
        for (const key in this.f) {
            this.emit('f-variable-changed', key, this.f[key]);
        }
    }
    /**
     * "f.love_meter"のような文字列パスを使って、安全に変数を設定する (Lodash版)
     * @param {string} path - "f.love_meter" や "sf.party.member1.hp" のような変数パス
     * @param {*} value - 設定する値
     */
    setValueByPath(path, value) {
        try {
            // Lodashの`_.get`を使って、変更前の値を取得する
            const oldValue = _.get(this, path);

            if (oldValue !== value) {
                // ★★★ これが全てを解決する、唯一の修正です ★★★
                // Lodashの`_.set`が、安全なネストオブジェクトの生成と代入を全て行ってくれる
                _.set(this, path, value);

                // f変数の場合のみ、変更イベントを発行
                if (path.startsWith('f.')) {
                    // pathから 'f.' を取り除いたキーをイベントで渡す
                    const key = path.substring(2);
                    this.emit('f-variable-changed', key, value, oldValue);
                }
                if (path.startsWith('sf.')) {
                    this.saveSystemVariables();
                }
            }
        } catch (e) {
            console.error(`[StateManager.setValueByPath] 値の設定に失敗しました: path=${path}`, e);
        }
    }
    /**
     * 文字列の式を評価し、結果を返す (評価専用)
     * [if]タグなどで使われることを想定
     * @param {string} exp - "f.love_meter > 5" のような評価式
     * @returns {*} 評価結果 (true/falseなど)
     */
    eval(exp) {
        try {
            const f = this.f;
            const sf = this.sf;
            // new Functionは、純粋な値の取得または比較にのみ使用する
            return new Function('f', 'sf', `'use strict'; return (${exp});`)(f, sf);
        } catch (e) {
            console.warn(`[StateManager.eval] 式の評価中にエラーが発生しました: "${exp}"`, e);
            return undefined;
        }
    }


    // システム変数のセーブ/ロード、履歴の追加 (変更なし)
    saveSystemVariables() {
        try {
            localStorage.setItem('my_novel_engine_system', JSON.stringify(this.sf));
        } catch (e) { console.error("システム変数の保存に失敗しました。", e); }
    }
    loadSystemVariables() {
        try {
            const data = localStorage.getItem('my_novel_engine_system');
            return data ? JSON.parse(data) : {};
        } catch (e) { console.error("システム変数の読み込みに失敗しました。", e); return {}; }
    }
    addHistory(speaker, dialogue) {
        this.sf.history.push({ speaker, dialogue });
        if (this.sf.history.length > 100) this.sf.history.shift();
        this.saveSystemVariables();
    }
      // ★★★ 追加: f/sf変数の値を安全に取得するメソッド ★★★
    getValue(exp) {
        try {
            const f = this.f;
            const sf = this.sf;
            // new Functionを使って、より安全に値を取得
            return new Function('f', 'sf', `return ${exp}`)(f, sf);
        } catch (e) {
            // 式が不正な場合や、存在しないプロパティにアクセスしようとした場合はundefinedを返す
            console.warn(`[StateManager.getValue] 式の評価に失敗しました: "${exp}"`, e);
            return undefined;
        }
    }

}