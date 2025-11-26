/**
 * Undo/Redo デバッグヘルパー
 * ブラウザコンソールで実行するグローバル関数
 */

// グローバルに公開
window.debugUndoRedo = function() {
    console.group('🔍 Undo/Redo Debug Info');
    
    try {
        const plugin = window.game?.plugins?.get('EditorPlugin');
        
        if (!plugin) {
            console.error('❌ EditorPlugin not found');
            console.groupEnd();
            return;
        }
        
        console.log('✅ EditorPlugin:', plugin);
        
        // CommandManager確認
        if (plugin.commandManager) {
            console.log('✅ CommandManager:', plugin.commandManager);
            const history = plugin.commandManager.getHistory();
            console.log('📊 History:', history);
            console.log(`  - Undo Stack: ${history.undoStack.length} items`);
            console.log(`  - Redo Stack: ${history.redoStack.length} items`);
            console.log(`  - Can Undo: ${history.canUndo}`);
            console.log(`  - Can Redo: ${history.canRedo}`);
        } else {
            console.error('❌ CommandManager not found');
        }
        
        // EditorUI確認
        if (plugin.editorUI) {
            console.log('✅ EditorUI:', plugin.editorUI);
            
            const undoBtn = plugin.editorUI.undoBtn;
            const redoBtn = plugin.editorUI.redoBtn;
            
            if (undoBtn) {
                console.log(`  - Undo Button: disabled=${undoBtn.disabled}, opacity=${undoBtn.style.opacity}`);
            } else {
                console.error('❌ Undo Button not found in EditorUI');
            }
            
            if (redoBtn) {
                console.log(`  - Redo Button: disabled=${redoBtn.disabled}, opacity=${redoBtn.style.opacity}`);
            } else {
                console.error('❌ Redo Button not found in EditorUI');
            }
            
            if (typeof plugin.editorUI.updateUndoRedoButtons === 'function') {
                console.log('✅ updateUndoRedoButtons method exists');
            } else {
                console.error('❌ updateUndoRedoButtons method not found');
            }
        } else {
            console.error('❌ EditorUI not found');
        }
        
        // GizmoManager確認
        if (plugin.gizmoManager) {
            console.log('✅ GizmoManager:', plugin.gizmoManager);
            console.log(`  - Mode: ${plugin.gizmoManager.mode}`);
            console.log(`  - Target: ${plugin.gizmoManager.target ? plugin.gizmoManager.target.name : 'none'}`);
        } else {
            console.error('❌ GizmoManager not found');
        }
        
    } catch (error) {
        console.error('💥 Error during debug:', error);
    }
    
    console.groupEnd();
};

// 使い方を表示
console.log('%c💡 Undo/Redo Debug Helper Loaded!', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
console.log('%cType debugUndoRedo() in console to check status', 'color: #2196F3;');
