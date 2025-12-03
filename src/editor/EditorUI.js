import EngineAPI from '../core/EngineAPI.js';
import { ComponentRegistry } from '../../src/components/index.js';

export default class EditorUI {
    constructor(game, editorPlugin) {
        this.game = game;
        this.plugin = editorPlugin;
        this.assetList = this.game.registry.get('asset_list') || [];

        // Force debug mode for development
        // const currentURL = window.location.href;
        // if (!currentURL.includes('?debug=true') && !currentURL.includes('&debug=true')) return;

        // Add debug-mode class to body to ensure editor visibility
        document.body.classList.add('debug-mode');

        // --- Properties ---
        this.selectedAssetKey = null;
        this.selectedAssetType = null;
        this.currentEditorMode = 'select';
        this.currentAssetTab = 'image';
        this.currentSceneTab = 'Scene';  // 'Scene', 'Game', or 'Animator'
        this.activeEventId = null;
        this.selectedNodeData = null;
        this.connectionState = { isActive: false, fromNodeId: null, previewLine: null };
        this.vslMode = 'select';
        this.panState = { isPanning: false, startX: 0, startY: 0 };

        this.layers = [
            { name: 'Foreground', visible: true, locked: false },
            { name: 'Gameplay', visible: true, locked: false },
            { name: 'Background', visible: true, locked: false },
        ];
        this.activeLayerName = 'Gameplay';

        // --- DOM Elements ---
        this.getDomElements();

        // --- Initial Setup ---
        if (this.editorPanel) this.editorPanel.style.display = 'flex';
        if (this.assetBrowserPanel) this.assetBrowserPanel.style.display = 'flex';

        this.createPauseToggle();
        this.createHelpButton();
        this.initializeEventListeners();
        this.populateAssetBrowser();
        this.initConsoleCapture(); // Console機能の初期化

        const refreshBtn = document.getElementById('editor-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.plugin.refresh());
        }
    }
    getDomElements() {
        // Main Panels
        this.editorPanel = document.getElementById('editor-panel'); // Wrapper
        this.hierarchyPanel = document.getElementById('hierarchy-panel');
        this.sceneViewPanel = document.getElementById('scene-view-panel');
        this.inspectorPanel = document.getElementById('inspector-panel');
        this.bottomPanel = document.getElementById('bottom-panel');

        // --- File Controls ---
        this.saveSceneBtn = document.getElementById('editor-save-scene-btn');
        this.loadSceneBtn = document.getElementById('editor-load-scene-btn');
        this.exportGameBtn = document.getElementById('editor-export-game-btn');
        this.sceneFileInput = document.getElementById('scene-file-input');
        this.assetFileInput = document.getElementById('asset-file-input');
        // --- Edit Controls ---
        this.undoBtn = document.getElementById('editor-undo-btn');
        this.redoBtn = document.getElementById('editor-redo-btn');
        this.copyBtn = document.getElementById('editor-copy-btn');
        this.pasteBtn = document.getElementById('editor-paste-btn');
        this.duplicateBtn = document.getElementById('editor-duplicate-btn');
        this.deleteBtn = document.getElementById('editor-delete-btn');
        
        // --- Tool Controls ---
        this.multiSelectBtn = document.getElementById('tool-multiselect');
        this.inspectorLockBtn = document.getElementById('tool-inspector-lock');
        // --- Bottom Panel Tabs ---
        document.getElementById('tab-project')?.addEventListener('click', () => this.switchBottomTab('project'));
        document.getElementById('tab-console')?.addEventListener('click', () => this.switchBottomTab('console'));

        // --- Asset Browser ---
        this.assetBrowserPanel = document.getElementById('asset-browser-panel'); // Note: This ID might not exist in HTML, but logic handles null
        this.assetListContainer = document.getElementById('asset-list');
        this.assetTabContainer = document.getElementById('asset-type-tabs'); // Added this
        this.assetBreadcrumb = document.getElementById('asset-breadcrumb');
        document.getElementById('add-asset-button')?.addEventListener('click', this.onAddButtonClicked);
        document.getElementById('add-text-button')?.addEventListener('click', this.onAddTextClicked);

        // --- Console ---
        this.consolePanel = document.getElementById('console-panel');
        this.consoleOutput = document.getElementById('console-output');
        this.consoleInput = document.getElementById('console-input');
        this.clearConsoleBtn = document.getElementById('clear-console-btn');
        if (this.clearConsoleBtn) {
            this.clearConsoleBtn.addEventListener('click', () => this.clearConsole());
        }

        // --- Hierarchy ---
        this.hierarchyTree = document.getElementById('hierarchy-tree');
        this.hierarchySearch = document.getElementById('hierarchy-search');
        this.createObjectBtn = document.getElementById('create-object-btn');
        if (this.hierarchySearch) {
            this.hierarchySearch.addEventListener('input', (e) => this.filterHierarchy(e.target.value));
        }

        // --- Layers ---
        this.layerListContainer = document.getElementById('layer-list');
        document.getElementById('add-layer-btn')?.addEventListener('click', this.addNewLayer);
        if (this.layerListContainer) {
            this.layerListContainer.addEventListener('click', (event) => {
                const target = event.target;
                const layerItem = target.closest('.layer-item');
                if (!layerItem) return;
                const layerName = layerItem.dataset.layerName;
                if (!layerName) return;

                if (target.classList.contains('layer-visibility-btn')) {
                    this.toggleLayerVisibility(layerName);
                } else if (target.classList.contains('layer-lock-btn')) {
                    this.toggleLayerLock(layerName);
                } else if (target.classList.contains('layer-active-indicator')) {
                    this.setActiveLayer(layerName);
                } else {
                    this.plugin.selectLayer(this.layers.find(l => l.name === layerName));
                }
            });
        }

        // Check for critical elements
        if (!this.editorPanel) console.warn('EditorUI: #editor-panel not found');
        if (!this.sceneViewPanel) console.warn('EditorUI: #scene-view-panel not found');
        if (!this.gameContainer) console.warn('EditorUI: #game-container not found');

        // --- Tilemap ---
        this.tilemapModeBtn = document.getElementById('tilemap-mode-btn');
        this.tilemapModeBtn?.addEventListener('click', this.openTilemapEditor);
        document.getElementById('tilemap-editor-close-btn')?.addEventListener('click', this.closeTilemapEditor);
        document.getElementById('crop-and-place-btn')?.addEventListener('click', this.onCropAndPlace);
        this.tilemapEditorOverlay = document.getElementById('tilemap-editor-overlay');
        this.tilemapListContainer = document.getElementById('tilemap-list-container');
        this.selectedTilemapName = document.getElementById('selected-tilemap-name');
        this.tilemapPreviewContent = document.getElementById('tilemap-preview-content');

        // --- VSL & State Machine ---
        document.getElementById('event-editor-close-btn')?.addEventListener('click', this.closeEventEditor);
        document.getElementById('sm-editor-close-btn')?.addEventListener('click', this.closeStateMachineEditor);
        this.eventEditorOverlay = document.getElementById('event-editor-overlay');
        this.eventEditorTitle = document.getElementById('event-editor-title');
        this.vslNodeList = document.getElementById('vsl-node-list');
        this.vslCanvas = document.getElementById('vsl-canvas');
        this.vslTabs = document.getElementById('vsl-tabs');
        this.smEditorOverlay = document.getElementById('sm-editor-overlay');

        document.getElementById('vsl-select-mode-btn')?.addEventListener('click', () => this.setVslMode('select'));
        document.getElementById('vsl-pan-mode-btn')?.addEventListener('click', () => this.setVslMode('pan'));

        const canvasWrapper = document.getElementById('vsl-canvas-wrapper');
        if (canvasWrapper) {
            canvasWrapper.addEventListener('pointerdown', (event) => {
                if (this.vslMode === 'pan') return;
                const pinElement = event.target.closest('[data-pin-type]');
                if (pinElement) {
                    event.stopPropagation();
                    this.onPinClicked(pinElement);
                    return;
                }
            });
        }

        // --- Scene View & Camera ---
        this.gameContainer = document.getElementById('game-container');
        this.sceneOverlay = document.getElementById('scene-overlay');
        this.cameraControls = document.getElementById('camera-controls');
        document.getElementById('camera-zoom-in')?.addEventListener('click', () => this.plugin.zoomCamera(0.2));
        document.getElementById('camera-zoom-out')?.addEventListener('click', () => this.plugin.zoomCamera(-0.2));
        document.getElementById('camera-reset')?.addEventListener('click', () => this.plugin.resetCamera());
        this.setupPanButton(document.getElementById('camera-pan-up'), 0, -10);
        this.setupPanButton(document.getElementById('camera-pan-down'), 0, 10);
        this.setupPanButton(document.getElementById('camera-pan-left'), -10, 0);


        // --- Help ---
        this.helpModal = document.getElementById('help-modal-overlay');
        this.helpModalContent = document.getElementById('help-modal-content');
        document.getElementById('help-modal-close-btn')?.addEventListener('click', () => this.closeHelpModal());

        // --- Inspector Lock ---
        this.inspectorLocked = false;
        this.lockInspectorBtn = document.getElementById('lock-inspector-btn');
        if (this.lockInspectorBtn) {
            this.lockInspectorBtn.addEventListener('click', () => {
                this.inspectorLocked = !this.inspectorLocked;
                this.lockInspectorBtn.textContent = this.inspectorLocked ? '🔓' : '🔒';
                console.log(`Inspector ${this.inspectorLocked ? 'locked' : 'unlocked'}`);
            });
        }

        // --- Play/Edit Mode Toggle ---
        this.modeToggleCheckbox = document.getElementById('mode-toggle-checkbox');
        this.modeLabel = document.getElementById('mode-label');
        if (this.modeToggleCheckbox) {
            this.modeToggleCheckbox.addEventListener('change', (e) => {
                const isPlayMode = e.target.checked;
                this.game.registry.set('editor_mode', isPlayMode ? 'play' : 'select');
                if (this.modeLabel) {
                    this.modeLabel.textContent = isPlayMode ? 'PLAY' : 'EDIT';
                }
                console.log(`[EditorUI] Mode switched to: ${isPlayMode ? 'PLAY' : 'EDIT'}`);
            });
        }
    }

    initializeEventListeners() {
        // --- File Controls ---
        if (this.saveSceneBtn) {
            this.saveSceneBtn.addEventListener('click', this.onSaveSceneClicked);
        }
        if (this.loadSceneBtn) {
            this.loadSceneBtn.addEventListener('click', () => this.sceneFileInput?.click());
        }
        if (this.exportGameBtn) {
            this.exportGameBtn.addEventListener('click', this.onExportGameClicked);
        }
        if (this.sceneFileInput) {
            this.sceneFileInput.addEventListener('change', this.onLoadSceneFile);
        }
        if (this.assetFileInput) {
            this.assetFileInput.addEventListener('change', this.onAssetFileSelected);
        }

        // --- Toolbar Controls ---
        const playBtn = document.getElementById('editor-play-btn');
        const pauseBtn = document.getElementById('editor-pause-btn');
        const stepBtn = document.getElementById('editor-step-btn');

        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (EngineAPI) EngineAPI.resumeTime();
                playBtn.classList.add('active');
                if (pauseBtn) pauseBtn.classList.remove('active');
            });
        }
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                if (EngineAPI) EngineAPI.stopTime();
                pauseBtn.classList.add('active');
                if (playBtn) playBtn.classList.remove('active');
            });
        }
        if (stepBtn) {
            stepBtn.addEventListener('click', () => {
                // Step logic (optional)
                console.log('Step button clicked');
            });
        }
        // --- Edit Controls (Undo/Redo) ---
        if (this.undoBtn) {
            this.undoBtn.addEventListener('click', () => {
                if (this.plugin.commandManager) {
                    this.plugin.commandManager.undo();
                }
            });
        }
        if (this.redoBtn) {
            this.redoBtn.addEventListener('click', () => {
                if (this.plugin.commandManager) {
                    this.plugin.commandManager.redo();
                }
            });
        }

        // Edit Controls (Copy/Paste/etc)
        this.copyBtn?.addEventListener('click', () => this.plugin.clipboardManager.copySelectedObject());
        this.pasteBtn?.addEventListener('click', () => this.plugin.clipboardManager.pasteObject());
        this.duplicateBtn?.addEventListener('click', () => this.plugin.clipboardManager.duplicateSelectedObject());
        this.deleteBtn?.addEventListener('click', () => this.plugin.clipboardManager.deleteSelectedObject());

        // Multi-Select Toggle
        this.multiSelectBtn?.addEventListener('click', () => {
            if (this.plugin.toggleMultiSelectMode) {
                this.plugin.toggleMultiSelectMode();
                this.updateMultiSelectButtonState();
            }
        });

        // Inspector Lock Toggle
        this.inspectorLockBtn?.addEventListener('click', () => {
            if (this.plugin.toggleInspectorLock) {
                this.plugin.toggleInspectorLock();
                this.updateInspectorLockButtonState();
            }
        });




        // --- Tool Buttons ---
        const tools = ['tool-hand', 'tool-move', 'tool-rotate', 'tool-scale', 'tool-rect'];
        tools.forEach(toolId => {
            const btn = document.getElementById(toolId);
            if (btn) {
                btn.addEventListener('click', () => {
                    // Deactivate all
                    tools.forEach(t => document.getElementById(t)?.classList.remove('active'));
                    // Activate clicked
                    btn.classList.add('active');

                    // Set tool in plugin
                    const toolName = toolId.replace('tool-', '');
                    if (this.plugin && this.plugin.gizmoManager) {
                        this.plugin.gizmoManager.setActiveTool(toolName);
                    }
                });
            } else {
                console.warn(`EditorUI: Tool button #${toolId} not found`);
            }
        });

        // --- Layer Dropdown ---
        const layerDropdown = document.getElementById('layer-dropdown');
        if (layerDropdown) {
            layerDropdown.addEventListener('change', (e) => {
                this.setActiveLayer(e.target.value);
            });
        }

        // --- Layout Button ---
        const layoutBtn = document.getElementById('editor-layout-btn');
        if (layoutBtn) {
            layoutBtn.addEventListener('click', () => {
                // Toggle layout or show menu
                console.log('Layout button clicked');
            });
        }

        // --- Create Object Button ---
        if (this.createObjectBtn) {
            this.createObjectBtn.addEventListener('click', () => {
                // Show create menu (simplified)
                const name = prompt('Enter object name:', 'New Object');
                if (name) {
                    const scene = this.plugin.getActiveGameScene();
                    if (scene) {
                        const newObj = scene.add.sprite(400, 300, 'logo'); // Default sprite
                        newObj.name = name;
                        this.plugin.makeEditable(newObj, scene);
                        this.buildHierarchyPanel();
                    }
                }
            });
        } else {
            console.warn('EditorUI: #create-object-btn not found');
        }
        // --- Scene Tabs (Scene/Game/Animator) ---
        const sceneTabsContainer = document.querySelector('.scene-tabs');
        if (sceneTabsContainer) {
            const tabs = sceneTabsContainer.querySelectorAll('.tab');
            tabs.forEach((tab) => {
                tab.addEventListener('click', () => {
                    const tabName = tab.textContent.trim();
                    this.switchSceneTab(tabName);
                });
            });
        }
    }


    updateUndoRedoButtons(canUndo, canRedo) {
        if (this.undoBtn) {
            this.undoBtn.disabled = !canUndo;
            this.undoBtn.style.opacity = canUndo ? '1' : '0.5';
        }
        if (this.redoBtn) {
            this.redoBtn.disabled = !canRedo;
            this.redoBtn.style.opacity = canRedo ? '1' : '0.5';
        }
    }

    updateMultiSelectButtonState() {
        if (this.multiSelectBtn) {
            if (this.plugin.isMultiSelectMode) {
                this.multiSelectBtn.classList.add('active');
            } else {
                this.multiSelectBtn.classList.remove('active');
            }
        }
    }

    updateInspectorLockButtonState() {
        if (this.inspectorLockBtn) {
            if (this.plugin.isInspectorLocked) {
                this.inspectorLockBtn.classList.add('active');
                // this.inspectorLockBtn.innerText = '🔒';
            } else {
                this.inspectorLockBtn.classList.remove('active');
                // this.inspectorLockBtn.innerText = '🔓';
            }
        }
    }

    switchSceneTab(tabName) {
        if (this.currentSceneTab === tabName) return;

        console.log(`[EditorUI] Switching to ${tabName} tab`);
        this.currentSceneTab = tabName;

        // Update tab active states
        const sceneTabsContainer = document.querySelector('.scene-tabs');
        if (sceneTabsContainer) {
            const tabs = sceneTabsContainer.querySelectorAll('.tab');
            tabs.forEach(tab => {
                if (tab.textContent.trim() === tabName) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
        }

        // Handle tab-specific behavior
        if (tabName === 'Game') {
            // Switch to play mode
            if (this.game.registry.get('editor_mode') !== 'play') {
                const playBtn = document.getElementById('editor-play-btn');
                if (playBtn) playBtn.click();
            }
            // Hide gizmos
            if (this.plugin && this.plugin.gizmoManager) {
                this.plugin.gizmoManager.detach();
            }
        } else if (tabName === 'Animator') {
            // Show placeholder message
            alert('アニメーションタイムライン機能は現在開発中です。\n\nAnimation timeline feature is currently under development.');
            // Switch back to Scene tab
            setTimeout(() => this.switchSceneTab('Scene'), 100);
        } else {
            // Scene tab - ensure edit mode
            if (this.game.registry.get('editor_mode') === 'play') {
                const playBtn = document.getElementById('editor-play-btn');
                if (playBtn) playBtn.click(); // Stop play mode
            }
        }
    }

    onPluginReady() {
        this.buildHierarchyPanel();
        this.buildLayerPanel();
        this.plugin.updateLayerStates(this.layers);
    }

    start() {
        this.plugin.updateLayerStates(this.layers);
        this.buildLayerPanel();
    }

    getActiveGameScene() {
        return this.plugin?.getActiveGameScene();
    }

    // =================================================================
    // Hierarchy Panel
    // =================================================================
    buildHierarchyPanel() {
        if (!this.hierarchyTree) return;
        this.hierarchyTree.innerHTML = '';

        const scene = this.getActiveGameScene();
        if (!scene) return;

        const rootObjects = scene.children.list.filter(obj => !obj.parentContainer);

        rootObjects.forEach(obj => {
            if (obj.getData('hiddenFromEditor')) return;
            this.createHierarchyItem(obj, this.hierarchyTree, 0);
        });
    }

    createHierarchyItem(gameObject, parentElement, depth = 0) {
        const item = document.createElement('div');
        item.className = 'hierarchy-item';
        item.dataset.objectId = gameObject.name;
        item.style.paddingLeft = `${depth * 20 + 8}px`;

        // 折りたたみボタン
        const hasChildren = gameObject.type === 'Container' && gameObject.list && gameObject.list.length > 0;
        const toggle = document.createElement('button');
        toggle.className = 'hierarchy-toggle';
        toggle.innerHTML = hasChildren ? '▼' : '⋅';
        toggle.style.visibility = hasChildren ? 'visible' : 'hidden';

        if (hasChildren) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const childContainer = item.nextElementSibling;
                if (childContainer && childContainer.classList.contains('hierarchy-children')) {
                    const isCollapsed = childContainer.style.display === 'none';
                    childContainer.style.display = isCollapsed ? 'block' : 'none';
                    toggle.innerHTML = isCollapsed ? '▼' : '▶';
                }
            });
        }

        // アイコン
        const icon = document.createElement('span');
        icon.className = 'hierarchy-icon';
        icon.innerHTML = this.getObjectIcon(gameObject);

        // 名前
        const name = document.createElement('span');
        name.className = 'hierarchy-name';
        name.textContent = gameObject.name || `[${gameObject.type}]`;

        // クリックイベント
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hierarchyTree.querySelectorAll('.hierarchy-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            this.plugin.selectSingleObject(gameObject);
        });

        // ドラッグ&ドロップ
        item.draggable = true;
        this.setupHierarchyDrag(item, gameObject);

        item.append(toggle, icon, name);
        parentElement.appendChild(item);

        // 子要素を再帰的に追加
        if (hasChildren) {
            const childContainer = document.createElement('div');
            childContainer.className = 'hierarchy-children';
            gameObject.list.forEach(child => {
                this.createHierarchyItem(child, childContainer, depth + 1);
            });
            parentElement.appendChild(childContainer);
        }
    }

    getObjectIcon(gameObject) {
        const iconMap = {
            'Sprite': '🖼️',
            'Image': '🖼️',
            'Text': 'T',
            'Container': '📁',
            'TilemapLayer': '🗺️'
        };
        return iconMap[gameObject.type] || '📦';
    }

    setupHierarchyDrag(item, gameObject) {
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('gameObjectName', gameObject.name);
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            item.classList.add('drag-over');
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');

            const draggedName = e.dataTransfer.getData('gameObjectName');
            if (draggedName && draggedName !== gameObject.name) {
                this.reparentObject(draggedName, gameObject.name);
            }
        });
    }

    reparentObject(childName, newParentName) {
        const scene = this.getActiveGameScene();
        if (!scene) return;

        const childObj = this.findObjectByName(scene, childName);
        const parentObj = newParentName ? this.findObjectByName(scene, newParentName) : null;

        if (!childObj) return;

        // Phaserのコンテナシステムを使用
        if (parentObj && parentObj instanceof Phaser.GameObjects.Container) {
            parentObj.add(childObj);
        } else {
            // 親から削除して、シーンのルートに移動
            if (childObj.parentContainer) {
                childObj.parentContainer.remove(childObj);
            }
        }

        this.buildHierarchyPanel(); // 更新
    }

    findObjectByName(scene, objectName) {
        return scene.children.list.find(obj => obj.name === objectName);
    }

    filterHierarchy(searchTerm) {
        const items = this.hierarchyTree.querySelectorAll('.hierarchy-item');
        const term = searchTerm.toLowerCase();

        items.forEach(item => {
            const nameEl = item.querySelector('.hierarchy-name');
            if (!nameEl) return;

            const name = nameEl.textContent.toLowerCase();
            const matches = name.includes(term);
            item.style.display = matches || term === '' ? 'flex' : 'none';

            // 子要素のコンテナも表示/非表示
            const childContainer = item.nextElementSibling;
            if (childContainer && childContainer.classList.contains('hierarchy-children')) {
                childContainer.style.display = matches || term === '' ? 'block' : 'none';
            }
        });
    }

    // =================================================================
    // Asset Import Logic
    // =================================================================
    onAssetFileSelected = (event) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            this.processAssetFiles(files);
        }
        // Reset input so the same file can be selected again
        event.target.value = '';
    }

    processAssetFiles(files) {
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                const assetList = this.game.registry.get('asset_list') || [];
                
                // Determine asset type based on MIME type
                let type = 'image';
                if (file.type.startsWith('audio/')) {
                    type = 'audio';
                }

                // Create a unique key based on filename
                const key = file.name.split('.')[0].replace(/[^a-zA-Z0-9_-]/g, '_');

                // Check for duplicates
                if (assetList.some(a => a.key === key)) {
                    console.warn(`Asset with key ${key} already exists. Skipping.`);
                    return;
                }

                const newAsset = {
                    key: key,
                    type: type,
                    url: dataUrl, // Save DataURL for persistence
                    path: file.name // Keep original filename for reference
                };

                assetList.push(newAsset);
                this.game.registry.set('asset_list', assetList);

                // Register to Phaser Loader
                if (type === 'image') {
                    this.game.textures.addBase64(key, dataUrl);
                } else if (type === 'audio') {
                    // Audio handling with DataURL in Phaser is tricky at runtime without proper decoding
                    // For now, we just store it. Playback might require specific handling.
                    console.log('Audio asset added (persistence only for now):', key);
                }

                console.log(`Asset added: ${key} (${type})`);
                this.populateAssetBrowser();
            };
            reader.readAsDataURL(file);
        });
    }

    // =================================================================
    // Project / Asset Browser
    // =================================================================
    populateAssetBrowser() {
        const assetList = this.game.registry.get('asset_list');
        if (!assetList || !this.assetListContainer || !this.assetTabContainer) return;

        const assetTypes = [...new Set(assetList.map(asset => (asset.type === 'spritesheet' ? 'image' : asset.type)))];
        if (!assetTypes.includes('image')) assetTypes.unshift('image');
        if (!assetTypes.includes('ui')) assetTypes.push('ui');

        this.assetTabContainer.innerHTML = '';
        assetTypes.forEach(type => {
            if (!type) return;
            const tabButton = document.createElement('div');
            tabButton.className = 'asset-tab';
            tabButton.innerText = type.charAt(0).toUpperCase() + type.slice(1) + 's';
            if (type === this.currentAssetTab) tabButton.classList.add('active');
            tabButton.addEventListener('click', () => {
                this.currentAssetTab = type;
                this.selectedAssetKey = null;
                this.selectedAssetType = null;
                this.populateAssetBrowser();
            });
            this.assetTabContainer.appendChild(tabButton);
        });

        // Add Import Button to the tabs area
        const importBtn = document.createElement('div');
        importBtn.className = 'asset-tab import-btn';
        importBtn.innerHTML = '<span>📥 Import</span>';
        importBtn.style.backgroundColor = 'var(--accent-color)';
        importBtn.style.color = 'white';
        importBtn.style.marginLeft = 'auto'; // Push to right
        importBtn.addEventListener('click', () => {
            if (this.assetFileInput) {
                this.assetFileInput.click();
            } else {
                console.error('Asset file input element not found');
            }
        });
        this.assetTabContainer.appendChild(importBtn);

        this.assetListContainer.innerHTML = '';

        if (this.currentAssetTab === 'ui') {
            const uiRegistry = this.game.registry.get('uiRegistry');
            for (const key in uiRegistry) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'asset-item';
                itemDiv.dataset.registryKey = key;
                itemDiv.addEventListener('click', () => {
                    this.assetListContainer.querySelectorAll('.asset-item.selected').forEach(el => el.classList.remove('selected'));
                    itemDiv.classList.add('selected');
                    this.selectedAssetKey = itemDiv.dataset.registryKey;
                    this.selectedAssetType = 'ui';
                });
                const iconSpan = document.createElement('span');
                iconSpan.className = 'asset-preview';
                iconSpan.innerText = '🧩';
                const nameSpan = document.createElement('span');
                nameSpan.innerText = key;
                itemDiv.append(iconSpan, nameSpan);
                this.assetListContainer.appendChild(itemDiv);
            }

            const joystickItemDiv = document.createElement('div');
            joystickItemDiv.className = 'asset-item';
            joystickItemDiv.dataset.assetKey = 'joystick';
            joystickItemDiv.innerHTML = `<span class="asset-preview">🕹️</span><span>ジョイスティック</span>`;
            joystickItemDiv.addEventListener('click', () => {
                this.assetListContainer.querySelectorAll('.asset-item.selected').forEach(el => el.classList.remove('selected'));
                joystickItemDiv.classList.add('selected');
                this.selectedAssetKey = 'joystick';
                this.selectedAssetType = 'ui_special';
            });
            this.assetListContainer.appendChild(joystickItemDiv);

            const textItemDiv = document.createElement('div');
            textItemDiv.className = 'asset-item';
            textItemDiv.dataset.registryKey = 'Text';
            textItemDiv.innerHTML = `<span class="asset-preview" style="font-size: 24px; display: flex; align-items: center; justify-content: center;">T</span><span>テキスト</span>`;
            textItemDiv.addEventListener('click', () => {
                this.assetListContainer.querySelectorAll('.asset-item.selected').forEach(el => el.classList.remove('selected'));
                textItemDiv.classList.add('selected');
                this.selectedAssetKey = 'Text';
                this.selectedAssetType = 'ui';
            });
            this.assetListContainer.appendChild(textItemDiv);

        } else {
            const displayableAssets = assetList.filter(asset => {
                if (this.currentAssetTab === 'image') return asset.type === 'image' || asset.type === 'spritesheet';
                if (this.currentAssetTab === 'prefab') return asset.type === 'prefab' || asset.type === 'GroupPrefab';
                return asset.type === this.currentAssetTab;
            });

            for (const asset of displayableAssets) {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'asset-item';
                itemDiv.dataset.assetKey = asset.key;
                itemDiv.addEventListener('click', () => {
                    this.assetListContainer.querySelectorAll('.asset-item.selected').forEach(el => el.classList.remove('selected'));
                    itemDiv.classList.add('selected');
                    this.selectedAssetKey = asset.key;
                    this.selectedAssetType = asset.type;
                });

                if (asset.path) {
                    const previewImg = document.createElement('img');
                    previewImg.className = 'asset-preview';
                    previewImg.src = asset.path;
                    itemDiv.appendChild(previewImg);
                } else {
                    const iconSpan = document.createElement('span');
                    iconSpan.innerText = '📦';
                    iconSpan.className = 'asset-preview';
                    itemDiv.appendChild(iconSpan);
                }

                const keySpan = document.createElement('span');
                keySpan.innerText = asset.key;
                itemDiv.appendChild(keySpan);

                if (asset.type === 'spritesheet') {
                    const badge = document.createElement('span');
                    badge.innerText = 'Sheet';
                    badge.className = 'asset-badge';
                    itemDiv.appendChild(badge);
                }
                this.assetListContainer.appendChild(itemDiv);
            }
        }
    }

    onAddButtonClicked = () => {
        if (this.selectedAssetKey === '__TEXT_OBJECT__') {
            const activeScene = this.plugin.getActiveGameScene();
            const newName = `text_${Date.now()}`;
            if (activeScene && typeof activeScene.addTextUiFromEditor === 'function') {
                const newTextObject = activeScene.addTextUiFromEditor(newName, this.activeLayerName);
                if (newTextObject) this.plugin.selectSingleObject(newTextObject);
            } else {
                alert('テキストオブジェクトを追加できるアクティブなゲームシーンが見つかりません。');
            }
            return;
        }

        if (!this.selectedAssetKey) {
            alert('アセットを選択してください。');
            return;
        }

        if (this.selectedAssetKey === 'joystick' && this.selectedAssetType === 'ui_special') {
            const gameScene = this.getActiveGameScene();
            if (gameScene && typeof gameScene.addJoystickFromEditor === 'function') {
                gameScene.addJoystickFromEditor();
            } else {
                alert("ジョイスティックを追加できるアクティブなゲームシーンが見つかりません。");
            }
            return;
        }

        let newObjectOrObjects = null;
        const newName = `${this.selectedAssetKey.toLowerCase()}_${Date.now()}`;

        if (this.selectedAssetType === 'ui') {
            const uiScene = this.game.scene.getScene('UIScene');
            if (uiScene && typeof uiScene.addUiComponentFromEditor === 'function') {
                newObjectOrObjects = uiScene.addUiComponentFromEditor(this.selectedAssetKey, newName);
            } else {
                alert("UISceneまたはそのaddUiComponentFromEditorメソッドが見つかりません。");
            }
        } else {
            const gameScene = this.getActiveGameScene();
            if (!gameScene) {
                alert("アセットを追加するためのアクティブなゲームシーンが見つかりません。");
                return;
            }
            if ((this.selectedAssetType === 'image' || this.selectedAssetType === 'spritesheet') && typeof gameScene.addObjectFromEditor === 'function') {
                newObjectOrObjects = gameScene.addObjectFromEditor(this.selectedAssetKey, newName, this.activeLayerName);
            } else if ((this.selectedAssetType === 'prefab' || this.selectedAssetType === 'GroupPrefab') && typeof gameScene.addPrefabFromEditor === 'function') {
                newObjectOrObjects = gameScene.addPrefabFromEditor(this.selectedAssetKey, newName, this.activeLayerName);
            }
        }

        if (newObjectOrObjects && this.plugin && (newObjectOrObjects instanceof Phaser.GameObjects.GameObject)) {
            if (Array.isArray(newObjectOrObjects)) {
                this.plugin.selectMultipleObjects(newObjectOrObjects);
            } else {
                this.plugin.selectSingleObject(newObjectOrObjects);
            }
        }
    }

    onAddTextClicked = () => {
        const activeScene = this.plugin.getActiveGameScene();
        const newName = `text_${Date.now()}`;
        if (activeScene && typeof activeScene.addTextUiFromEditor === 'function') {
            const newTextObject = activeScene.addTextUiFromEditor(newName, this.activeLayerName);
            if (newTextObject) this.plugin.selectSingleObject(newTextObject);
        } else {
            const uiScene = this.game.scene.getScene('UIScene');
            if (uiScene && typeof uiScene.addTextUiFromEditor === 'function') {
                const newTextObject = uiScene.addTextUiFromEditor(newName);
                if (newTextObject) this.plugin.selectSingleObject(newTextObject);
            } else {
                alert('テキストオブジェクトを追加できるシーンが見つかりません。');
            }
        }
    }

    // =================================================================
    // Layers
    // =================================================================
    buildLayerPanel() {
        const layerListContainer = document.getElementById('layer-list');
        if (!layerListContainer) return;
        layerListContainer.innerHTML = '';

        this.layers.forEach(layer => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'layer-item';
            itemDiv.dataset.layerName = layer.name;

            if (this.plugin.selectedLayer && layer.name === this.plugin.selectedLayer.name) {
                itemDiv.classList.add('active');
            }

            const activeIndicator = document.createElement('div');
            activeIndicator.className = 'layer-active-indicator';
            if (layer.name === this.activeLayerName) activeIndicator.classList.add('active');

            const visibilityBtn = document.createElement('button');
            visibilityBtn.className = 'layer-control layer-visibility-btn';
            visibilityBtn.innerHTML = layer.visible ? '👁️' : '—';

            const lockBtn = document.createElement('button');
            lockBtn.className = 'layer-control layer-lock-btn';
            lockBtn.innerHTML = layer.locked ? '🔒' : '🔓';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'layer-name';
            nameSpan.innerText = layer.name;

            itemDiv.append(activeIndicator, visibilityBtn, lockBtn, nameSpan);
            layerListContainer.appendChild(itemDiv);
        });
    }

    setActiveLayer(layerName) {
        const layer = this.layers.find(l => l.name === layerName);
        if (layer && layer.locked) return;
        this.activeLayerName = layerName;
        this.buildLayerPanel();
    }

    toggleLayerVisibility(layerName) {
        const layer = this.layers.find(l => l.name === layerName);
        if (layer) {
            layer.visible = !layer.visible;
            this.buildLayerPanel();
            this.plugin.updateLayerStates(this.layers);
            this.plugin.applyLayerStatesToScene();
        }
    }

    toggleLayerLock(layerName) {
        const layer = this.layers.find(l => l.name === layerName);
        if (layer) {
            layer.locked = !layer.locked;
            if (layer.locked && this.activeLayerName === layerName) {
                const fallbackLayer = this.layers.find(l => !l.locked);
                this.activeLayerName = fallbackLayer ? fallbackLayer.name : null;
            }
            this.buildLayerPanel();
            this.plugin.updateLayerStates(this.layers);
        }
    }

    addNewLayer = () => {
        const newLayerName = prompt("Enter new layer name:", `Layer ${this.layers.length + 1}`);
        if (newLayerName && !this.layers.some(l => l.name === newLayerName)) {
            this.layers.unshift({ name: newLayerName, visible: true, locked: false });
            this.buildLayerPanel();
            this.plugin.updateLayerStates(this.layers);
        }
    }

    deleteLayer(layerName) {
        const layer = this.layers.find(l => l.name === layerName);
        if (!layer) return;

        if (confirm(`本当にレイヤー '${layerName}' を削除しますか？\nこのレイヤー上のすべてのオブジェクトも削除されます！`)) {
            const scene = this.getActiveGameScene();
            if (scene) {
                const sceneObjects = this.plugin.editableObjects.get(scene.scene.key);
                if (sceneObjects) {
                    const objectsToDelete = Array.from(sceneObjects).filter(obj => obj.getData('layer') === layerName);
                    objectsToDelete.forEach(obj => {
                        sceneObjects.delete(obj);
                        obj.destroy();
                    });
                }
            }
            this.layers = this.layers.filter(l => l.name !== layerName);
            this.plugin.deselectAll();
        }
    }

    setLayers(layersData) {
        if (!layersData || layersData.length === 0) {
            this.layers = [
                { name: 'Foreground', visible: true, locked: false },
                { name: 'Gameplay', visible: true, locked: false },
                { name: 'Background', visible: true, locked: false },
            ];
        } else {
            this.layers = layersData;
        }
        const activeLayerExists = this.layers.some(l => l.name === this.activeLayerName);
        if (!activeLayerExists) {
            const firstUnlockedLayer = this.layers.find(l => !l.locked);
            this.activeLayerName = firstUnlockedLayer ? firstUnlockedLayer.name : (this.layers[0] ? this.layers[0].name : null);
        }
        this.plugin.updateLayerStates(this.layers);
        this.buildLayerPanel();
    }

    // =================================================================
    // Tilemap Editor
    // =================================================================
    openTilemapEditor = () => {
        if (!this.tilemapEditorOverlay) return;
        this.game.input.enabled = false;
        this.buildTilemapList();
        this.selectTilemap(null);
        this.tilemapEditorOverlay.style.display = 'flex';
    }

    closeTilemapEditor = () => {
        if (!this.tilemapEditorOverlay) return;
        this.tilemapEditorOverlay.style.display = 'none';
        this.game.input.enabled = true;
    }

    buildTilemapList() {
        if (!this.tilemapListContainer) return;
        this.tilemapListContainer.innerHTML = '';
        const assetList = this.game.registry.get('asset_list');
        const tilemapAssets = assetList.filter(asset => asset.type === 'tilemap');

        if (tilemapAssets.length === 0) {
            this.tilemapListContainer.innerText = 'No tilemaps found.';
            return;
        }

        tilemapAssets.forEach(asset => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'tilemap-list-item';
            itemDiv.innerText = asset.key;
            itemDiv.dataset.tilemapKey = asset.key;
            itemDiv.addEventListener('click', () => {
                this.tilemapListContainer.querySelectorAll('.tilemap-list-item.active').forEach(el => el.classList.remove('active'));
                itemDiv.classList.add('active');
                this.selectTilemap(asset.key);
            });
            this.tilemapListContainer.appendChild(itemDiv);
        });
    }

    selectTilemap(tilemapKey) {
        if (!this.tilemapPreviewContent || !this.selectedTilemapName) return;
        this.selectedTilemapKey = tilemapKey;
        this.tilemapPreviewContent.innerHTML = '';

        if (!tilemapKey) {
            this.selectedTilemapName.innerText = 'No tilemap selected';
            return;
        }

        this.selectedTilemapName.innerText = `Selected: ${tilemapKey}`;
        const assetList = this.game.registry.get('asset_list');
        const assetInfo = assetList.find(asset => asset.key === tilemapKey && asset.type === 'tilemap');

        if (!assetInfo || !assetInfo.path) {
            this.tilemapPreviewContent.innerHTML = `Error: Asset path not found for '${tilemapKey}'.`;
            return;
        }

        const newImgElement = document.createElement('img');
        newImgElement.src = assetInfo.path;
        newImgElement.style.display = 'block';
        newImgElement.style.maxWidth = 'none';
        newImgElement.draggable = false;
        this.tilemapPreviewContent.appendChild(newImgElement);
        this.initCropSelection();
    }

    initCropSelection() {
        this.cropRect = { x: 0, y: 0, width: 0, height: 0 };
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        const previewWrapper = this.tilemapPreviewContent.parentElement;
        const selectionBox = document.createElement('div');
        selectionBox.style.position = 'absolute';
        selectionBox.style.border = '2px dashed #00ffff';
        selectionBox.style.pointerEvents = 'none';
        this.tilemapPreviewContent.appendChild(selectionBox);

        const scaleManager = this.game.scale;
        const scaleX = scaleManager.baseSize.width / scaleManager.width;
        const scaleY = scaleManager.baseSize.height / scaleManager.height;

        const getScaledCoordinates = (event) => {
            const x = event.offsetX * scaleX;
            const y = event.offsetY * scaleY;
            return { x, y };
        };

        this.tilemapPreviewContent.onpointerdown = (e) => {
            isDragging = true;
            previewWrapper.style.overflow = 'hidden';
            const coords = getScaledCoordinates(e);
            startX = coords.x;
            startY = coords.y;
            selectionBox.style.left = startX + 'px';
            selectionBox.style.top = startY + 'px';
            selectionBox.style.width = '0px';
            selectionBox.style.height = '0px';
            e.preventDefault();
        };

        this.tilemapPreviewContent.onpointermove = (e) => {
            if (!isDragging) return;
            const coords = getScaledCoordinates(e);
            const currentX = coords.x;
            const currentY = coords.y;
            const x = Math.min(startX, currentX);
            const y = Math.min(startY, currentY);
            const width = Math.abs(startX - currentX);
            const height = Math.abs(startY - currentY);
            selectionBox.style.left = x + 'px';
            selectionBox.style.top = y + 'px';
            selectionBox.style.width = width + 'px';
            selectionBox.style.height = height + 'px';
            this.cropRect = { x, y, width, height };
        };

        const stopDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            previewWrapper.style.overflow = 'auto';
        };

        this.tilemapPreviewContent.onpointerup = stopDrag;
        this.tilemapPreviewContent.onpointerleave = stopDrag;
    }

    onCropAndPlace = () => {
        if (!this.selectedTilemapKey) {
            alert('Please select a tilemap first.');
            return;
        }
        if (!this.cropRect || this.cropRect.width < 1 || this.cropRect.height < 1) {
            alert('Please drag a rectangle on the tilemap to select an area.');
            return;
        }
        this.plugin.placeCroppedTilemap(this.selectedTilemapKey, this.cropRect);
        this.closeTilemapEditor();
    }

    // =================================================================
    // Global Mode & Input
    // =================================================================
    setGlobalEditorMode(mode) {
        if (this.plugin.currentMode === mode) return;
        this.plugin.currentMode = mode;
        this.game.registry.set('editor_mode', mode);

        if (mode === 'play') {
            this.plugin.setAllObjectsDraggable(false);
        } else {
            this.plugin.setAllObjectsDraggable(true);
        }
        if (this.modeToggle) this.modeToggle.checked = (mode === 'play');
        if (this.modeLabel) this.modeLabel.textContent = (mode === 'play') ? 'Play Mode' : 'Select Mode';
    }

    setEditorMode(mode) {
        if (this.currentEditorMode === mode) return;
        this.currentEditorMode = mode;

        if (mode === 'tilemap') {
            document.body.classList.add('tilemap-mode');
            this.tilemapModeBtn.classList.add('active');
            this.selectModeBtn.classList.remove('active');
            this.initTilesetPanel();
            this.createTileMarker();
        } else {
            document.body.classList.remove('tilemap-mode');
            this.selectModeBtn.classList.add('active');
            this.tilemapModeBtn.classList.remove('active');
            this.destroyTileMarker();
        }
    }

    startListeningToGameInput() {
        if (!this.game || !this.game.input) return;
        this.game.input.off('pointermove', this.onPointerMove, this);
        this.game.input.off('pointerdown', this.onPointerDown, this);
        this.game.input.on('pointermove', this.onPointerMove, this);
        this.game.input.on('pointerdown', this.onPointerDown, this);
    }

    onPointerMove(pointer) {
        if (this.currentEditorMode !== 'tilemap' || !this.tileMarker) return;
        const scene = this.getActiveGameScene();
        if (!scene) return;
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        const tileWidth = this.currentTileset.tileWidth;
        const tileHeight = this.currentTileset.tileHeight;
        const snappedX = Math.floor(worldX / tileWidth) * tileWidth + tileWidth / 2;
        const snappedY = Math.floor(worldY / tileHeight) * tileHeight + tileHeight / 2;
        this.tileMarker.setPosition(snappedX, snappedY);
    }

    onPointerDown(pointer) {
        if (pointer.event.target.closest('#editor-sidebar') ||
            pointer.event.target.closest('#overlay-controls') ||
            pointer.event.target.closest('#bottom-panel')) return;

        if (this.currentEditorMode !== 'tilemap') return;

        const scene = this.getActiveGameScene();
        if (!scene || !this.currentTileset) return;

        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        const tileWidth = this.currentTileset.tileWidth;
        const tileHeight = this.currentTileset.tileHeight;
        const tileX = Math.floor(worldX / tileWidth);
        const tileY = Math.floor(worldY / tileHeight);

        if (typeof scene.placeTile === 'function') {
            scene.placeTile(tileX, tileY, this.selectedTileIndex, this.currentTileset.key, true);
        }
        setTimeout(() => {
            if (!this.plugin.selectedObject && (!this.plugin.selectedObjects || this.plugin.selectedObjects.length === 0)) {
                this.plugin.deselectAll();
            }
        }, 0);
    }

    startRangeFillDrag(sourceObject) {
        this.rangeFillSourceObject = sourceObject;
        this.game.canvas.style.cursor = 'crosshair';

        const onDragMove = (event) => { event.preventDefault(); };
        const onMouseUp = (event) => {
            const scene = this.getActiveGameScene();
            if (scene && typeof scene.fillObjectRange === 'function') {
                const canvasRect = this.game.canvas.getBoundingClientRect();
                const canvasX = event.clientX - canvasRect.left;
                const canvasY = event.clientY - canvasRect.top;
                const worldPoint = scene.cameras.main.getWorldPoint(canvasX, canvasY);
                scene.fillObjectRange(this.rangeFillSourceObject, { x: worldPoint.x, y: worldPoint.y });
            }
            this.game.canvas.style.cursor = 'default';
            this.rangeFillSourceObject = null;
            window.removeEventListener('pointermove', onDragMove, true);
            window.removeEventListener('pointerup', onMouseUp, true);
        };
        window.addEventListener('pointermove', onDragMove, true);
        window.addEventListener('pointerup', onMouseUp, true);
    }

    // =================================================================
    // Helpers
    // =================================================================
    createPauseToggle() {
        const modeControls = document.getElementById('editor-mode-controls');
        if (modeControls) {
            const pauseButton = document.createElement('button');
            pauseButton.id = 'editor-pause-btn';
            pauseButton.innerText = '⏸️ Pause';
            pauseButton.style.marginLeft = '20px';
            pauseButton.style.padding = '5px 10px';
            pauseButton.style.border = '1px solid #777';
            pauseButton.style.backgroundColor = '#555';
            pauseButton.style.color = '#eee';
            pauseButton.style.borderRadius = '5px';
            pauseButton.style.cursor = 'pointer';
            pauseButton.style.fontSize = '14px';

            pauseButton.addEventListener('click', () => {
                const timeManager = EngineAPI.timeManager;
                if (!timeManager) return;
                const isCurrentlyStopped = timeManager.isTimeStopped;
                if (isCurrentlyStopped) EngineAPI.resumeTime();
                else EngineAPI.stopTime();

                if (!isCurrentlyStopped) {
                    pauseButton.innerText = '▶️ Play';
                    pauseButton.style.backgroundColor = '#2a9d8f';
                } else {
                    pauseButton.innerText = '⏸️ Pause';
                    pauseButton.style.backgroundColor = '#555';
                }
            });
            modeControls.appendChild(pauseButton);
        }
    }

    createHelpButton() {
        const buttonContainer = document.querySelector('#asset-browser .panel-header-buttons');
        if (buttonContainer) {
            const helpButton = document.createElement('button');
            helpButton.innerText = '?';
            helpButton.title = 'Open Help Manual';
            helpButton.addEventListener('click', () => this.openHelpModal());
            buttonContainer.appendChild(helpButton);
        }
    }

    async openHelpModal() {
        if (!this.helpModal || !this.helpModalContent) return;
        this.game.input.enabled = false;
        this.helpModal.style.display = 'flex';
        try {
            const response = await fetch('manual.html');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const htmlContent = await response.text();
            this.helpModalContent.innerHTML = htmlContent;
        } catch (error) {
            this.helpModalContent.innerHTML = `<p style="color: red;">Error loading help content: ${error.message}</p>`;
        }
    }

    closeHelpModal() {
        if (!this.helpModal) return;
        this.game.input.enabled = true;
        this.helpModal.style.display = 'none';
    }

    onSaveSceneClicked = () => {
        if (this.plugin) {
            this.plugin.exportScene();
        }
    }

    setupPanButton(button, dx, dy) {
        if (!button) return;
        let intervalId = null;
        const startPanning = () => {
            if (intervalId) return;
            this.plugin.panCamera(dx, dy);
            intervalId = setInterval(() => {
                this.plugin.panCamera(dx, dy);
            }, 50);
        };
        const stopPanning = () => {
            clearInterval(intervalId);
            intervalId = null;
        };
        button.addEventListener('mousedown', startPanning);
        button.addEventListener('mouseup', stopPanning);
        button.addEventListener('mouseleave', stopPanning);
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startPanning();
        });
        button.addEventListener('touchend', stopPanning);
        button.addEventListener('touchcancel', stopPanning);
    }


    // =================================================================
    // Global Mode & Input
    // =================================================================
    setGlobalEditorMode(mode) {
        if (this.plugin.currentMode === mode) return;
        this.plugin.currentMode = mode;
        this.game.registry.set('editor_mode', mode);

        if (mode === 'play') {
            this.plugin.setAllObjectsDraggable(false);
        } else {
            this.plugin.setAllObjectsDraggable(true);
        }
        if (this.modeToggle) this.modeToggle.checked = (mode === 'play');
        if (this.modeLabel) this.modeLabel.textContent = (mode === 'play') ? 'Play Mode' : 'Select Mode';
    }

    setEditorMode(mode) {
        if (this.currentEditorMode === mode) return;
        this.currentEditorMode = mode;

        if (mode === 'tilemap') {
            document.body.classList.add('tilemap-mode');
            this.tilemapModeBtn.classList.add('active');
            this.selectModeBtn.classList.remove('active');
            this.initTilesetPanel();
            this.createTileMarker();
        } else {
            document.body.classList.remove('tilemap-mode');
            this.selectModeBtn.classList.add('active');
            this.tilemapModeBtn.classList.remove('active');
            this.destroyTileMarker();
        }
    }

    startListeningToGameInput() {
        if (!this.game || !this.game.input) return;
        this.game.input.off('pointermove', this.onPointerMove, this);
        this.game.input.off('pointerdown', this.onPointerDown, this);
        this.game.input.on('pointermove', this.onPointerMove, this);
        this.game.input.on('pointerdown', this.onPointerDown, this);
    }

    onPointerMove(pointer) {
        if (this.currentEditorMode !== 'tilemap' || !this.tileMarker) return;
        const scene = this.getActiveGameScene();
        if (!scene) return;
        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        const tileWidth = this.currentTileset.tileWidth;
        const tileHeight = this.currentTileset.tileHeight;
        const snappedX = Math.floor(worldX / tileWidth) * tileWidth + tileWidth / 2;
        const snappedY = Math.floor(worldY / tileHeight) * tileHeight + tileHeight / 2;
        this.tileMarker.setPosition(snappedX, snappedY);
    }

    onPointerDown(pointer) {
        if (pointer.event.target.closest('#editor-sidebar') ||
            pointer.event.target.closest('#overlay-controls') ||
            pointer.event.target.closest('#bottom-panel')) return;

        if (this.currentEditorMode !== 'tilemap') return;

        const scene = this.getActiveGameScene();
        if (!scene || !this.currentTileset) return;

        const worldX = pointer.worldX;
        const worldY = pointer.worldY;
        const tileWidth = this.currentTileset.tileWidth;
        const tileHeight = this.currentTileset.tileHeight;
        const tileX = Math.floor(worldX / tileWidth);
        const tileY = Math.floor(worldY / tileHeight);

        if (typeof scene.placeTile === 'function') {
            scene.placeTile(tileX, tileY, this.selectedTileIndex, this.currentTileset.key, true);
        }
        setTimeout(() => {
            if (!this.plugin.selectedObject && (!this.plugin.selectedObjects || this.plugin.selectedObjects.length === 0)) {
                this.plugin.deselectAll();
            }
        }, 0);
    }

    startRangeFillDrag(sourceObject) {
        this.rangeFillSourceObject = sourceObject;
        this.game.canvas.style.cursor = 'crosshair';

        const onDragMove = (event) => { event.preventDefault(); };
        const onMouseUp = (event) => {
            const scene = this.getActiveGameScene();
            if (scene && typeof scene.fillObjectRange === 'function') {
                const canvasRect = this.game.canvas.getBoundingClientRect();
                const canvasX = event.clientX - canvasRect.left;
                const canvasY = event.clientY - canvasRect.top;
                const worldPoint = scene.cameras.main.getWorldPoint(canvasX, canvasY);
                scene.fillObjectRange(this.rangeFillSourceObject, { x: worldPoint.x, y: worldPoint.y });
            }
            this.game.canvas.style.cursor = 'default';
            this.rangeFillSourceObject = null;
            window.removeEventListener('pointermove', onDragMove, true);
            window.removeEventListener('pointerup', onMouseUp, true);
        };
        window.addEventListener('pointermove', onDragMove, true);
        window.addEventListener('pointerup', onMouseUp, true);
    }

    // =================================================================
    // Helpers
    // =================================================================
    createPauseToggle() {
        const modeControls = document.getElementById('editor-mode-controls');
        if (modeControls) {
            const pauseButton = document.createElement('button');
            pauseButton.id = 'editor-pause-btn';
            pauseButton.innerText = '⏸️ Pause';
            pauseButton.style.marginLeft = '20px';
            pauseButton.style.padding = '5px 10px';
            pauseButton.style.border = '1px solid #777';
            pauseButton.style.backgroundColor = '#555';
            pauseButton.style.color = '#eee';
            pauseButton.style.borderRadius = '5px';
            pauseButton.style.cursor = 'pointer';
            pauseButton.style.fontSize = '14px';

            pauseButton.addEventListener('click', () => {
                const timeManager = EngineAPI.timeManager;
                if (!timeManager) return;
                const isCurrentlyStopped = timeManager.isTimeStopped;
                if (isCurrentlyStopped) EngineAPI.resumeTime();
                else EngineAPI.stopTime();

                if (!isCurrentlyStopped) {
                    pauseButton.innerText = '▶️ Play';
                    pauseButton.style.backgroundColor = '#2a9d8f';
                } else {
                    pauseButton.innerText = '⏸️ Pause';
                    pauseButton.style.backgroundColor = '#555';
                }
            });
            modeControls.appendChild(pauseButton);
        }
    }

    createHelpButton() {
        const buttonContainer = document.querySelector('#asset-browser .panel-header-buttons');
        if (buttonContainer) {
            const helpButton = document.createElement('button');
            helpButton.innerText = '?';
            helpButton.title = 'Open Help Manual';
            helpButton.addEventListener('click', () => this.openHelpModal());
            buttonContainer.appendChild(helpButton);
        }
    }

    async openHelpModal() {
        if (!this.helpModal || !this.helpModalContent) return;
        this.game.input.enabled = false;
        this.helpModal.style.display = 'flex';
        try {
            const response = await fetch('manual.html');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const htmlContent = await response.text();
            this.helpModalContent.innerHTML = htmlContent;
        } catch (error) {
            this.helpModalContent.innerHTML = `<p style="color: red;">Error loading help content: ${error.message}</p>`;
        }
    }

    closeHelpModal() {
        if (!this.helpModal) return;
        this.game.input.enabled = true;
        this.helpModal.style.display = 'none';
    }

    setupPanButton(button, dx, dy) {
        if (!button) return;
        let intervalId = null;
        const startPanning = () => {
            if (intervalId) return;
            this.plugin.panCamera(dx, dy);
            intervalId = setInterval(() => {
                this.plugin.panCamera(dx, dy);
            }, 50);
        };
        const stopPanning = () => {
            clearInterval(intervalId);
            intervalId = null;
        };
        button.addEventListener('mousedown', startPanning);
        button.addEventListener('mouseup', stopPanning);
        button.addEventListener('mouseleave', stopPanning);
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startPanning();
        });
        button.addEventListener('touchend', stopPanning);
        button.addEventListener('touchcancel', stopPanning);
    }

    // =================================================================
    // VSL Editor
    // =================================================================
    openEventEditor(selectedObject) {
        if (!this.eventEditorOverlay || !selectedObject) return;
        this.game.input.enabled = false;
        this.editingObject = selectedObject;
        if (this.eventEditorTitle) this.eventEditorTitle.innerText = `イベント編集: ${this.editingObject.name}`;
        this.buildVslTabs();
        const events = this.editingObject.getData('events') || [];
        this.setActiveVslEvent(events.length > 0 ? events[0].id : null);
        this.eventEditorOverlay.style.display = 'flex';
    }

    closeEventEditor = () => {
        if (!this.eventEditorOverlay) return;
        this.eventEditorOverlay.style.display = 'none';
        this.editingObject = null;
        this.game.input.enabled = true;
        if (this.plugin) this.plugin.pluginManager.game.input.enabled = true;
    }

    buildVslTabs() {
        if (!this.vslTabs) return;
        this.vslTabs.innerHTML = '';
        const events = this.editingObject.getData('events') || [];
        events.forEach(eventData => {
            const tabButton = document.createElement('button');
            tabButton.className = 'vsl-tab-button';
            tabButton.innerText = eventData.trigger || 'Event';
            if (this.activeEventId === eventData.id) tabButton.classList.add('active');
            tabButton.addEventListener('click', () => this.setActiveVslEvent(eventData.id));
            this.vslTabs.appendChild(tabButton);
        });

        const addButton = document.createElement('button');
        addButton.className = 'vsl-add-event-button';
        addButton.innerText = '+';
        addButton.addEventListener('click', () => {
            const currentEvents = this.editingObject.getData('events') || [];
            const newEvent = { id: `event_${Date.now()}`, trigger: 'onClick', nodes: [], connections: [] };
            currentEvents.push(newEvent);
            this.editingObject.setData('events', currentEvents);
            this.buildVslTabs();
            this.setActiveVslEvent(newEvent.id);
        });
        this.vslTabs.appendChild(addButton);

        const systemScene = this.game.scene.getScene('SystemScene');
        if (this.activeEventId && this.activeEventData) {
            const copyButton = document.createElement('button');
            copyButton.className = 'vsl-tool-button';
            copyButton.innerText = '📋';
            copyButton.addEventListener('click', () => {
                const clonedData = this.cloneEventDataWithNewIds(this.activeEventData);
                systemScene.eventClipboard = clonedData;
                this.buildVslTabs();
            });
            this.vslTabs.appendChild(copyButton);
        }

        if (systemScene && systemScene.eventClipboard) {
            const pasteButton = document.createElement('button');
            pasteButton.className = 'vsl-tool-button';
            pasteButton.innerText = '📄';
            pasteButton.addEventListener('click', () => {
                const dataToPaste = this.cloneEventDataWithNewIds(systemScene.eventClipboard);
                const currentEvents = this.editingObject.getData('events') || [];
                currentEvents.push(dataToPaste);
                this.editingObject.setData('events', currentEvents);
                this.buildVslTabs();
                this.setActiveVslEvent(dataToPaste.id);
            });
            this.vslTabs.appendChild(pasteButton);
        }
    }

    setActiveVslEvent(eventId) {
        this.activeEventId = eventId;
        const events = this.editingObject.getData('events') || [];
        this.activeEventData = events.find(e => e.id === eventId) || null;
        this.populateVslToolbar(this.activeEventData);
        this.populateVslCanvas(this.activeEventData);
        this.populateVslTriggerEditor(this.activeEventData);
        this.buildVslTabs();
    }

    populateVslToolbar(activeEvent) {
        if (!this.vslNodeList) return;
        this.vslNodeList.innerHTML = '';
        if (!activeEvent) return;

        const eventTagHandlers = this.game.registry.get('eventTagHandlers');
        if (eventTagHandlers) {
            const tagNames = Object.keys(eventTagHandlers).sort();
            for (const tagName of tagNames) {
                const button = document.createElement('button');
                button.className = 'node-add-button';
                button.innerText = `[${tagName}]`;
                button.addEventListener('click', () => this.addNodeToEventData(tagName, activeEvent));
                this.vslNodeList.appendChild(button);
            }
        } else {
            this.vslNodeList.innerHTML = '<p>Event Handlers not found.</p>';
        }
    }

    addNodeToEventData(tagName, targetVslData) {
        if (!this.editingObject || !targetVslData) return;
        const NODE_AVERAGE_HEIGHT = 150;
        const NODE_MARGIN_Y = 20;
        let newX = 50;
        let newY = 50;

        if (targetVslData.nodes && targetVslData.nodes.length > 0) {
            const lowestPoint = Math.max(...targetVslData.nodes.map(n => n.y + NODE_AVERAGE_HEIGHT));
            newY = lowestPoint + NODE_MARGIN_Y;
        }

        const newNode = { id: `node_${Date.now()}`, type: tagName, params: {}, x: newX, y: newY };
        const eventTagHandlers = this.game.registry.get('eventTagHandlers');
        const handler = eventTagHandlers?.[tagName];
        if (handler?.define?.params) {
            handler.define.params.forEach(paramDef => {
                if (paramDef.defaultValue !== undefined) newNode.params[paramDef.key] = paramDef.defaultValue;
            });
        }

        if (!targetVslData.nodes) targetVslData.nodes = [];
        targetVslData.nodes.push(newNode);

        const isSmEditor = this.smEditorOverlay.style.display === 'flex';
        if (isSmEditor) {
            this.editingObject.setData('stateMachine', this.stateMachineData);
            this.displayActiveVslEditor();
        } else {
            const allEvents = this.editingObject.getData('events');
            this.editingObject.setData('events', allEvents);
            this.setActiveVslEvent(this.activeEventId);
        }
    }

    populateVslTriggerEditor(activeEvent) {
        const select = document.getElementById('vsl-trigger-select');
        const contextContainer = document.getElementById('vsl-trigger-context');
        if (!select || !contextContainer || !this.editingObject) return;

        if (!activeEvent) {
            select.innerHTML = '';
            contextContainer.innerHTML = '';
            return;
        }

        select.innerHTML = '';
        const availableTriggers = ['onClick', 'onReady', 'onCollide_Start', 'onStomp', 'onHit', 'onOverlap_Start', 'onOverlap_End', 'onStateChange', 'onInteract', 'REQUEST_PRESS', 'REQUEST_PRESENT', 'SCENE_CHANGED'];
        availableTriggers.forEach(triggerName => {
            const option = document.createElement('option');
            option.value = triggerName;
            option.innerText = triggerName;
            if (triggerName === activeEvent.trigger) option.selected = true;
            select.appendChild(option);
        });

        select.onchange = () => {
            activeEvent.trigger = select.value;
            delete activeEvent.targetGroup;
            delete activeEvent.condition;
            const allEvents = this.editingObject.getData('events');
            this.editingObject.setData('events', allEvents);
            this.buildVslTabs();
            this.populateVslTriggerEditor(activeEvent);
        };

        contextContainer.innerHTML = '';
        if (['onCollide_Start', 'onStomp', 'onHit', 'onOverlap_Start', 'onOverlap_End'].includes(activeEvent.trigger)) {
            const label = document.createElement('label');
            label.innerText = '相手のグループ: ';
            const input = document.createElement('input');
            input.type = 'text';
            input.value = activeEvent.targetGroup || '';
            input.onchange = () => {
                activeEvent.targetGroup = input.value;
                const allEvents = this.editingObject.getData('events');
                this.editingObject.setData('events', allEvents);
            };
            contextContainer.append(label, input);
        } else if (['onStateChange', 'onDirectionChange'].includes(activeEvent.trigger)) {
            const label = document.createElement('label');
            label.innerText = '条件(Condition): ';
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = "e.g., state === 'walk'";
            input.value = activeEvent.condition || '';
            input.onchange = () => {
                activeEvent.condition = input.value;
                const allEvents = this.editingObject.getData('events');
                this.editingObject.setData('events', allEvents);
            };
            contextContainer.append(label, input);
        }
    }

    buildNodeContent(nodeElement, nodeData) {
        nodeElement.innerHTML = '';
        const eventTagHandlers = this.game.registry.get('eventTagHandlers');
        const handler = eventTagHandlers ? eventTagHandlers[nodeData.type] : null;
        const pinDefine = handler?.define?.pins;

        const inputsContainer = document.createElement('div');
        inputsContainer.className = 'vsl-pins-container inputs';
        const inputPins = pinDefine?.inputs || [{ name: 'input' }];
        inputPins.forEach(pinDef => {
            const pinWrapper = document.createElement('div');
            pinWrapper.className = 'vsl-pin-wrapper';
            const pinElement = document.createElement('div');
            pinElement.className = 'vsl-node-pin input';
            pinElement.dataset.pinType = 'input';
            pinElement.dataset.pinName = pinDef.name;
            const pinLabel = document.createElement('span');
            pinLabel.className = 'pin-label';
            if (pinDef.label) pinLabel.innerText = pinDef.label;
            pinWrapper.append(pinElement, pinLabel);
            inputsContainer.appendChild(pinWrapper);
        });
        nodeElement.appendChild(inputsContainer);

        const centerContent = document.createElement('div');
        centerContent.className = 'vsl-node-content';
        const title = document.createElement('strong');
        title.innerText = `[${nodeData.type}]`;
        const paramsContainer = document.createElement('div');
        paramsContainer.className = 'node-params';

        if (handler && handler.define && Array.isArray(handler.define.params)) {
            if (nodeData.type === 'call_component_method') {
                const componentSelectRow = this.createNodeComponentSelect(paramsContainer, nodeData, 'component', 'コンポーネント名');
                const componentSelect = componentSelectRow.querySelector('select');
                this.createNodeComponentMethodSelect(paramsContainer, nodeData, 'method', 'メソッド名');
                this.createNodeTextInput(paramsContainer, nodeData, 'target', '対象オブジェクト', 'self');
                this.createNodeTextInput(paramsContainer, nodeData, 'params', '引数(JSON)', '[]');
                componentSelect.addEventListener('change', () => {
                    if (!nodeData.params) nodeData.params = {};
                    nodeData.params.component = componentSelect.value;
                    nodeData.params.method = null;
                    this.buildNodeContent(nodeElement, nodeData);
                });
            } else {
                handler.define.params.forEach(paramDef => {
                    switch (paramDef.type) {
                        case 'game_flow_event_select': this.createNodeGameFlowEventSelect(paramsContainer, nodeData, paramDef.key, paramDef.label); break;
                        case 'component_select': this.createNodeComponentSelect(paramsContainer, nodeData, paramDef.key, paramDef.label); break;
                        case 'asset_key': this.createNodeAssetSelectInput(paramsContainer, nodeData, paramDef.key, paramDef.label, paramDef); break;
                        case 'select': this.createNodeSelectInput(paramsContainer, nodeData, paramDef.key, paramDef.label, paramDef.defaultValue, paramDef.options); break;
                        case 'number': this.createNodeNumberInput(paramsContainer, nodeData, paramDef.key, paramDef.label, paramDef.defaultValue); break;
                        default: this.createNodeTextInput(paramsContainer, nodeData, paramDef.key, paramDef.label, paramDef.defaultValue); break;
                    }
                });
            }
        }

        this.createNodePositionInput(paramsContainer, nodeData, 'x');
        this.createNodePositionInput(paramsContainer, nodeData, 'y');

        const deleteButton = document.createElement('button');
        deleteButton.innerText = '削除';
        deleteButton.className = 'node-delete-button';
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`ノード [${nodeData.type}] を削除しますか？`)) this.deleteNode(nodeData.id);
        });

        centerContent.append(title, paramsContainer, deleteButton);
        nodeElement.appendChild(centerContent);

        const outputsContainer = document.createElement('div');
        outputsContainer.className = 'vsl-pins-container outputs';
        const outputPins = pinDefine?.outputs || [{ name: 'output' }];
        outputPins.forEach(pinDef => {
            const pinWrapper = document.createElement('div');
            pinWrapper.className = 'vsl-pin-wrapper';
            const pinElement = document.createElement('div');
            pinElement.className = 'vsl-node-pin output';
            pinElement.dataset.pinType = 'output';
            pinElement.dataset.pinName = pinDef.name;
            const pinLabel = document.createElement('span');
            pinLabel.className = 'pin-label';
            if (pinDef.label) pinLabel.innerText = pinDef.label;
            pinWrapper.append(pinLabel, pinElement);
            outputsContainer.appendChild(pinWrapper);
        });
        nodeElement.appendChild(outputsContainer);
    }

    createNodeGameFlowEventSelect(parent, nodeData, key, label) {
        const row = document.createElement('div');
        row.className = 'node-param-row';
        const labelElement = document.createElement('label');
        labelElement.innerText = label;
        const select = document.createElement('select');
        const gameFlowData = this.game.cache.json.get('game_flow');
        if (gameFlowData && gameFlowData.states) {
            const eventSet = new Set();
            Object.values(gameFlowData.states).forEach(stateDef => {
                if (stateDef.transitions) stateDef.transitions.forEach(transition => eventSet.add(transition.event));
            });
            const events = Array.from(eventSet).sort();
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.innerText = 'イベントを選択...';
            select.appendChild(emptyOption);
            events.forEach(eventName => {
                const option = document.createElement('option');
                option.value = eventName;
                option.innerText = eventName;
                select.appendChild(option);
            });
        } else {
            const errorOption = document.createElement('option');
            errorOption.value = '';
            errorOption.innerText = 'game_flow.jsonが見つかりません';
            select.appendChild(errorOption);
            select.disabled = true;
        }
        const currentValue = nodeData.params?.[key] || '';
        select.value = currentValue;
        select.addEventListener('change', (e) => {
            if (!nodeData.params) nodeData.params = {};
            nodeData.params[key] = e.target.value;
        });
        row.append(labelElement, select);
        parent.appendChild(row);
        return row;
    }

    createNodeComponentMethodSelect(container, nodeData, paramKey, label) {
        const row = document.createElement('div');
        row.className = 'node-param-row';
        const labelEl = document.createElement('label');
        labelEl.innerText = `${label}: `;
        const select = document.createElement('select');
        const selectedComponent = nodeData.params?.component;
        if (!selectedComponent) {
            select.disabled = true;
            select.innerHTML = '<option>コンポーネントを先に選択</option>';
        } else {
            const componentRegistry = this.game.registry.get('ComponentRegistry');
            const componentClass = componentRegistry?.[selectedComponent];
            const methods = componentClass?.define?.methods || [];
            if (methods.length === 0) select.innerHTML = '<option>公開メソッドなし</option>';
            else select.innerHTML = '<option value="">Select Method...</option>';
            methods.forEach(methodName => {
                const option = document.createElement('option');
                option.value = methodName;
                option.innerText = methodName;
                if (nodeData.params?.[paramKey] === methodName) option.selected = true;
                select.appendChild(option);
            });
        }
        select.addEventListener('change', () => {
            if (this.plugin) {
                const isSmEditor = this.smEditorOverlay.style.display === 'flex';
                if (isSmEditor) this.plugin.updateStateMachineNodeParam(nodeData, paramKey, select.value, false);
                else this.plugin.updateNodeParam(nodeData, paramKey, select.value, false);
            }
        });
        row.append(labelEl, select);
        container.appendChild(row);
        return row;
    }

    createNodePositionInput(container, nodeData, key) {
        this.createNodeSliderInput(container, key.toUpperCase(), Math.round(nodeData[key]), 0, 4000, 1, (value) => {
            // Update node data directly
            nodeData[key] = value;

            // Save to object data
            const isSmEditor = this.smEditorOverlay.style.display === 'flex';
            if (isSmEditor) {
                this.editingObject.setData('stateMachine', this.stateMachineData);
            } else {
                const allEvents = this.editingObject.getData('events');
                this.editingObject.setData('events', allEvents);
            }

            // Update the node wrapper position immediately
            const canvasEl = isSmEditor ? this.smEditorOverlay.querySelector('.sm-vsl-canvas') : this.vslCanvas;
            if (canvasEl) {
                const nodeWrapper = canvasEl.querySelector(`.vsl-node-wrapper [data-node-id="${nodeData.id}"]`)?.parentElement;
                if (nodeWrapper && nodeWrapper.classList.contains('vsl-node-wrapper')) {
                    nodeWrapper.style.left = `${nodeData.x}px`;
                    nodeWrapper.style.top = `${nodeData.y}px`;

                    // Redraw connections
                    const svgLayer = canvasEl.querySelector('#vsl-svg-layer');
                    const targetVslData = isSmEditor ? this.activeVslData : this.editingObject.getData('events')?.find(e => e.id === this.activeEventId);
                    if (svgLayer && targetVslData && targetVslData.connections) {
                        this.drawConnections(svgLayer, targetVslData.nodes, targetVslData.connections);
                    }
                }
            }
        });
    }

    createNodeTextInput(container, nodeData, paramKey, label, defaultValue) {
        const row = document.createElement('div');
        row.className = 'node-param-row';
        const labelEl = document.createElement('label');
        labelEl.innerText = `${label}: `;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = nodeData.params?.[paramKey] ?? defaultValue ?? '';
        input.addEventListener('input', () => {
            if (!this.plugin) return;
            const isSmEditor = this.smEditorOverlay.style.display === 'flex';
            if (isSmEditor) this.plugin.updateStateMachineNodeParam(nodeData, paramKey, input.value, false);
            else this.plugin.updateNodeParam(nodeData, paramKey, input.value, false);
        });
        row.append(labelEl, input);
        container.appendChild(row);
    }

    createNodeNumberInput(container, nodeData, paramKey, label, defaultValue) {
        const row = document.createElement('div');
        row.className = 'node-param-row';
        const labelEl = document.createElement('label');
        labelEl.innerText = `${label}: `;
        const input = document.createElement('input');
        input.type = 'number';
        input.value = nodeData.params?.[paramKey] ?? defaultValue ?? 0;
        input.addEventListener('input', () => {
            if (!this.plugin) return;
            const value = parseFloat(input.value);
            const isSmEditor = this.smEditorOverlay.style.display === 'flex';
            if (!isNaN(value)) {
                if (isSmEditor) this.plugin.updateStateMachineNodeParam(nodeData, paramKey, value, false);
                else this.plugin.updateNodeParam(nodeData, paramKey, value, false);
            }
        });
        row.append(labelEl, input);
        container.appendChild(row);
    }

    createNodeSelectInput(container, nodeData, paramKey, label, defaultValue, options) {
        const row = document.createElement('div');
        row.className = 'node-param-row';
        const labelEl = document.createElement('label');
        labelEl.innerText = `${label}: `;
        const select = document.createElement('select');
        const currentValue = nodeData.params?.[paramKey] ?? defaultValue;
        options.forEach(optValue => {
            const option = document.createElement('option');
            option.value = optValue;
            option.innerText = optValue;
            if (currentValue == optValue) option.selected = true;
            select.appendChild(option);
        });
        select.addEventListener('change', () => {
            if (!this.plugin) return;
            const isSmEditor = this.smEditorOverlay.style.display === 'flex';
            if (isSmEditor) this.plugin.updateStateMachineNodeParam(nodeData, paramKey, select.value, false);
            else this.plugin.updateNodeParam(nodeData, paramKey, select.value, false);
        });
        row.append(labelEl, select);
        container.appendChild(row);
    }

    createNodeComponentSelect(container, nodeData, paramKey, label) {
        const row = document.createElement('div');
        row.className = 'node-param-row';
        const labelEl = document.createElement('label');
        labelEl.innerText = `${label}: `;
        const select = document.createElement('select');
        const componentRegistry = this.game.registry.get('ComponentRegistry');
        if (!componentRegistry) {
            row.innerText = "Error: ComponentRegistry not found.";
            container.appendChild(row);
            return;
        }
        const componentNames = Object.keys(componentRegistry).sort();
        const placeholder = document.createElement('option');
        placeholder.value = "";
        placeholder.innerText = "Select Component...";
        select.appendChild(placeholder);
        componentNames.forEach(compName => {
            const option = document.createElement('option');
            option.value = compName;
            option.innerText = compName;
            if (nodeData.params?.[paramKey] === compName) option.selected = true;
            select.appendChild(option);
        });
        select.addEventListener('change', () => {
            if (!this.plugin) return;
            this.plugin.updateNodeParam(nodeData, paramKey, select.value, false);
        });
        row.append(labelEl, select);
        container.appendChild(row);
        return row;
    }

    createNodeAssetSelectInput(container, nodeData, paramKey, label, paramDef) {
        const row = document.createElement('div');
        row.className = 'node-param-row';
        const labelEl = document.createElement('label');
        labelEl.innerText = `${label}: `;
        const select = document.createElement('select');
        const assetList = this.game.registry.get('asset_list') || [];
        const targetAssetType = paramDef.assetType;
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.innerText = 'アセットを選択...';
        select.appendChild(placeholderOption);
        const currentValue = nodeData.params?.[paramKey] ?? paramDef.defaultValue;
        assetList.forEach(asset => {
            let isMatch = false;
            if (targetAssetType === 'prefab') isMatch = (asset.type === 'prefab' || asset.type === 'GroupPrefab');
            else if (targetAssetType === 'image') isMatch = (asset.type === 'image' || asset.type === 'spritesheet');
            else isMatch = (asset.type === targetAssetType);
            if (!targetAssetType || isMatch) {
                const option = document.createElement('option');
                option.value = asset.key;
                option.innerText = `[${asset.type}] ${asset.key}`;
                if (currentValue === asset.key) option.selected = true;
                select.appendChild(option);
            }
        });
        select.addEventListener('change', () => {
            if (!this.plugin) return;
            const isSmEditor = this.smEditorOverlay.style.display === 'flex';
            if (isSmEditor) this.plugin.updateStateMachineNodeParam(nodeData, paramKey, select.value, false);
            else this.plugin.updateNodeParam(nodeData, paramKey, select.value, false);
        });
        row.append(labelEl, select);
        container.appendChild(row);
    }

    setVslMode(mode) {
        if (this.vslMode === mode) return;
        this.vslMode = mode;
        const selectBtn = document.getElementById('vsl-select-mode-btn');
        const panBtn = document.getElementById('vsl-pan-mode-btn');
        const canvasWrapper = document.getElementById('vsl-canvas-wrapper');
        if (mode === 'pan') {
            selectBtn.classList.remove('active');
            panBtn.classList.add('active');
            canvasWrapper.style.cursor = 'grab';
        } else {
            panBtn.classList.remove('active');
            selectBtn.classList.add('active');
            canvasWrapper.style.cursor = 'default';
        }
    }

    onPinClicked(clickedPin) {
        const pinType = clickedPin.dataset.pinType;
        const pinName = clickedPin.dataset.pinName;
        const parentNode = clickedPin.closest('.vsl-node');
        if (!parentNode || !parentNode.dataset.nodeId) return;
        const nodeId = parentNode.dataset.nodeId;

        if (!this.connectionState.isActive && pinType === 'output') {
            this.connectionState = { isActive: true, fromNodeId: nodeId, fromPinName: pinName, fromPinElement: clickedPin };
            clickedPin.classList.add('is-connecting');
        } else if (this.connectionState.isActive && pinType === 'input') {
            const { fromNodeId, fromPinName } = this.connectionState;
            const toNodeId = nodeId;
            const toPinName = pinName;
            const isSmEditor = this.smEditorOverlay.style.display === 'flex';
            if (isSmEditor) this.createConnection(fromNodeId, fromPinName, toNodeId, toPinName, this.activeVslData);
            else {
                const events = this.editingObject.getData('events');
                const targetEvent = events.find(e => e.id === this.activeEventId);
                this.createConnection(fromNodeId, fromPinName, toNodeId, toPinName, targetEvent);
            }
            if (this.connectionState.fromPinElement) this.connectionState.fromPinElement.classList.remove('is-connecting');
            this.connectionState = { isActive: false };
        } else if (this.connectionState.isActive) {
            if (this.connectionState.fromPinElement) this.connectionState.fromPinElement.classList.remove('is-connecting');
            this.connectionState = { isActive: false };
        }
    }

    createConnection(fromNodeId, fromPinName, toNodeId, toPinName, targetVslData) {
        if (!this.editingObject || !targetVslData || fromNodeId === toNodeId) return;
        if (!targetVslData.connections) targetVslData.connections = [];
        targetVslData.connections = targetVslData.connections.filter(c => !(c.fromNode === fromNodeId && c.fromPin === fromPinName));
        targetVslData.connections.push({ fromNode: fromNodeId, fromPin: fromPinName, toNode: toNodeId, toPin: toPinName });
        const isSmEditor = this.smEditorOverlay.style.display === 'flex';
        if (isSmEditor) this.editingObject.setData('stateMachine', this.stateMachineData);
        else {
            const allEvents = this.editingObject.getData('events');
            this.editingObject.setData('events', allEvents);
        }
        this.populateVslCanvas();
    }

    drawConnections(svgLayer, nodes, connections) {
        const isSmEditor = this.smEditorOverlay.style.display === 'flex';
        const canvasEl = isSmEditor ? this.smEditorOverlay.querySelector('.sm-vsl-canvas') : this.vslCanvas;
        if (!canvasEl || !svgLayer) return;
        const svgRect = svgLayer.getBoundingClientRect();
        svgLayer.innerHTML = '';
        if (!connections || connections.length === 0) return;

        connections.forEach((conn) => {
            const fromNodeEl = canvasEl.querySelector(`[data-node-id="${conn.fromNode}"]`);
            const toNodeEl = canvasEl.querySelector(`[data-node-id="${conn.toNode}"]`);
            if (fromNodeEl && toNodeEl) {
                const fromPinEl = fromNodeEl.querySelector(`[data-pin-type="output"][data-pin-name="${conn.fromPin}"]`);
                const toPinEl = toNodeEl.querySelector(`[data-pin-type="input"][data-pin-name="${conn.toPin}"]`);
                if (fromPinEl && toPinEl) {
                    const fromPinRect = fromPinEl.getBoundingClientRect();
                    const toPinRect = toPinEl.getBoundingClientRect();
                    const startX = (fromPinRect.left + fromPinRect.width / 2) - svgRect.left;
                    const startY = (fromPinRect.top + fromPinRect.height / 2) - svgRect.top;
                    const endX = (toPinRect.left + toPinRect.width / 2) - svgRect.left;
                    const endY = (toPinRect.top + toPinRect.height / 2) - svgRect.top;
                    const dx = Math.abs(startX - endX);
                    const handleOffset = Math.max(50, dx / 2);
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', `M ${startX},${startY} C ${startX + handleOffset},${startY} ${endX - handleOffset},${endY} ${endX},${endY}`);
                    path.setAttribute('fill', 'none');
                    path.setAttribute('stroke', '#888');
                    path.setAttribute('stroke-width', '2');
                    svgLayer.appendChild(path);
                }
            }
        });
    }

    deleteNode(nodeIdToDelete) {
        if (!this.editingObject) return;
        const isSmEditor = this.smEditorOverlay.style.display === 'flex';
        let targetVslData = null;
        if (isSmEditor) {
            if (this.stateMachineData && this.activeStateName && this.activeHookName) {
                targetVslData = this.stateMachineData.states[this.activeStateName]?.[this.activeHookName];
            }
        } else {
            if (this.activeEventId) {
                const events = this.editingObject.getData('events') || [];
                targetVslData = events.find(e => e.id === this.activeEventId);
            }
        }
        if (!targetVslData) return;
        if (targetVslData.nodes) targetVslData.nodes = targetVslData.nodes.filter(n => n.id !== nodeIdToDelete);
        if (targetVslData.connections) targetVslData.connections = targetVslData.connections.filter(c => c.fromNode !== nodeIdToDelete && c.toNode !== nodeIdToDelete);
        if (isSmEditor) {
            this.editingObject.setData('stateMachine', this.stateMachineData);
            this.displayActiveVslEditor();
        } else {
            const allEvents = this.editingObject.getData('events');
            this.editingObject.setData('events', allEvents);
            this.setActiveVslEvent(this.activeEventId);
        }
    }

    _setupNodeDrag(nodeElement, nodeWrapper, nodeData, svgLayer, targetVslData) {
        const nodeHeader = nodeElement.querySelector('.vsl-node-header');
        if (!nodeHeader) return;

        nodeHeader.style.cursor = 'grab';
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const onPointerDown = (e) => {
            if (e.target.closest('.vsl-node-delete-btn') || e.target.closest('input') || e.target.closest('select')) return;

            isDragging = true;
            nodeElement.classList.add('dragging');
            nodeHeader.style.cursor = 'grabbing';

            startX = e.clientX;
            startY = e.clientY;
            initialLeft = parseFloat(nodeWrapper.style.left) || 0;
            initialTop = parseFloat(nodeWrapper.style.top) || 0;

            nodeHeader.setPointerCapture(e.pointerId);
            e.preventDefault();
            e.stopPropagation();
        };

        const onPointerMove = (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            nodeWrapper.style.left = `${initialLeft + dx}px`;
            nodeWrapper.style.top = `${initialTop + dy}px`;

            if (targetVslData && targetVslData.connections) {
                this.drawConnections(svgLayer, targetVslData.nodes, targetVslData.connections);
            }
        };

        const onPointerUp = (e) => {
            if (!isDragging) return;

            isDragging = false;
            nodeElement.classList.remove('dragging');
            nodeHeader.style.cursor = 'grab';
            nodeHeader.releasePointerCapture(e.pointerId);

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            nodeData.x = Math.max(0, initialLeft + dx);
            nodeData.y = Math.max(0, initialTop + dy);

            const xInput = nodeElement.querySelector('.node-slider-row:nth-of-type(1) input[type="number"]');
            const yInput = nodeElement.querySelector('.node-slider-row:nth-of-type(2) input[type="number"]');
            if (xInput) xInput.value = Math.round(nodeData.x);
            if (yInput) yInput.value = Math.round(nodeData.y);

            const isSmEditor = this.smEditorOverlay.style.display === 'flex';
            if (isSmEditor) {
                this.editingObject.setData('stateMachine', this.stateMachineData);
            } else {
                const allEvents = this.editingObject.getData('events');
                this.editingObject.setData('events', allEvents);
            }

            if (targetVslData && targetVslData.connections) {
                this.drawConnections(svgLayer, targetVslData.nodes, targetVslData.connections);
            }
        };

        nodeHeader.addEventListener('pointerdown', onPointerDown);
        nodeHeader.addEventListener('pointermove', onPointerMove);
        nodeHeader.addEventListener('pointerup', onPointerUp);
    }

    populateVslCanvas() {
        const isSmEditor = this.smEditorOverlay.style.display === 'flex';
        const canvasEl = isSmEditor ? this.smEditorOverlay.querySelector('.sm-vsl-canvas') : this.vslCanvas;
        if (!canvasEl) return;
        let targetVslData;
        if (isSmEditor) targetVslData = this.activeVslData;
        else {
            const events = this.editingObject?.getData('events') || [];
            targetVslData = events.find(e => e.id === this.activeEventId);
        }
        canvasEl.innerHTML = '';
        const svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgLayer.id = 'vsl-svg-layer';
        svgLayer.setAttribute('width', '4000');
        svgLayer.setAttribute('height', '4000');
        canvasEl.appendChild(svgLayer);
        if (!targetVslData) return;
        if (targetVslData.nodes) {
            targetVslData.nodes.forEach(nodeData => {
                const nodeWrapper = document.createElement('div');
                nodeWrapper.className = 'vsl-node-wrapper';
                nodeWrapper.style.left = `${nodeData.x}px`;
                nodeWrapper.style.top = `${nodeData.y}px`;
                const nodeElement = document.createElement('div');
                nodeElement.className = 'vsl-node';
                nodeElement.dataset.isNode = 'true';
                nodeElement.dataset.nodeId = nodeData.id;
                this.buildNodeContent(nodeElement, nodeData);
                nodeWrapper.appendChild(nodeElement);
                canvasEl.appendChild(nodeWrapper);

                // Pin click handlers
                nodeElement.querySelectorAll('[data-pin-type]').forEach(pinElement => {
                    pinElement.addEventListener('pointerdown', (event) => {
                        event.stopPropagation();
                        this.onPinClicked(pinElement);
                    });
                });

                // Node drag functionality
                this._setupNodeDrag(nodeElement, nodeWrapper, nodeData, svgLayer, targetVslData);
            });
        }
        requestAnimationFrame(() => {
            if (targetVslData && targetVslData.connections) {
                this.drawConnections(svgLayer, targetVslData.nodes, targetVslData.connections);
            }
        });
    }

    // =================================================================
    // State Machine Editor
    // =================================================================
    openStateMachineEditor = (selectedObject) => {
        if (!this.smEditorOverlay || !selectedObject) return;
        document.body.classList.add('modal-open');
        this.game.input.enabled = false;
        this.editingObject = selectedObject;
        this.smEditorOverlay.style.display = 'flex';
        const title = this.smEditorOverlay.querySelector('#sm-editor-title');
        if (title) title.innerText = `ステートマシン編集: ${this.editingObject.name}`;
        this.stateMachineData = this.editingObject.getData('stateMachine');
        if (!this.stateMachineData) {
            this.stateMachineData = this.getInitialStateMachineData();
            this.editingObject.setData('stateMachine', this.stateMachineData);
        }
        this.activeStateName = this.stateMachineData.initialState;
        this.activeHookName = 'onEnter';
        this.buildStatesPanel();
        this.buildHooksTabs();
        this.displayActiveVslEditor();
        this.setupStateMachineEventListeners();
    }

    getInitialStateMachineData() {
        const defaultStateName = '待機';
        return {
            initialState: defaultStateName,
            states: {
                [defaultStateName]: { onEnter: { nodes: [], connections: [] }, onUpdate: { nodes: [], connections: [] }, onExit: { nodes: [], connections: [] } }
            }
        };
    }

    closeStateMachineEditor = () => {
        if (!this.smEditorOverlay) return;
        this.smEditorOverlay.style.display = 'none';
        this.game.input.enabled = true;
        document.body.classList.remove('modal-open');
        this.smEditorOverlay.querySelector('#sm-add-state-btn')?.removeEventListener('click', this._onAddNewState);
        this.smEditorOverlay.querySelector('#sm-states-list')?.removeEventListener('click', this._onStateClicked);
        this.smEditorOverlay.querySelector('#sm-hooks-tabs')?.removeEventListener('click', this._onHookTabClicked);
        this.editingObject = null;
        this.stateMachineData = null;
        this.activeStateName = null;
        this.activeHookName = null;
        this.activeVslData = null;
    }

    buildStatesPanel() {
        const statesListContainer = this.smEditorOverlay.querySelector('#sm-states-list');
        if (!statesListContainer) return;
        statesListContainer.innerHTML = '';
        const stateNames = Object.keys(this.stateMachineData.states);
        stateNames.forEach(stateName => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'sm-state-item';
            itemDiv.innerText = stateName;
            itemDiv.dataset.stateName = stateName;
            if (this.activeStateName === stateName) itemDiv.classList.add('active');
            statesListContainer.appendChild(itemDiv);
        });
    }

    buildHooksTabs() {
        const hooksTabsContainer = this.smEditorOverlay.querySelector('#sm-hooks-tabs');
        if (!hooksTabsContainer) return;
        hooksTabsContainer.innerHTML = '';
        const hooks = [{ key: 'onEnter', label: '実行時 (onEnter)' }, { key: 'onUpdate', label: '更新時 (onUpdate)' }, { key: 'onExit', label: '終了時 (onExit)' }];
        hooks.forEach(hook => {
            const tabButton = document.createElement('button');
            tabButton.className = 'sm-hook-tab';
            tabButton.innerText = hook.label;
            tabButton.dataset.hookName = hook.key;
            if (this.activeHookName === hook.key) tabButton.classList.add('active');
            hooksTabsContainer.appendChild(tabButton);
        });
    }

    displayActiveVslEditor() {
        const vslContainer = this.smEditorOverlay.querySelector('.sm-vsl-editor-container');
        if (!vslContainer) return;
        let activeState = this.stateMachineData.states[this.activeStateName];
        if (!activeState) {
            this.stateMachineData.states[this.activeStateName] = {};
            activeState = this.stateMachineData.states[this.activeStateName];
        }
        this.activeVslData = activeState[this.activeHookName];
        if (!this.activeVslData) {
            activeState[this.activeHookName] = { nodes: [], connections: [] };
            this.activeVslData = activeState[this.activeHookName];
            this.editingObject.setData('stateMachine', this.stateMachineData);
        }
        this.populateSmVslCanvas();
    }

    setupStateMachineEventListeners() {
        const addStateBtn = this.smEditorOverlay.querySelector('#sm-add-state-btn');
        if (addStateBtn && this._onAddNewState) addStateBtn.removeEventListener('click', this._onAddNewState);
        const statesList = this.smEditorOverlay.querySelector('#sm-states-list');
        if (statesList && this._onStateClicked) statesList.removeEventListener('click', this._onStateClicked);
        const hooksTabs = this.smEditorOverlay.querySelector('#sm-hooks-tabs');
        if (hooksTabs && this._onHookTabClicked) hooksTabs.removeEventListener('click', this._onHookTabClicked);

        this._onAddNewState = () => {
            const newStateName = prompt('新しい状態の名前を入力してください:', `新しい状態${Object.keys(this.stateMachineData.states).length}`);
            if (newStateName && !this.stateMachineData.states[newStateName]) {
                this.stateMachineData.states[newStateName] = { onEnter: { nodes: [], connections: [] }, onUpdate: { nodes: [], connections: [] }, onExit: { nodes: [], connections: [] } };
                this.editingObject.setData('stateMachine', this.stateMachineData);
                this.buildStatesPanel();
            } else if (newStateName) {
                alert('その名前の状態は既に使用されています。');
            }
        };

        this._onStateClicked = (event) => {
            const targetItem = event.target.closest('.sm-state-item');
            if (targetItem) {
                this.activeStateName = targetItem.dataset.stateName;
                this.buildStatesPanel();
                this.displayActiveVslEditor();
            }
        };

        this._onHookTabClicked = (event) => {
            const targetTab = event.target.closest('.sm-hook-tab');
            if (targetTab) {
                this.activeHookName = targetTab.dataset.hookName;
                this.buildHooksTabs();
                this.displayActiveVslEditor();
            }
        };

        if (addStateBtn) addStateBtn.addEventListener('click', this._onAddNewState);
        if (statesList) statesList.addEventListener('click', this._onStateClicked);
        if (hooksTabs) hooksTabs.addEventListener('click', this._onHookTabClicked);
    }

    populateSmVslCanvas = () => {
        const toolbarList = this.smEditorOverlay.querySelector('.sm-vsl-node-list');
        if (toolbarList) {
            toolbarList.innerHTML = '';
            const eventTagHandlers = this.game.registry.get('eventTagHandlers');
            if (eventTagHandlers) {
                const tagNames = Object.keys(eventTagHandlers).sort();
                for (const tagName of tagNames) {
                    const button = document.createElement('button');
                    button.className = 'node-add-button';
                    button.innerText = `[${tagName}]`;
                    button.addEventListener('click', () => this.addNodeToEventData(tagName, this.activeVslData));
                    toolbarList.appendChild(button);
                }
            }
        }
        this.populateVslCanvas();
    }

    // =================================================================
    // Console Panel
    // =================================================================
    switchBottomTab(tabName) {
        // すべてのタブとコンテンツを非アクティブに
        document.querySelectorAll('.bottom-tabs .tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');

        // 選択されたタブをアクティブに
        const selectedTab = document.getElementById(`tab-${tabName}`);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }

        // 対応するコンテンツを表示
        const contentMap = {
            'project': 'project-view',
            'console': 'console-view',
            'animation': 'animation-view'
        };

        const contentId = contentMap[tabName];
        const content = document.getElementById(contentId);
        if (content) {
            content.style.display = 'block';
        }

        // Consoleタブが選択されたときはClearボタンを表示
        if (this.clearConsoleBtn) {
            this.clearConsoleBtn.style.display = tabName === 'console' ? 'block' : 'none';
        }
    }

    initConsoleCapture() {
        // オリジナルのconsoleメソッドを保存
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        // console.logをオーバーライド
        console.log = (...args) => {
            originalLog.apply(console, args);
            this.addConsoleLog('log', args.join(' '));
        };

        // console.warnをオーバーライド
        console.warn = (...args) => {
            originalWarn.apply(console, args);
            this.addConsoleLog('warn', args.join(' '));
        };

        // console.errorをオーバーライド
        console.error = (...args) => {
            originalError.apply(console, args);
            this.addConsoleLog('error', args.join(' '));
        };
    }

    addConsoleLog(level, message) {
        if (!this.consoleLogsContainer) return;

        const logEntry = document.createElement('div');
        logEntry.className = `console-log console-log-${level}`;

        const timestamp = new Date().toLocaleTimeString();
        const icon = {
            'log': 'ℹ️',
            'warn': '⚠️',
            'error': '❌'
        }[level] || 'ℹ️';

        logEntry.innerHTML = `
            <span class="console-timestamp">${timestamp}</span>
            <span class="console-icon">${icon}</span>
            <span class="console-message">${message}</span>
        `;

        this.consoleLogsContainer.appendChild(logEntry);

        // 自動スクロール
        this.consoleLogsContainer.scrollTop = this.consoleLogsContainer.scrollHeight;
    }

    clearConsole() {
        if (this.consoleLogsContainer) {
            this.consoleLogsContainer.innerHTML = '';
        }
    }

    createNodeSliderInput(container, label, initialValue, min, max, step, changeCallback) {
        const row = document.createElement('div');
        row.className = 'node-param-row node-slider-row';
        const labelEl = document.createElement('label');
        labelEl.innerText = `${label}: `;
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min;
        slider.max = max;
        slider.step = step;
        slider.value = initialValue;
        const numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.style.width = '60px';
        numberInput.value = initialValue;
        slider.addEventListener('input', () => {
            const value = parseFloat(slider.value);
            numberInput.value = value;
            changeCallback(value);
        });
        numberInput.addEventListener('change', () => {
            const value = parseFloat(numberInput.value);
            slider.value = value;
            changeCallback(value);
        });
        row.append(labelEl, slider, numberInput);
        container.appendChild(row);
    }

    cloneEventDataWithNewIds(originalEventData) {
        const clonedEvent = JSON.parse(JSON.stringify(originalEventData));
        clonedEvent.id = `event_${Date.now()}`;
        const nodeIdMap = {};
        clonedEvent.nodes.forEach(node => {
            const oldId = node.id;
            const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            node.id = newId;
            nodeIdMap[oldId] = newId;
        });
        if (clonedEvent.connections) {
            clonedEvent.connections.forEach(connection => {
                connection.fromNode = nodeIdMap[connection.fromNode];
                connection.toNode = nodeIdMap[connection.toNode];
            });
        }
        return clonedEvent;
    }
    // =================================================================
    // Scene Save / Load
    // =================================================================
    onSaveSceneClicked = () => {
        const scene = this.getActiveGameScene();
        if (!scene || typeof scene.exportScene !== 'function') {
            alert('シーンのエクスポートに失敗しました。');
            return;
        }
        const sceneData = scene.exportScene();
        const jsonString = JSON.stringify(sceneData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scene_${scene.scene.key}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    onLoadSceneFile = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                const scene = this.getActiveGameScene();
                if (scene && typeof scene.buildSceneFromLayout === 'function') {
                    if (confirm('現在のシーンをクリアしてロードしますか？')) {
                        if (typeof scene.clearScene === 'function') scene.clearScene();
                        scene.buildSceneFromLayout(json);
                        this.plugin.updateLayerStates(this.layers); // レイヤー状態更新
                        this.buildHierarchyPanel(); // ヒエラルキー更新
                        alert('シーンをロードしました。');
                    }
                }
            } catch (err) {
                console.error('Failed to load scene:', err);
                alert('シーンファイルの読み込みに失敗しました。');
            }
            event.target.value = ''; // リセット
        };
        reader.readAsText(file);
    }
    /**
 * Undo/Redoボタンの有効/無効を更新
 */
    updateUndoRedoButtons(canUndo, canRedo) {
        if (this.undoBtn) this.undoBtn.disabled = !canUndo;
        if (this.redoBtn) this.redoBtn.disabled = !canRedo;
    }

    updateMultiSelectButtonState() {
        if (this.multiSelectBtn) {
            if (this.plugin.isMultiSelectMode) {
                this.multiSelectBtn.classList.add('active');
                this.multiSelectBtn.style.backgroundColor = '#4caf50';
            } else {
                this.multiSelectBtn.classList.remove('active');
                this.multiSelectBtn.style.backgroundColor = '';
            }
        }
    }

    // =================================================================
    // Scene Save/Load with Asset Persistence
    // =================================================================
    
    /**
     * シーンとアセットをJSON形式で保存
     */
    onSaveSceneClicked = () => {
        const scene = this.getActiveGameScene();
        if (!scene) {
            alert('アクティブなシーンがありません');
            return;
        }

        const assetList = this.game.registry.get('asset_list') || [];
        const sceneData = this.exportSceneData(scene);

        const projectData = {
            version: '1.0',
            sceneName: scene.scene.key,
            assets: assetList,
            scene: sceneData
        };

        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${scene.scene.key}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('[EditorUI] Scene saved with assets');
    };

    /**
     * ゲームをビルドしてZIPとしてエクスポート
     */
    onExportGameClicked = async () => {
        const scene = this.getActiveGameScene();
        if (!scene) {
            alert('アクティブなシーンがありません');
            return;
        }

        if (!window.JSZip) {
            alert('JSZipライブラリが読み込まれていません。インターネット接続を確認してください。');
            return;
        }

        const zip = new JSZip();
        const assetList = this.game.registry.get('asset_list') || [];
        const sceneData = this.exportSceneData(scene);

        // 1. アセットの処理と追加
        const assetsFolder = zip.folder("assets");
        const processedAssets = [];

        for (const asset of assetList) {
            if (!asset.key) continue; // キーがないアセットはスキップ

            if (asset.url && asset.url.startsWith('data:')) {
                // DataURLをBlobに変換してZIPに追加
                try {
                    const response = await fetch(asset.url);
                    const blob = await response.blob();
                    
                    // 拡張子の推定
                    let extension = 'png';
                    if (asset.type === 'audio') extension = 'mp3'; // 簡易判定
                    if (asset.url.includes('image/jpeg')) extension = 'jpg';
                    
                    const fileName = `${asset.key}.${extension}`;
                    assetsFolder.file(fileName, blob);

                    // ランタイム用のパスに書き換え
                    processedAssets.push({
                        ...asset,
                        url: `assets/${fileName}`,
                        path: `assets/${fileName}`
                    });
                } catch (e) {
                    console.error(`Failed to process asset ${asset.key}:`, e);
                }
            } else if (asset.url) {
                // 既にパスの場合はそのまま（ただしローカルファイルは取得できない可能性あり）
                processedAssets.push(asset);
            } else {
                console.warn(`Skipping asset ${asset.key} due to missing URL`);
            }
        }

        // 2. ゲーム設定データの作成
        const gameConfig = {
            sceneName: scene.scene.key,
            assets: processedAssets,
            scene: sceneData
        };
        zip.file("game-config.js", `window.GAME_DATA = ${JSON.stringify(gameConfig, null, 2)};`);

        // 3. ランタイム用HTMLの作成
        const indexHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${scene.scene.key} - Game Build</title>
    <style>
        body { margin: 0; padding: 0; background: #111; overflow: hidden; color: #ccc; font-family: sans-serif; }
        canvas { display: block; margin: 0 auto; }
        #debug-log { position: absolute; top: 10px; left: 10px; pointer-events: none; white-space: pre-wrap; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
    <script src="game-config.js"></script>
</head>
<body>
    <div id="debug-log"></div>
    <script>
    function log(msg) {
        console.log(msg);
        // document.getElementById('debug-log').textContent += msg + '\\n';
    }

    class GameScene extends Phaser.Scene {
        constructor() {
            super({ key: 'GameScene' });
        }

        preload() {
            log('Preload started');
            const data = window.GAME_DATA;
            if (!data) {
                log('ERROR: GAME_DATA not found');
                return;
            }

            if (data.assets) {
                log('Loading ' + data.assets.length + ' assets');
                data.assets.forEach(asset => {
                    if (!asset.url) {
                        log('WARNING: Skipping asset ' + asset.key + ' (missing URL)');
                        return;
                    }
                    log('Loading asset: ' + asset.key + ' (' + asset.type + ')');
                    if (asset.type === 'image') {
                        this.load.image(asset.key, asset.url);
                    } else if (asset.type === 'spritesheet') {
                        this.load.image(asset.key, asset.url); 
                    } else if (asset.type === 'audio') {
                        this.load.audio(asset.key, asset.url);
                    }
                });
            }
            
            this.load.on('loaderror', (file) => {
                log('ERROR loading asset: ' + file.key);
            });
        }

        create() {
            log('Create started');
            const data = window.GAME_DATA;
            if (!data || !data.scene) {
                log('ERROR: Scene data missing');
                return;
            }

            log('Creating ' + data.scene.objects.length + ' objects');

            // オブジェクトの生成
            data.scene.objects.forEach(obj => {
                let gameObject;
                
                try {
                    if (obj.type === 'Sprite' || obj.type === 'Image') {
                        if (obj.texture) {
                            if (this.textures.exists(obj.texture)) {
                                gameObject = this.add.sprite(obj.x, obj.y, obj.texture);
                            } else {
                                log('WARNING: Texture missing: ' + obj.texture);
                                // プレースホルダー
                                gameObject = this.add.rectangle(obj.x, obj.y, 50, 50, 0xff0000);
                            }
                        }
                    } else if (obj.type === 'Text') {
                        gameObject = this.add.text(obj.x, obj.y, obj.text, obj.style);
                    }

                    if (gameObject) {
                        gameObject.setName(obj.name);
                        gameObject.setRotation(obj.rotation || 0);
                        gameObject.setScale(obj.scaleX || 1, obj.scaleY || 1);
                        gameObject.setAlpha(obj.alpha !== undefined ? obj.alpha : 1);
                        gameObject.setDepth(obj.depth || 0);
                        gameObject.setVisible(obj.visible !== undefined ? obj.visible : true);
                        
                        log('Created object: ' + obj.name);
                    }
                } catch (e) {
                    log('ERROR creating object ' + obj.name + ': ' + e.message);
                }
            });
        }
    }

    const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        backgroundColor: '#222222',
        scene: GameScene,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        }
    };

    try {
        new Phaser.Game(config);
        log('Game initialized');
    } catch (e) {
        log('CRITICAL ERROR: ' + e.message);
    }
    </script>
</body>
</html>`;
        zip.file("index.html", indexHtml);

        // 4. READMEの作成
        zip.file("README.txt", "To play the game, you must run it on a local web server (e.g. Live Server in VS Code) due to browser security restrictions on loading local files.");

        // 5. ZIPの生成とダウンロード
        zip.generateAsync({type:"blob"}).then(function(content) {
            saveAs(content, `${scene.scene.key}_build.zip`);
        });
    };

    /**
     * JSONからシーンとアセットを読み込み
     */
    onLoadSceneFile = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const projectData = JSON.parse(e.target.result);

                // アセットを復元
                if (projectData.assets && projectData.assets.length > 0) {
                    await this.restoreAssets(projectData.assets);
                }

                // シーンを復元
                const scene = this.getActiveGameScene();
                if (scene && typeof scene.buildSceneFromLayout === 'function') {
                    if (confirm('現在のシーンをクリアしてロードしますか？')) {
                        if (typeof scene.clearScene === 'function') scene.clearScene();
                        scene.buildSceneFromLayout(projectData.scene);
                        this.plugin.updateLayerStates(this.layers);
                        this.buildHierarchyPanel();
                        alert('プロジェクトをロードしました');
                    }
                }
            } catch (err) {
                console.error('Load failed:', err);
                alert('ファイルの読み込みに失敗しました');
            }
            event.target.value = '';
        };
        reader.readAsText(file);
    };

    /**
     * シーンデータをエクスポート
     */
    exportSceneData(scene) {
        const sceneData = {
            name: scene.scene.key,
            objects: []
        };

        const editableObjects = this.plugin.editableObjects.get(scene.scene.key);
        if (!editableObjects) return sceneData;

        editableObjects.forEach(obj => {
            const objData = {
                name: obj.name,
                type: obj.type,
                x: obj.x,
                y: obj.y,
                rotation: obj.rotation,
                scaleX: obj.scaleX,
                scaleY: obj.scaleY,
                alpha: obj.alpha,
                visible: obj.visible,
                depth: obj.depth,
                layer: obj.getData('layer'),
                group: obj.getData('group')
            };

            if (obj.texture && obj.texture.key !== '__MISSING') {
                objData.texture = obj.texture.key;
                if (obj.frame) objData.frame = obj.frame.name;
            }

            if (obj.type === 'Text') {
                objData.text = obj.text;
                objData.style = obj.style;
            }

            const components = obj.getData('components');
            if (components) objData.components = components;

            const customData = obj.getData('customData');
            if (customData) objData.customData = customData;

            sceneData.objects.push(objData);
        });

        return sceneData;
    }

    /**
     * 保存されたアセットデータを復元
     */
    async restoreAssets(assetDataArray) {
        const assetList = this.game.registry.get('asset_list') || [];

        for (const assetData of assetDataArray) {
            if (assetList.find(a => a.key === assetData.key)) {
                console.log(`Asset '${assetData.key}' already exists, skipping`);
                continue;
            }

            if (assetData.type === 'image' || assetData.type === 'spritesheet') {
                this.game.textures.addBase64(assetData.key, assetData.url);
            } else if (assetData.type === 'audio') {
                console.warn('Audio asset restoration not yet implemented');
            }

            assetList.push(assetData);
        }

        this.game.registry.set('asset_list', assetList);
        this.populateAssetBrowser();

        console.log(`[EditorUI] Restored ${assetDataArray.length} assets`);
    }
}
