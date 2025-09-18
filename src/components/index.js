// src/components/index.js

// --- 1. 存在する全てのコンポーネントクラスをインポートします ---
import PlayerController from './PlayerController.js';
import Scrollable from './Scrollable.js';
import Interactor from './Interactor.js';
import FlashEffect from './FlashEffect.js';


//UI系
import WatchVariableComponent from '../ui/WatchVariableComponent.js';
import BarDisplayComponent from '../ui/BarDisplayComponent.js';
import TextDisplayComponent from '../ui/TextDisplayComponent.js';
// (将来、新しいコンポーネントを追加したら、ここにもimport文を追加します)


// --- 2. インポートしたクラスを、キーと値が同じオブジェクトにまとめます ---
// これが、エンジン全体で共有される「コンポーネントの名簿」になります。
export const ComponentRegistry = {
    PlayerController,
    Scrollable,
    Interactor,
FlashEffect,



    //UI系
    WatchVariableComponent,
    BarDisplayComponent,
    TextDisplayComponent
    // (新しいコンポーネントを追加したら、ここにも名前を追加します)
};