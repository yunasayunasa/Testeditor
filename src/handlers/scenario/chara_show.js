import { Layout } from '../../core/Layout.js';

/**
 * [chara_show] タグ - キャラクターの表示
 * 
 * 指定されたキャラクターを画面に登場させます。
 * storageが省略された場合、nameとfaceから画像キーを自動解決します。
 * (例: name="yuna", face="smile" -> 画像キー "yuna_smile")
 * 
 * @param {ScenarioManager} manager - ScenarioManagerのインスタンス
 * @param {object} params - タグのパラメータ
 * @param {string} params.name - キャラクター管理名 (必須)
 * @param {string} [params.storage] - 画像アセットキー (省略可能)
 * @param {string} [params.face='normal'] - 表情 (storageがない場合にキー解決に使用)
 * @param {string} [params.pos='center'] - 'left', 'center', 'right'などの定義済み位置
 * @param {number} [params.x] - X座標 (posより優先)
 * @param {number} [params.y] - Y座標 (posより優先)
 * @param {number} [params.time=0] - フェードイン時間(ms)
 */
export default async function handleCharaShow(manager, params) {
    const { name, face = 'normal', pos = 'center', x: paramX, y: paramY, time = 0 } = params;
    let storage = params.storage; // storageは可変なのでletで宣言
    const scene = manager.scene;

    // --- 1. パラメータ(name)の検証 ---
    if (!name) {
        console.warn('[chara_show] name属性は必須です。');
        return;
    }

    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★★★ ここが新しい「画像キー自動解決」ロジックです ★★★
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

    // --- 2. 表示する画像(storage)を決定 ---
    if (!storage) {
        // storageの指定がない場合、charaDefsから画像キーを探す
        const def = manager.characterDefs[name];
        if (!def) {
            console.warn(`[chara_show] キャラクター[${name}]の定義が見つかりません。`);
            return;
        }
        storage = def.face[face];
        if (!storage) {
            console.warn(`[chara_show] キャラクター[${name}]の表情[${face}]に対応するstorageが見つかりません。`);
            return;
        }
        console.log(`[chara_show] storageが省略されたため、キーを自動解決しました: ${storage}`);
    }
    
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

    // --- 3. 座標の決定 ---
    const orientation = scene.scale.isPortrait ? 'portrait' : 'landscape';
    const layoutPos = Layout[orientation]?.character?.[pos] || Layout[orientation]?.character?.center;
    
    let x = paramX !== undefined ? Number(paramX) : layoutPos.x;
    let y = paramY !== undefined ? Number(paramY) : layoutPos.y;

    // --- 4. キャラクターオブジェクトの生成 ---
    if (scene.characters[name]) {
        scene.characters[name].destroy();
    }

    const chara = scene.add.image(x, y, storage);
    chara.setAlpha(0);
    chara.name = name;
    
    manager.layers.character.add(chara);
    scene.characters[name] = chara;

    // --- 5. エディタへの登録 ---
    const editorPlugin = scene.plugins.get('EditorPlugin');
    if (editorPlugin && editorPlugin.isEnabled) {
        editorPlugin.makeEditable(chara, scene);
    }

    // --- 6. アニメーション（フェードイン） ---
    const duration = Number(time);
    if (duration > 0) {
        await new Promise(resolve => {
            scene.tweens.add({
                targets: chara,
                alpha: 1,
                duration: duration,
                ease: 'Linear',
                onComplete: () => resolve()
            });
        });
    } else {
        chara.setAlpha(1);
    }
}
