import { Layout } from '../../core/Layout.js';

/**
 * [chara_show] タグ - キャラクターの表示
 * 
 * 指定されたキャラクターを画面に登場させます。
 * 表情、位置、フェードイン時間を指定できます。
 * 
 * @param {ScenarioManager} manager - ScenarioManagerのインスタンス
 * @param {object} params - タグのパラメータ
 * @param {string} params.name - キャラクター管理名 (必須)
 * @param {string} [params.face='normal'] - 表情
 * @param {string} [params.pos='center'] - 'left', 'center', 'right'などの定義済み位置
 * @param {number} [params.x] - X座標 (posより優先)
 * @param {number} [params.y] - Y座標 (posより優先)
 * @param {number} [params.time=0] - フェードイン時間(ms)
 */
export default async function handleCharaShow(manager, params) {
    const { name, face = 'normal', pos = 'center', x: paramX, y: paramY, time = 0 } = params;
    const scene = manager.scene;

    // --- 1. パラメータと定義の検証 ---
    if (!name) {
        console.warn('[chara_show] name属性は必須です。');
        return;
    }

    const def = manager.characterDefs[name];
    if (!def) {
        console.warn(`[chara_show] キャラクター[${name}]の定義が見つかりません。`);
        return;
    }

    const storage = def.face[face];
    if (!storage) {
        console.warn(`[chara_show] キャラクター[${name}]の表情[${face}]のstorageが見つかりません。`);
        return;
    }
    
    // --- 2. 座標の決定 ---
    const orientation = scene.scale.isPortrait ? 'portrait' : 'landscape';
    const layoutPos = Layout[orientation]?.character?.[pos] || Layout[orientation]?.character?.center;
    
    let x = paramX !== undefined ? Number(paramX) : layoutPos.x;
    let y = paramY !== undefined ? Number(paramY) : layoutPos.y;

    // --- 3. キャラクターオブジェクトの生成 ---
    // 既存のキャラクターがいれば破棄
    if (scene.characters[name]) {
        scene.characters[name].destroy();
    }

    const chara = scene.add.image(x, y, storage);
    chara.setAlpha(0);
    chara.name = name; // エディタや検索のための名前
    
    manager.layers.character.add(chara);
    scene.characters[name] = chara;

    // --- 4. エディタへの登録 ---
    const editorPlugin = scene.plugins.get('EditorPlugin');
    if (editorPlugin && editorPlugin.isEnabled) {
        editorPlugin.makeEditable(chara, scene);
    }

    // --- 5. アニメーション（フェードイン） ---
    const duration = Number(time);
    if (duration > 0) {
        // TweenをPromise化し、完了を待つ
        await new Promise(resolve => {
            scene.tweens.add({
                targets: chara,
                alpha: 1,
                duration: duration,
                ease: 'Linear',
                onComplete: () => resolve() // アニメーション完了でPromiseを解決
            });
        });
    } else {
        // 即時表示
        chara.setAlpha(1);
    }
    
    // async関数なので、処理が終われば自動的に完了したPromiseが返る
}