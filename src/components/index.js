// src/components/index.js

// --- 1. 存在する全てのコンポーネントクラスをインポートします ---
import PlayerController from './PlayerController.js';
import Scrollable from './Scrollable.js';
import Interactor from './Interactor.js';
import FlashEffect from './FlashEffect.js';
import StateMachineComponent from './StateMachineComponent.js'; 
import NpcController from './NpcController.js';
import WanderComponent from './WanderComponent.js'; 
import TextDisplayComponent from '../ui/TextDisplayComponent.js';
import EvidenceBinderComponent from '../ui/EvidenceBinderComponent.js';
import EvidenceDetailViewerComponent from '../ui/EvidenceDetailViewerComponent.js';
import VisibilityComponent from '../ui/VisibilityComponent.js';
import DynamicListComponent from '../ui/DynamicListComponent.js';
// (将来、新しいコンポーネントを追加したら、ここにもimport文を追加します)


// --- 2. インポートしたクラスを、キーと値が同じオブジェクトにまとめます ---
// これが、エンジン全体で共有される「コンポーネントの名簿」になります。
export const ComponentRegistry = {
    PlayerController,
    Scrollable,
    Interactor,
FlashEffect,
StateMachineComponent,
NpcController,
WanderComponent,
    EvidenceBinderComponent,
    EvidenceDetailViewerComponent,
    VisibilityComponent,
    DynamicListComponent
    // (新しいコンポーネントを追加したら、ここにも名前を追加します)
};