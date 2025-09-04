// src/ui/index.js (新規作成)

import CoinHud from './CoinHud.js';
import HpBar from './HpBar.js';
//import VirtualStick from './VirtualStick.js';
// import JumpButton from './JumpButton.js'; // 将来の追加

// このカタログに登録するだけで、UISceneが新しいUIを自動で認識できるようになる
export const CUSTOM_UI_MAP = {
    'CoinHud': CoinHud,
    'HpBar': HpBar,
   // 'VirtualStick': VirtualStick,
    // 'JumpButton': JumpButton,
};