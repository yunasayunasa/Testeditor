/**
 * Undo/Redoシステムの履歴管理を行うクラス
 * コマンドパターンを使用して、全ての編集操作を記録・管理する
 */
export class EditorCommandManager {
    /**
     * @param {Object} editorPlugin - EditorPluginのインスタンス
     */
    constructor(editorPlugin) {
        this.plugin = editorPlugin;
        this.undoStack = [];
        this.redoStack = [];
        this.maxStackSize = 100; // メモリ節約のため上限を設定
        this.isExecuting = false; // 再帰的な実行を防ぐフラグ
        
        console.log('[EditorCommandManager] Initialized');
    }

    /**
     * コマンドを実行し、undoスタックに追加
     * @param {EditorCommand} command - 実行するコマンド
     */
    execute(command) {
        if (this.isExecuting) {
            console.warn('[EditorCommandManager] Recursive execution prevented');
            return;
        }

        if (!command || typeof command.execute !== 'function') {
            console.error('[EditorCommandManager] Invalid command:', command);
            return;
        }

        try {
            this.isExecuting = true;
            
            // コマンドを実行
            command.execute();
            
            // undoスタックに追加
            this.undoStack.push(command);
            
            // 新しい操作でredoスタックをクリア
            this.redoStack = [];
            
            // スタックサイズの制限
            if (this.undoStack.length > this.maxStackSize) {
                this.undoStack.shift();
            }
            
            console.log(`[EditorCommandManager] Executed: ${command.getDescription()}`);
            
        } catch (error) {
            console.error('[EditorCommandManager] Error executing command:', error);
        } finally {
            this.isExecuting = false;
            this.updateUI();
        }
    }

    /**
     * 最後の操作を元に戻す
     */
    undo() {
        if (this.undoStack.length === 0) {
            console.log('[EditorCommandManager] Nothing to undo');
            return;
        }

        if (this.isExecuting) {
            console.warn('[EditorCommandManager] Cannot undo while executing');
            return;
        }

        try {
            this.isExecuting = true;
            
            const command = this.undoStack.pop();
            command.undo();
            
            this.redoStack.push(command);
            
            console.log(`[EditorCommandManager] Undone: ${command.getDescription()}`);
            
        } catch (error) {
            console.error('[EditorCommandManager] Error during undo:', error);
        } finally {
            this.isExecuting = false;
            this.updateUI();
        }
    }

    /**
     * Undo操作をやり直す
     */
    redo() {
        if (this.redoStack.length === 0) {
            console.log('[EditorCommandManager] Nothing to redo');
            return;
        }

        if (this.isExecuting) {
            console.warn('[EditorCommandManager] Cannot redo while executing');
            return;
        }

        try {
            this.isExecuting = true;
            
            const command = this.redoStack.pop();
            command.execute();
            
            this.undoStack.push(command);
            
            console.log(`[EditorCommandManager] Redone: ${command.getDescription()}`);
            
        } catch (error) {
            console.error('[EditorCommandManager] Error during redo:', error);
        } finally {
            this.isExecuting = false;
            this.updateUI();
        }
    }

    /**
     * 履歴をクリア
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        console.log('[EditorCommandManager] History cleared');
        this.updateUI();
    }

    /**
     * UI更新（EditorUIに通知）
     */
    updateUI() {
        if (this.plugin.editorUI && typeof this.plugin.editorUI.updateUndoRedoButtons === 'function') {
            this.plugin.editorUI.updateUndoRedoButtons(
                this.canUndo(),
                this.canRedo()
            );
        }
    }

    /**
     * Undoが可能かどうか
     * @returns {boolean}
     */
    canUndo() {
        return this.undoStack.length > 0;
    }

    /**
     * Redoが可能かどうか
     * @returns {boolean}
     */
    canRedo() {
        return this.redoStack.length > 0;
    }

    /**
     * 履歴情報を取得（デバッグ用）
     * @returns {Object}
     */
    getHistory() {
        return {
            undoStack: this.undoStack.map(cmd => cmd.getDescription()),
            redoStack: this.redoStack.map(cmd => cmd.getDescription()),
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        };
    }

    /**
     * 実行中かどうかを取得
     * @returns {boolean}
     */
    getIsExecuting() {
        return this.isExecuting;
    }
}
