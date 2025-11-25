/**
 * Undo/Redoシステムのための抽象基底クラス
 * 全てのコマンドはこのクラスを継承する
 */
export class EditorCommand {
    /**
     * @param {Object} editor - EditorPluginのインスタンス
     */
    constructor(editor) {
        this.editor = editor;
        this.timestamp = Date.now();
    }

    /**
     * コマンドを実行
     * サブクラスでオーバーライド必須
     */
    execute() {
        throw new Error('execute() must be implemented by subclass');
    }

    /**
     * コマンドを元に戻す
     * サブクラスでオーバーライド必須
     */
    undo() {
        throw new Error('undo() must be implemented by subclass');
    }

    /**
     * コマンドの説明を返す（履歴表示用）
     * @returns {string}
     */
    getDescription() {
        return 'Unknown Command';
    }

    /**
     * コマンドが有効かどうかを判定
     * @returns {boolean}
     */
    isValid() {
        return true;
    }
}
