// src/handlers/scenario/chara_show.js (デバッグモード・最終版)
import { Layout } from '../../core/Layout.js';

export default async function handleCharaShow(manager, params) {
    console.log("--- [chara_show] デバッグモード開始 ---", params);

    const { name, face = 'normal', pos = 'center', x: paramX, y: paramY, time = 0 } = params;
    let storage = params.storage;
    const scene = manager.scene;

    if (!name) {
        console.warn('[chara_show] name属性は必須です。');
        return;
    }

    if (!storage) {
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
    }
    
    const orientation = scene.scale.isPortrait ? 'portrait' : 'landscape';
    const layoutPos = Layout[orientation]?.character?.[pos] || Layout[orientation]?.character?.center;
    let x = paramX !== undefined ? Number(paramX) : layoutPos.x;
    let y = paramY !== undefined ? Number(paramY) : layoutPos.y;

    if (scene.characters[name]) {
        scene.characters[name].destroy();
    }

    const chara = scene.add.image(x, y, storage);
    chara.name = name;
    
    // ★★★ 生成直後に強制的に表示状態にする ★★★
    chara.setAlpha(1);
    chara.setVisible(true);

    manager.layers.character.add(chara);
    scene.characters[name] = chara;

    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★★★ ここが最も重要です ★★★
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    console.log("--- キャラクター生成完了、最終ステータス ---");
    console.log(`ゲーム画面サイズ: 幅=${scene.scale.width}, 高さ=${scene.scale.height}`);
    console.log("親レイヤー(character):", manager.layers.character);
    console.log("  - レイヤーの表示状態:", manager.layers.character.visible);
    console.log("生成されたキャラクターオブジェクト:", chara);
    console.log(`  - 最終座標: x=${chara.x}, y=${chara.y}`);
    console.log(`  - 最終アルファ (透明度): ${chara.alpha}`);
    console.log(`  - 最終表示状態: ${chara.visible}`);
    console.log(`  - 所属レイヤーのオブジェクト数: ${manager.layers.character.length}`);
    console.log("-----------------------------------------");
    
    // アニメーションは一時的に無効化し、問題の切り分けを優先
}
