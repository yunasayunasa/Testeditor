// src/handlers/events/index.js

import { handleTween } from './tween.js';
import { handleDestroy } from './destroy.js';
import { handleSetVisible } from './set_visible.js';

// ActionInterpreterが使う、イベントタグのカタログ
export const eventTagHandlers = {
    'tween': handleTween,
    'destroy': handleDestroy,
    'set_visible': handleSetVisible,
    // 将来、ここに [eval] [body_velocity] などを追加していく
};